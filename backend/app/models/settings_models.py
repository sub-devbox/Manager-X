from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Float, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="general")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

class Currency(Base):
    __tablename__ = "currencies"

    code: Mapped[str] = mapped_column(String(10), primary_key=True)  # e.g., 'INR', 'USD'
    symbol: Mapped[str] = mapped_column(String(10), nullable=False)   # e.g., '₹', '$'
    name: Mapped[str] = mapped_column(String(100), nullable=False)    # e.g., 'Indian Rupee'
    is_base_currency: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
