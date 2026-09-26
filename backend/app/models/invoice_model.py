from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.cuid import generate_cuid

class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: generate_cuid("inv_"),
    )
    invoice_number: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    client_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("clients.id"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="draft",
        nullable=False,
    )  # 'draft', 'sent', 'paid', 'overdue', 'void'
    issue_date: Mapped[str] = mapped_column(String(20), nullable=False)
    due_date: Mapped[str] = mapped_column(String(20), nullable=False)
    payment_gateway: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    payment_gateway_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("payment_gateways.id", ondelete="SET NULL"),
        nullable=True,
    )

    subtotal: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discount_type: Mapped[str] = mapped_column(String(10), default="fixed", nullable=False)  # 'fixed', 'percentage'
    discount_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    round_off: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    final_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)

    gateway_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    received_amount_inr: Mapped[float | None] = mapped_column(Float, nullable=True)
    payment_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_reconciled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bank_transaction_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    client = relationship("Client", lazy="selectin")
    items = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="InvoiceItem.sort_order",
    )

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: generate_cuid("ini_"),
    )
    invoice_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
    )
    task_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    hsn_sac: Mapped[str | None] = mapped_column(String(50), nullable=True, default="")
    price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # Unit price or rate
    quantity: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sort_order: Mapped[int] = mapped_column(default=0)

    invoice = relationship("Invoice", back_populates="items")
