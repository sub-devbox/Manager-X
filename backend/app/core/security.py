import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Tuple
import jwt
from passlib.context import CryptContext

from app.core.config import settings

# CryptContext configured with argon2 priority and bcrypt fallback
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=4,
)

# Dummy hash for timing attack mitigation when user does not exist
DUMMY_HASH = pwd_context.hash("dummy_timing_mitigation_password_123!")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify password against hash using constant-time evaluation."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def dummy_verify(plain_password: str) -> bool:
    """Run dummy verification to prevent timing attack enumeration."""
    try:
        pwd_context.verify(plain_password, DUMMY_HASH)
    except Exception:
        pass
    return False

def get_password_hash(password: str) -> str:
    """Hash password using Argon2id / bcrypt."""
    return pwd_context.hash(password)

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Senior software engineer password complexity check:
    - Minimum 8 characters
    - At least 1 lowercase letter
    - At least 1 uppercase letter
    - At least 1 digit
    - At least 1 special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\/]", password):
        return False, "Password must contain at least one special character."
    return True, ""

def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> Tuple[str, str, datetime]:
    """
    Generates a cryptographically signed JWT.
    Returns: (token_str, jti, expire_datetime)
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    jti = str(uuid.uuid4())
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": jti,
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt, jti, expire

def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decodes and cryptographically verifies JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub", "jti"]}
        )
        return payload
    except (jwt.PyJWTError, Exception):
        return None
