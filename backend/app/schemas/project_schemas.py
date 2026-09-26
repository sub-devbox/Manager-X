from datetime import datetime
from typing import Literal, List
from pydantic import BaseModel, Field, ConfigDict, field_validator

# ==========================================
# Task Schemas
# ==========================================

TaskStatus = Literal["backlog", "in_progress", "review", "done"]
TaskPriority = Literal["low", "medium", "high", "urgent"]

class ChecklistItem(BaseModel):
    id: str
    text: str
    completed: bool = False

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus = "backlog"
    priority: TaskPriority = "medium"
    estimated_hours: float = Field(default=0.0, ge=0.0)
    due_date: str | None = None
    checklist: List[ChecklistItem] = Field(default_factory=list)

    @field_validator("checklist", mode="before")
    @classmethod
    def ensure_checklist(cls, v):
        if v is None:
            return []
        return v

class TaskCreate(TaskBase):
    project_id: str = Field(..., min_length=1, max_length=32)

class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    estimated_hours: float | None = Field(default=None, ge=0.0)
    due_date: str | None = None
    checklist: List[ChecklistItem] | None = None

class TaskStatusUpdate(BaseModel):
    status: TaskStatus

class TaskResponse(TaskBase):
    id: str
    project_id: str
    project_name: str | None = None
    client_name: str | None = None
    currency_code: str | None = None
    hourly_rate: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TaskSummary(BaseModel):
    id: str
    title: str
    status: TaskStatus
    priority: TaskPriority
    estimated_hours: float

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Project Schemas
# ==========================================

ProjectBillingType = Literal["hourly", "fixed", "internal"]
ProjectStatus = Literal["active", "completed", "on_hold", "archived"]

class ClientNested(BaseModel):
    id: str
    company_name: str
    contact_person: str
    currency_code: str
    hourly_rate: float

    model_config = ConfigDict(from_attributes=True)

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    billing_type: ProjectBillingType = "hourly"
    hourly_rate: float | None = Field(default=None, ge=0.0)
    budget_amount: float | None = Field(default=None, ge=0.0)
    status: ProjectStatus = "active"
    start_date: str | None = None
    end_date: str | None = None

class ProjectCreate(ProjectBase):
    client_id: str = Field(..., min_length=1, max_length=32)

class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    client_id: str | None = Field(default=None, min_length=1, max_length=32)
    description: str | None = None
    billing_type: ProjectBillingType | None = None
    hourly_rate: float | None = Field(default=None, ge=0.0)
    budget_amount: float | None = Field(default=None, ge=0.0)
    status: ProjectStatus | None = None
    start_date: str | None = None
    end_date: str | None = None

class ProjectStatusUpdate(BaseModel):
    status: ProjectStatus

class ProjectResponse(ProjectBase):
    id: str
    client_id: str
    created_at: datetime
    updated_at: datetime
    client: ClientNested | None = None
    tasks: list[TaskResponse] = []
    task_count: int = 0
    active_task_count: int = 0
    completed_task_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class ProjectSummary(BaseModel):
    id: str
    name: str
    client_id: str
    client_name: str | None = None
    status: ProjectStatus
    billing_type: ProjectBillingType
    hourly_rate: float | None = None
    task_count: int = 0

    model_config = ConfigDict(from_attributes=True)
