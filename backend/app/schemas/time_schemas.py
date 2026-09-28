from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict, field_validator

class TimeEntryBase(BaseModel):
    task_id: str = Field(..., min_length=1, max_length=32)
    description: str | None = None
    start_time: datetime
    end_time: datetime | None = None
    duration_seconds: int = Field(default=0, ge=0)
    is_billable: bool = True
    hourly_rate: float | None = Field(default=None, ge=0.0)

class TimeEntryCreate(TimeEntryBase):
    project_id: str | None = Field(default=None, max_length=32)

class TimeEntryUpdate(BaseModel):
    task_id: str | None = Field(default=None, min_length=1, max_length=32)
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    is_billable: bool | None = None
    hourly_rate: float | None = Field(default=None, ge=0.0)
    invoiced: bool | None = None

class TimeEntryResponse(TimeEntryBase):
    id: str
    project_id: str
    task_title: str | None = None
    project_name: str | None = None
    client_name: str | None = None
    client_id: str | None = None
    currency_code: str | None = "USD"
    invoiced: bool = False
    billable_amount: float = 0.0
    invoice_id: str | None = None
    invoice_number: str | None = None
    invoice_status: str | None = None  # "due", "draft", "sent", "paid", "overdue", "void", "non_billable"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("start_time", "end_time", "created_at", "updated_at", mode="after")
    @classmethod
    def ensure_utc(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)
