from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Float, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.cuid import generate_cuid

class PaymentGateway(Base):
    __tablename__ = "payment_gateways"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: generate_cuid("gw_"),
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    currency_code: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    total_incoming_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_equivalent_inr: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    average_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gateway_note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
