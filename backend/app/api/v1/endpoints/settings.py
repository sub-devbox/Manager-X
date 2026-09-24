import json
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, text

from app.core.config import settings, DB_PATH, DATA_DIR
from app.core.database import get_db, engine
from app.api.v1.endpoints.auth import get_current_user, get_optional_user
from app.models.user_models import User
from app.models.settings_models import SystemSetting, Currency
from app.schemas.settings_schemas import (
    CompanyProfile,
    ThemeSettings,
    CurrencyCreate,
    CurrencyUpdate,
    CurrencyOut,
    BackupInfo,
    MessageResponse,
)

router = APIRouter(prefix="/settings", tags=["Settings"])
BACKUP_DIR = DATA_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# COMPANY PROFILE
# -------------------------------------------------------------

@router.get("/company", response_model=CompanyProfile)
async def get_company_profile(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    stmt = select(SystemSetting).where(SystemSetting.key == "company_profile")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()
    if not setting:
        return CompanyProfile()
    try:
        return CompanyProfile(**json.loads(setting.value))
    except Exception:
        return CompanyProfile()

@router.put("/company", response_model=CompanyProfile)
async def update_company_profile(
    profile: CompanyProfile,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    stmt = select(SystemSetting).where(SystemSetting.key == "company_profile")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()

    json_str = profile.model_dump_json()
    if setting:
        setting.value = json_str
    else:
        setting = SystemSetting(
            key="company_profile",
            value=json_str,
            category="company",
        )
        db.add(setting)

    await db.commit()
    return profile

# -------------------------------------------------------------
# THEME & ACCENT COLOR
# -------------------------------------------------------------

@router.get("/theme", response_model=ThemeSettings)
async def get_theme_settings(
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SystemSetting).where(SystemSetting.key == "theme_settings")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()
    if not setting:
        return ThemeSettings()
    try:
        return ThemeSettings(**json.loads(setting.value))
    except Exception:
        return ThemeSettings()

@router.put("/theme", response_model=ThemeSettings)
async def update_theme_settings(
    theme: ThemeSettings,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    stmt = select(SystemSetting).where(SystemSetting.key == "theme_settings")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()

    json_str = theme.model_dump_json()
    if setting:
        setting.value = json_str
    else:
        setting = SystemSetting(
            key="theme_settings",
            value=json_str,
            category="theme",
        )
        db.add(setting)

    await db.commit()
    return theme

# -------------------------------------------------------------
# CURRENCIES
# -------------------------------------------------------------

async def ensure_default_currencies(db: AsyncSession):
    """Seed standard currencies if none exist."""
    count_stmt = select(Currency)
    res = await db.execute(count_stmt)
    if res.first() is None:
        defaults = [
            Currency(code="INR", symbol="₹", name="Indian Rupee", is_base_currency=True),
            Currency(code="USD", symbol="$", name="US Dollar", is_base_currency=False),
            Currency(code="EUR", symbol="€", name="Euro", is_base_currency=False),
            Currency(code="GBP", symbol="£", name="British Pound", is_base_currency=False),
        ]
        db.add_all(defaults)
        await db.commit()

@router.get("/currencies", response_model=List[CurrencyOut])
async def list_currencies(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    await ensure_default_currencies(db)
    stmt = select(Currency).order_by(Currency.is_base_currency.desc(), Currency.code.asc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/currencies", response_model=CurrencyOut, status_code=status.HTTP_201_CREATED)
async def create_currency(
    payload: CurrencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    existing = await db.get(Currency, payload.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Currency '{payload.code}' already exists.",
        )

    # If this is designated base, unset previous base
    if payload.is_base_currency:
        await db.execute(update(Currency).values(is_base_currency=False))

    currency = Currency(**payload.model_dump())
    db.add(currency)
    await db.commit()
    await db.refresh(currency)
    return currency

@router.put("/currencies/{code}", response_model=CurrencyOut)
async def update_currency(
    code: str,
    payload: CurrencyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    currency = await db.get(Currency, code.upper())
    if not currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Currency '{code}' not found.",
        )

    data = payload.model_dump(exclude_unset=True)
    if data.get("is_base_currency"):
        await db.execute(update(Currency).values(is_base_currency=False))

    for k, v in data.items():
        setattr(currency, k, v)

    await db.commit()
    await db.refresh(currency)
    return currency

@router.delete("/currencies/{code}", response_model=MessageResponse)
async def delete_currency(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    currency = await db.get(Currency, code.upper())
    if not currency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Currency not found.")
    if currency.is_base_currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the base currency. Please reassign the base currency first.",
        )

    # Referential integrity check: cannot delete if already used in clients, invoices, accounts, etc.
    for table_name in ["clients", "invoices", "accounts"]:
        table_exists = await db.execute(
            text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
        )
        if table_exists.scalar():
            count_res = await db.execute(
                text(f"SELECT COUNT(*) FROM {table_name} WHERE currency_code = :code"),
                {"code": code.upper()}
            )
            if (count_res.scalar() or 0) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot delete currency '{code}': it is already in use by {table_name}.",
                )

    await db.delete(currency)
    await db.commit()
    return MessageResponse(message=f"Currency '{code}' removed successfully.")

# -------------------------------------------------------------
# DATABASE BACKUP & RESTORE
# -------------------------------------------------------------

def _format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / (1024 * 1024):.2f} MB"

@router.get("/backup/list", response_model=List[BackupInfo])
async def list_backups(
    current_user: Optional[User] = Depends(get_optional_user),
):
    backups = []
    if BACKUP_DIR.exists():
        for file in sorted(BACKUP_DIR.glob("*.db"), key=os.path.getmtime, reverse=True):
            stat = file.stat()
            created_str = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            backups.append(
                BackupInfo(
                    filename=file.name,
                    size_bytes=stat.st_size,
                    size_display=_format_size(stat.st_size),
                    created_at=created_str,
                )
            )
    return backups

@router.post("/backup/create", response_model=BackupInfo)
async def create_backup_snapshot(
    current_user: Optional[User] = Depends(get_optional_user),
):
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"manager_x_backup_{timestamp}.db"

    # Use SQLite Online Backup API for safe snapshotting
    try:
        src = sqlite3.connect(str(DB_PATH))
        dst = sqlite3.connect(str(backup_file))
        src.backup(dst)
        dst.close()
        src.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database backup failed: {str(e)}")

    stat = backup_file.stat()
    return BackupInfo(
        filename=backup_file.name,
        size_bytes=stat.st_size,
        size_display=_format_size(stat.st_size),
        created_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
    )

@router.get("/backup/download")
async def download_database(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Download a live, WAL-consistent copy of the SQLite database."""
    temp_download = DATA_DIR / "temp_download.db"
    try:
        src = sqlite3.connect(str(DB_PATH))
        dst = sqlite3.connect(str(temp_download))
        src.backup(dst)
        dst.close()
        src.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate download: {str(e)}")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return FileResponse(
        path=str(temp_download),
        filename=f"manager_x_backup_{timestamp}.db",
        media_type="application/octet-stream",
    )

@router.post("/backup/restore", response_model=MessageResponse)
async def restore_database(
    filename: Optional[str] = None,
    file: Optional[UploadFile] = File(None),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Restore database from an existing snapshot or an uploaded .db file."""
    restore_source: Optional[Path] = None

    if file:
        content = await file.read()
        if not content.startswith(b"SQLite format 3\x00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Uploaded file is not a valid SQLite database.",
            )
        restore_source = DATA_DIR / "temp_restore_upload.db"
        with open(restore_source, "wb") as f:
            f.write(content)
    elif filename:
        candidate = BACKUP_DIR / filename
        if not candidate.exists() or not candidate.is_file():
            raise HTTPException(status_code=404, detail="Selected backup file not found.")
        restore_source = candidate
    else:
        raise HTTPException(status_code=400, detail="Either filename or upload file must be provided.")

    # 1. Take safety snapshot of current DB before replacement
    safety_ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_prerestore")
    safety_backup = BACKUP_DIR / f"manager_x_safety_{safety_ts}.db"
    try:
        src = sqlite3.connect(str(DB_PATH))
        dst = sqlite3.connect(str(safety_backup))
        src.backup(dst)
        dst.close()
        src.close()
    except Exception:
        pass

    # 2. Dispose engine connection pool
    await engine.dispose()

    # 3. Clean wal & shm files
    wal_path = DB_PATH.with_name(DB_PATH.name + "-wal")
    shm_path = DB_PATH.with_name(DB_PATH.name + "-shm")
    if wal_path.exists():
        wal_path.unlink()
    if shm_path.exists():
        shm_path.unlink()

    # 4. Copy restore source over DB_PATH
    shutil.copy2(restore_source, DB_PATH)

    # Clean temporary upload file
    if file and restore_source.exists():
        restore_source.unlink()

    return MessageResponse(
        message="Database restored successfully. Pre-restore safety backup was saved.",
        detail=safety_backup.name,
    )
