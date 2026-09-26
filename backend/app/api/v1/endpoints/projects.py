from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user_models import User
from app.models.client_model import Client
from app.models.project_models import Project, Task
from app.schemas.project_schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectStatusUpdate,
    ProjectResponse,
    ProjectSummary,
)

router = APIRouter(prefix="/projects", tags=["Projects"])

def _format_project_response(project: Project) -> dict:
    tasks = project.tasks or []
    completed = sum(1 for t in tasks if t.status == "done")
    return {
        "id": project.id,
        "client_id": project.client_id,
        "name": project.name,
        "description": project.description,
        "billing_type": project.billing_type,
        "hourly_rate": project.hourly_rate,
        "budget_amount": project.budget_amount,
        "status": project.status,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "client": project.client,
        "tasks": tasks,
        "task_count": len(tasks),
        "active_task_count": len(tasks) - completed,
        "completed_task_count": completed,
    }

@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    billing_type: Optional[str] = Query(None, description="Filter by billing type"),
    q: Optional[str] = Query(None, description="Search by name or description"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Project)

    if client_id:
        stmt = stmt.where(Project.client_id == client_id)
    if status_filter:
        stmt = stmt.where(Project.status == status_filter)
    if billing_type:
        stmt = stmt.where(Project.billing_type == billing_type)
    if q:
        query_pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Project.name.ilike(query_pattern),
                Project.description.ilike(query_pattern),
            )
        )

    stmt = stmt.order_by(Project.created_at.desc())
    res = await db.execute(stmt)
    projects = res.scalars().all()
    return [_format_project_response(p) for p in projects]

@router.get("/summary", response_model=List[ProjectSummary])
async def list_projects_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Project).where(Project.status != "archived").order_by(Project.name.asc())
    res = await db.execute(stmt)
    projects = res.scalars().all()
    return [
        ProjectSummary(
            id=p.id,
            name=p.name,
            client_id=p.client_id,
            client_name=p.client.company_name if p.client else None,
            status=p.status,
            billing_type=p.billing_type,
            hourly_rate=p.hourly_rate,
            task_count=len(p.tasks or []),
        )
        for p in projects
    ]

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify client exists
    client_res = await db.execute(select(Client).where(Client.id == payload.client_id))
    client = client_res.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id '{payload.client_id}' not found.",
        )

    project_data = payload.model_dump()
    # Auto-inherit hourly rate from client if not explicitly specified
    if project_data.get("hourly_rate") is None or project_data.get("hourly_rate") == 0.0:
        if project_data.get("billing_type") == "hourly":
            project_data["hourly_rate"] = client.hourly_rate

    project = Project(**project_data)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return _format_project_response(project)

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found.",
        )
    return _format_project_response(project)

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found.",
        )

    update_dict = payload.model_dump(exclude_unset=True)
    if "client_id" in update_dict and update_dict["client_id"] != project.client_id:
        c_res = await db.execute(select(Client).where(Client.id == update_dict["client_id"]))
        if not c_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client '{update_dict['client_id']}' not found.",
            )

    for field, val in update_dict.items():
        setattr(project, field, val)

    await db.commit()
    await db.refresh(project)
    return _format_project_response(project)

@router.patch("/{project_id}/status", response_model=ProjectResponse)
async def update_project_status(
    project_id: str,
    payload: ProjectStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found.",
        )

    project.status = payload.status
    await db.commit()
    await db.refresh(project)
    return _format_project_response(project)

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found.",
        )

    # Referential Invariant: Block deletion if project has tasks
    task_count_res = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project_id)
    )
    task_count = task_count_res.scalar() or 0
    if task_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete project '{project.name}' because it contains {task_count} task(s). Archive the project instead.",
        )

    await db.delete(project)
    await db.commit()
    return {"message": f"Project '{project.name}' deleted successfully."}
