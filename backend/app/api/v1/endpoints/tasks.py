from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, text

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user_models import User
from app.models.project_models import Project, Task
from app.schemas.project_schemas import (
    TaskCreate,
    TaskUpdate,
    TaskStatusUpdate,
    TaskResponse,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def _format_task_response(task: Task) -> TaskResponse:
    project_name = task.project.name if task.project else None
    client_name = task.project.client.company_name if task.project and task.project.client else None
    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        estimated_hours=task.estimated_hours,
        due_date=task.due_date,
        checklist=task.checklist or [],
        created_at=task.created_at,
        updated_at=task.updated_at,
        project_name=project_name,
        client_name=client_name,
    )

@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    q: Optional[str] = Query(None, description="Search task title or description"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Task)

    if project_id:
        stmt = stmt.where(Task.project_id == project_id)
    if status_filter:
        stmt = stmt.where(Task.status == status_filter)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Task.title.ilike(pattern),
                Task.description.ilike(pattern),
            )
        )

    stmt = stmt.order_by(Task.created_at.desc())
    res = await db.execute(stmt)
    tasks = res.scalars().all()
    return [_format_task_response(t) for t in tasks]

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify parent project exists
    prj_res = await db.execute(select(Project).where(Project.id == payload.project_id))
    project = prj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id '{payload.project_id}' not found.",
        )

    task = Task(**payload.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _format_task_response(task)

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(Task).where(Task.id == task_id))
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )
    return _format_task_response(task)

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(Task).where(Task.id == task_id))
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, val)

    await db.commit()
    await db.refresh(task)
    return _format_task_response(task)

@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: str,
    payload: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(Task).where(Task.id == task_id))
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )

    task.status = payload.status
    await db.commit()
    await db.refresh(task)
    return _format_task_response(task)

@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(Task).where(Task.id == task_id))
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )

    # Referential Invariant: Check if time entries logged for this task
    try:
        time_check = await db.execute(
            text("SELECT count(*) FROM time_entries WHERE task_id = :tid"),
            {"tid": task_id},
        )
        if time_check.scalar_one() > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete task '{task.title}' because time entries are recorded against it.",
            )
    except HTTPException:
        raise
    except Exception:
        pass  # time_entries table may not exist yet

    await db.delete(task)
    await db.commit()
    return {"message": f"Task '{task.title}' was deleted successfully."}
