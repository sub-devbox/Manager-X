from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Float, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.cuid import generate_cuid

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: generate_cuid("prj_"),
    )
    client_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("clients.id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    billing_type: Mapped[str] = mapped_column(
        String(20),
        default="hourly",
        nullable=False,
    )  # 'hourly', 'fixed', 'internal'
    hourly_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    budget_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        nullable=False,
    )  # 'active', 'completed', 'on_hold', 'archived'
    start_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    client = relationship("Client", back_populates="projects", lazy="selectin")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan", lazy="selectin")
    time_entries = relationship("TimeEntry", back_populates="project", cascade="all, delete-orphan", lazy="selectin")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: generate_cuid("tsk_"),
    )
    project_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("projects.id"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        default="backlog",
        nullable=False,
    )  # 'backlog', 'in_progress', 'review', 'done'
    priority: Mapped[str] = mapped_column(
        String(20),
        default="medium",
        nullable=False,
    )  # 'low', 'medium', 'high', 'urgent'
    estimated_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    due_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    checklist: Mapped[list[dict] | None] = mapped_column(JSON, default=list, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project = relationship("Project", back_populates="tasks", lazy="selectin")
    time_entries = relationship("TimeEntry", back_populates="task", lazy="selectin")


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: generate_cuid("tim_"),
    )
    task_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("tasks.id"),
        nullable=False,
    )
    project_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("projects.id"),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_billable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    hourly_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    invoiced: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invoice_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    task = relationship("Task", back_populates="time_entries", lazy="selectin")
    project = relationship("Project", back_populates="time_entries", lazy="selectin")
    invoice = relationship("Invoice", lazy="selectin")

