from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user_models import User
from app.models.project_models import Project, Task, TimeEntry
from app.schemas.time_schemas import (
    TimeEntryCreate,
    TimeEntryUpdate,
    TimeEntryResponse,
)

router = APIRouter(prefix="/time-entries", tags=["Time Tracking"])

def _format_time_entry_response(entry: TimeEntry) -> TimeEntryResponse:
    task_title = entry.task.title if entry.task else None
    project_name = entry.project.name if entry.project else None
    client_name = None
    client_id = None
    currency_code = "USD"
    if entry.project and entry.project.client:
        client_name = entry.project.client.company_name
        client_id = entry.project.client.id
        if entry.project.client.currency_code:
            currency_code = entry.project.client.currency_code
    elif entry.task and entry.task.project and entry.task.project.client:
        if entry.task.project.client.currency_code:
            currency_code = entry.task.project.client.currency_code

    effective_rate = entry.hourly_rate if entry.hourly_rate is not None else 0.0
    billable_amount = 0.0
    if entry.is_billable and effective_rate > 0:
        billable_amount = round((entry.duration_seconds / 3600.0) * effective_rate, 2)

    return TimeEntryResponse(
        id=entry.id,
        task_id=entry.task_id,
        project_id=entry.project_id,
        description=entry.description,
        start_time=entry.start_time,
        end_time=entry.end_time,
        duration_seconds=entry.duration_seconds,
        is_billable=entry.is_billable,
        hourly_rate=entry.hourly_rate,
        invoiced=entry.invoiced,
        task_title=task_title,
        project_name=project_name,
        client_name=client_name,
        client_id=client_id,
        currency_code=currency_code,
        billable_amount=billable_amount,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )

@router.get("", response_model=List[TimeEntryResponse])
async def list_time_entries(
    task_id: Optional[str] = Query(None, description="Filter by task ID"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    date_from: Optional[str] = Query(None, description="Filter start date >= YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Filter start date <= YYYY-MM-DD"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(TimeEntry)
    filters = []

    if task_id:
        filters.append(TimeEntry.task_id == task_id)
    if project_id:
        filters.append(TimeEntry.project_id == project_id)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            filters.append(TimeEntry.start_time >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            filters.append(TimeEntry.start_time <= dt_to)
        except ValueError:
            pass

    if filters:
        stmt = stmt.where(and_(*filters))

    stmt = stmt.order_by(TimeEntry.start_time.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    entries = result.scalars().all()

    return [_format_time_entry_response(e) for e in entries]

@router.post("", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_time_entry(
    payload: TimeEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify task exists
    task_result = await db.execute(select(Task).where(Task.id == payload.task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{payload.task_id}' not found",
        )

    # Derive project_id from task if not provided or mismatch
    project_id = payload.project_id or task.project_id

    # Derive rate if not explicitly specified
    hourly_rate = payload.hourly_rate
    if hourly_rate is None and task.project:
        if task.project.hourly_rate is not None:
            hourly_rate = task.project.hourly_rate
        elif task.project.client and task.project.client.hourly_rate is not None:
            hourly_rate = task.project.client.hourly_rate

    duration_seconds = payload.duration_seconds
    start_time = payload.start_time
    end_time = payload.end_time

    if start_time and end_time:
        # Subtract time start from time stop to calculate logged time
        duration_seconds = max(0, int((end_time - start_time).total_seconds()))
    elif duration_seconds > 0 and start_time and not end_time:
        # Manual entry of logged time: time stop = time start + manual time
        end_time = start_time + timedelta(seconds=duration_seconds)

    new_entry = TimeEntry(
        task_id=task.id,
        project_id=project_id,
        description=payload.description,
        start_time=start_time,
        end_time=end_time,
        duration_seconds=duration_seconds,
        is_billable=payload.is_billable,
        hourly_rate=hourly_rate,
        invoiced=False,
    )

    db.add(new_entry)

    # If task is still in backlog, automatically transition to in_progress
    if task.status == "backlog":
        task.status = "in_progress"

    await db.commit()
    await db.refresh(new_entry)

    return _format_time_entry_response(new_entry)

@router.get("/{entry_id}", response_model=TimeEntryResponse)
async def get_time_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TimeEntry).where(TimeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time entry '{entry_id}' not found",
        )
    return _format_time_entry_response(entry)

@router.patch("/{entry_id}", response_model=TimeEntryResponse)
@router.put("/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    entry_id: str,
    payload: TimeEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TimeEntry).where(TimeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time entry '{entry_id}' not found",
        )

    if entry.invoiced and payload.invoiced is not False:
        if (
            payload.duration_seconds is not None
            or payload.hourly_rate is not None
            or payload.is_billable is not None
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify duration, billable status, or hourly rate of an already invoiced time entry.",
            )

    update_data = payload.model_dump(exclude_unset=True)

    if "task_id" in update_data and update_data["task_id"] != entry.task_id:
        task_res = await db.execute(select(Task).where(Task.id == update_data["task_id"]))
        task = task_res.scalar_one_or_none()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task with ID '{update_data['task_id']}' not found",
            )
        entry.task_id = task.id
        entry.project_id = task.project_id

    for key, value in update_data.items():
        if key != "task_id":
            setattr(entry, key, value)

    # Recalculate duration or stop time according to rule
    if "end_time" in update_data and entry.end_time and entry.start_time:
        # User updated/supplied stop time: duration = stop - start
        entry.duration_seconds = max(0, int((entry.end_time - entry.start_time).total_seconds()))
    elif "duration_seconds" in update_data and "end_time" not in update_data and entry.start_time:
        # Manual entry of logged time: time stop = time start + manual time
        if entry.duration_seconds > 0:
            entry.end_time = entry.start_time + timedelta(seconds=entry.duration_seconds)

    await db.commit()
    await db.refresh(entry)
    return _format_time_entry_response(entry)

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TimeEntry).where(TimeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time entry '{entry_id}' not found",
        )

    if entry.invoiced:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete an already invoiced time entry.",
        )

    await db.delete(entry)
    await db.commit()
    return None
