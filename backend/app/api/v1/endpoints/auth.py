from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password,
    dummy_verify,
    get_password_hash,
    create_access_token,
    decode_access_token,
    validate_password_strength,
)
from app.models.user_models import User, UserSession, AuditLog
from app.schemas.auth_schemas import (
    UserRegister,
    UserLogin,
    UserOut,
    TokenResponse,
    AuthStatusOut,
    MessageResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_client_ip(request: Request) -> str:
    """Extract client IP address safely considering forward headers."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract and validate authenticated user from either HttpOnly cookie or Authorization Bearer header.
    Validates token signature, expiration, and database session revocation status.
    """
    token = None
    # 1. Check Bearer Authorization Header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # 2. Check HttpOnly Cookie fallback
    if not token:
        token = request.cookies.get(settings.AUTH_COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    jti: str = payload.get("jti")
    if not user_id or not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims.",
        )

    # Verify session is not revoked in database
    session_stmt = select(UserSession).where(
        UserSession.token_jti == jti,
        UserSession.is_revoked == False,
    )
    session_res = await db.execute(session_stmt)
    active_session = session_res.scalar_one_or_none()
    if not active_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or signed out.",
        )

    # Fetch user
    user_stmt = select(User).where(User.id == user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
        )

    return user


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Extract authenticated user if credentials exist, otherwise return None without throwing."""
    try:
        return await get_current_user(request, db)
    except HTTPException:
        return None


@router.get("/status", response_model=AuthStatusOut)
async def check_auth_status(db: AsyncSession = Depends(get_db)):
    """
    Returns initial setup state: if 0 users exist, allow initial administrator registration.
    """
    res = await db.execute(select(func.count(User.id)))
    count = res.scalar() or 0
    return AuthStatusOut(
        initialized=count > 0,
        allow_registration=count == 0, # Only allow public registration for first admin bootstrap
        user_count=count,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_first_user(
    user_in: UserRegister,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Initial bootstrap registration for the owner/administrator.
    Enforces strict password complexity rules.
    """
    # Check if users already exist
    count_res = await db.execute(select(func.count(User.id)))
    total_users = count_res.scalar() or 0
    if total_users > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System is already initialized. New users can only be created by an active administrator.",
        )

    # Validate password complexity
    valid_pwd, reason = validate_password_strength(user_in.password)
    if not valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=reason,
        )

    ip = get_client_ip(request)
    ua = request.headers.get("user-agent", "unknown")

    new_user = User(
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        is_active=True,
        is_superuser=True, # First user is superuser
    )
    db.add(new_user)
    await db.flush()

    audit = AuditLog(
        user_id=new_user.id,
        event_type="REGISTER_ADMIN_INITIAL",
        ip_address=ip,
        user_agent=ua,
        details="Initial system administrator account created.",
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Production-grade login handler:
    1. Brute-force / account lockout defense
    2. Timing attack mitigation
    3. User session auditing
    4. Issues cryptographically signed JWT and HttpOnly cookie
    """
    ip = get_client_ip(request)
    ua = request.headers.get("user-agent", "unknown")
    email = credentials.email.lower().strip()
    now_utc = datetime.now(timezone.utc)

    # Fetch user
    user_stmt = select(User).where(User.email == email)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    # 1. Mitigation against timing attack enumeration
    if not user:
        dummy_verify(credentials.password)
        db.add(AuditLog(
            user_id=None,
            event_type="LOGIN_FAILED_UNKNOWN_EMAIL",
            ip_address=ip,
            user_agent=ua,
            details=f"Attempted email: {email}",
        ))
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # 2. Check Account Lockout
    if user.locked_until:
        # SQLite can return naive datetime; ensure comparison is timezone-aware
        locked_time = user.locked_until
        if locked_time.tzinfo is None:
            locked_time = locked_time.replace(tzinfo=timezone.utc)

        if locked_time > now_utc:
            remaining_seconds = int((locked_time - now_utc).total_seconds())
            remaining_minutes = max(1, remaining_seconds // 60)
            db.add(AuditLog(
                user_id=user.id,
                event_type="LOGIN_BLOCKED_LOCKED_ACCOUNT",
                ip_address=ip,
                user_agent=ua,
                details=f"Account locked. Remaining seconds: {remaining_seconds}",
            ))
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account temporarily locked due to multiple failed login attempts. Please try again in {remaining_minutes} minute(s).",
            )
        else:
            # Lockout period expired; reset lockout
            user.locked_until = None
            user.failed_login_attempts = 0

    # 3. Constant-time password verification
    if not verify_password(credentials.password, user.hashed_password):
        user.failed_login_attempts += 1
        log_event = "LOGIN_FAILED"
        log_detail = f"Failed attempt #{user.failed_login_attempts}"

        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = now_utc + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
            log_event = "ACCOUNT_LOCKED"
            log_detail = f"Locked until {user.locked_until.isoformat()}"

        db.add(AuditLog(
            user_id=user.id,
            event_type=log_event,
            ip_address=ip,
            user_agent=ua,
            details=log_detail,
        ))
        await db.commit()

        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Too many failed login attempts. Account locked for {settings.LOCKOUT_DURATION_MINUTES} minutes.",
            )

        attempts_left = max(0, settings.MAX_LOGIN_ATTEMPTS - user.failed_login_attempts)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid email or password. {attempts_left} attempt(s) remaining before temporary lockout.",
        )

    # 4. Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact support.",
        )

    # 5. Success: reset failure counters
    user.failed_login_attempts = 0
    user.locked_until = None

    # 6. Generate JWT and track Session
    token_str, jti, expire_time = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email, "is_superuser": user.is_superuser},
    )

    session_entry = UserSession(
        user_id=user.id,
        token_jti=jti,
        ip_address=ip,
        user_agent=ua,
        expires_at=expire_time,
        is_revoked=False,
    )
    db.add(session_entry)

    audit_success = AuditLog(
        user_id=user.id,
        event_type="LOGIN_SUCCESS",
        ip_address=ip,
        user_agent=ua,
        details="User authenticated successfully.",
    )
    db.add(audit_success)
    await db.commit()
    await db.refresh(user)

    # 7. Set Secure HttpOnly cookie
    max_age_seconds = int(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token_str,
        max_age=max_age_seconds,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )

    return TokenResponse(
        access_token=token_str,
        token_type="bearer",
        expires_in_seconds=max_age_seconds,
        user=user,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes the current JWT session in the database and clears the HttpOnly cookie.
    """
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    if not token:
        token = request.cookies.get(settings.AUTH_COOKIE_NAME)

    if token:
        payload = decode_access_token(token)
        if payload and "jti" in payload:
            jti = payload["jti"]
            stmt = select(UserSession).where(UserSession.token_jti == jti)
            res = await db.execute(stmt)
            active_session = res.scalar_one_or_none()
            if active_session:
                active_session.is_revoked = True

    # Audit logout
    db.add(AuditLog(
        user_id=current_user.id,
        event_type="LOGOUT",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent", "unknown"),
        details="Session revoked.",
    ))
    await db.commit()

    # Clear cookie
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path="/",
        httponly=settings.COOKIE_HTTPONLY,
        samesite=settings.COOKIE_SAMESITE,
    )

    return MessageResponse(message="Successfully logged out.", success=True)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's profile.
    """
    return current_user
