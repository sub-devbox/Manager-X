import re
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_optional_user
from app.models.user_models import User
from app.models.invoice_model import Invoice, InvoiceItem
from app.models.client_model import Client
from app.models.project_models import Project, Task, TimeEntry
from app.schemas.invoice_schemas import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    UnbilledTaskOut,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])

def extract_company_initials(company_name: str) -> str:
    words = [w for w in re.split(r"[^a-zA-Z0-9]+", company_name) if w]
    if not words:
        return "CLI"
    initials = "".join([w[0].upper() for w in words])
    return initials if initials else "CLI"

async def get_next_invoice_number(client_id: str, issue_date_str: str, db: AsyncSession) -> str:
    # 1. Fetch client
    client_stmt = select(Client).where(Client.id == client_id)
    client_res = await db.execute(client_stmt)
    client = client_res.scalar_one_or_none()
    company_name = client.company_name if client else "CLI"
    initials = extract_company_initials(company_name)

    # 2. Extract YYYY-MM
    try:
        parts = issue_date_str.split("-")
        year_month = f"{parts[0]}-{parts[1]}"
    except Exception:
        now = datetime.now(timezone.utc)
        year_month = f"{now.year}-{now.month:02d}"

    prefix = f"INV-{year_month}-{initials}."

    # 3. Find highest existing sequence for this prefix
    stmt = select(Invoice.invoice_number).where(Invoice.invoice_number.like(f"{prefix}%"))
    res = await db.execute(stmt)
    existing_numbers = res.scalars().all()

    max_seq = 0
    for num in existing_numbers:
        try:
            seq_part = num.replace(prefix, "")
            seq_num = int(seq_part)
            if seq_num > max_seq:
                max_seq = seq_num
        except Exception:
            continue

    next_seq = max_seq + 1
    return f"{prefix}{next_seq}"

@router.get("/next-number")
async def calculate_next_invoice_number(
    client_id: str = Query(...),
    issue_date: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    next_num = await get_next_invoice_number(client_id, issue_date, db)
    return {"invoice_number": next_num}

@router.get("/unbilled-tasks", response_model=List[UnbilledTaskOut])
async def get_unbilled_tasks(
    client_id: str = Query(...),
    exclude_invoice_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # 1. Get all projects for this client
    proj_stmt = select(Project).where(Project.client_id == client_id)
    proj_res = await db.execute(proj_stmt)
    projects = proj_res.scalars().all()
    project_map = {p.id: p for p in projects}

    if not project_map:
        return []

    # 2. Get task IDs already assigned to invoices
    inv_item_stmt = select(InvoiceItem.task_id).where(InvoiceItem.task_id.isnot(None))
    if exclude_invoice_id:
        inv_item_stmt = inv_item_stmt.where(InvoiceItem.invoice_id != exclude_invoice_id)
    inv_item_res = await db.execute(inv_item_stmt)
    already_invoiced_task_ids = set([t for t in inv_item_res.scalars().all() if t])

    # 3. Fetch all tasks for these projects
    task_stmt = select(Task).where(Task.project_id.in_(list(project_map.keys())))
    task_res = await db.execute(task_stmt)
    all_tasks = task_res.scalars().all()

    unbilled: List[UnbilledTaskOut] = []
    for task in all_tasks:
        if task.id in already_invoiced_task_ids:
            continue

        proj = project_map.get(task.project_id)
        # Compute time spent on this task
        time_stmt = select(func.sum(TimeEntry.duration_seconds)).where(TimeEntry.task_id == task.id)
        time_res = await db.execute(time_stmt)
        total_sec = time_res.scalar() or 0

        unbilled.append(
            UnbilledTaskOut(
                id=task.id,
                title=task.title,
                project_id=task.project_id,
                project_name=proj.name if proj else None,
                estimated_hours=task.estimated_hours or 0.0,
                hourly_rate=proj.hourly_rate if proj and proj.hourly_rate else None,
                time_spent_seconds=int(total_sec),
            )
        )

    return unbilled

@router.get("", response_model=List[InvoiceResponse])
async def list_invoices(
    status: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.client), selectinload(Invoice.items))
        .order_by(Invoice.issue_date.desc(), Invoice.created_at.desc())
    )

    if status and status != "all":
        stmt = stmt.where(Invoice.status == status)
    if client_id and client_id != "all":
        stmt = stmt.where(Invoice.client_id == client_id)

    res = await db.execute(stmt)
    invoices = res.scalars().all()
    return invoices

@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # Verify client exists
    client_stmt = select(Client).where(Client.id == payload.client_id)
    client_res = await db.execute(client_stmt)
    client = client_res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Generate invoice number if not provided
    inv_number = payload.invoice_number
    if not inv_number or not inv_number.strip():
        inv_number = await get_next_invoice_number(payload.client_id, payload.issue_date, db)

    # Check for duplicate invoice number
    dup_stmt = select(Invoice).where(Invoice.invoice_number == inv_number)
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Invoice number '{inv_number}' already exists")

    # Calculate item totals & subtotal
    subtotal = 0.0
    items_to_create = []
    for idx, item in enumerate(payload.items):
        item_total = round(item.quantity * item.unit_price, 2)
        subtotal += item_total
        items_to_create.append(
            InvoiceItem(
                task_id=item.task_id,
                description=item.description,
                hsn_sac=item.hsn_sac or "",
                price=item.price,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total=item_total,
                sort_order=idx,
            )
        )

    # Calculate discount & final amount
    subtotal = round(subtotal, 2)
    discount_amount = 0.0
    if payload.discount_type == "percentage":
        discount_amount = round((subtotal * payload.discount_value) / 100.0, 2)
    else:
        discount_amount = round(payload.discount_value, 2)

    final_amount = round(subtotal - discount_amount + payload.round_off, 2)
    if final_amount < 0:
        final_amount = 0.0

    currency = payload.currency_code or client.currency_code or "USD"

    invoice = Invoice(
        invoice_number=inv_number,
        client_id=payload.client_id,
        status=payload.status or "draft",
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        payment_gateway=payload.payment_gateway or "Razorpay",
        subtotal=subtotal,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        discount_amount=discount_amount,
        round_off=payload.round_off,
        final_amount=final_amount,
        currency_code=currency,
        gateway_notes=payload.gateway_notes,
        items=items_to_create,
    )

    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)

    # Load relationships for full response
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.client), selectinload(Invoice.items))
        .where(Invoice.id == invoice.id)
    )
    res = await db.execute(stmt)
    created_invoice = res.scalar_one()
    return created_invoice

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.client), selectinload(Invoice.items))
        .where(Invoice.id == invoice_id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    payload: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.client), selectinload(Invoice.items))
        .where(Invoice.id == invoice_id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if payload.client_id is not None:
        invoice.client_id = payload.client_id
    if payload.invoice_number is not None and payload.invoice_number != invoice.invoice_number:
        # Check uniqueness
        dup_stmt = select(Invoice).where(
            and_(Invoice.invoice_number == payload.invoice_number, Invoice.id != invoice_id)
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Invoice number '{payload.invoice_number}' already in use")
        invoice.invoice_number = payload.invoice_number

    if payload.status is not None:
        invoice.status = payload.status
    if payload.issue_date is not None:
        invoice.issue_date = payload.issue_date
    if payload.due_date is not None:
        invoice.due_date = payload.due_date
    if payload.payment_gateway is not None:
        invoice.payment_gateway = payload.payment_gateway
    if payload.currency_code is not None:
        invoice.currency_code = payload.currency_code
    if payload.gateway_notes is not None:
        invoice.gateway_notes = payload.gateway_notes

    # Update line items if provided
    if payload.items is not None:
        # Clear existing items
        invoice.items.clear()
        subtotal = 0.0
        for idx, item in enumerate(payload.items):
            item_total = round(item.quantity * item.unit_price, 2)
            subtotal += item_total
            invoice.items.append(
                InvoiceItem(
                    task_id=item.task_id,
                    description=item.description,
                    hsn_sac=item.hsn_sac or "",
                    price=item.price,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total=item_total,
                    sort_order=idx,
                )
            )
        invoice.subtotal = round(subtotal, 2)

    # Recalculate discount & final amount if financial fields provided
    disc_type = payload.discount_type if payload.discount_type is not None else invoice.discount_type
    disc_val = payload.discount_value if payload.discount_value is not None else invoice.discount_value
    round_off = payload.round_off if payload.round_off is not None else invoice.round_off

    invoice.discount_type = disc_type
    invoice.discount_value = disc_val

    if disc_type == "percentage":
        invoice.discount_amount = round((invoice.subtotal * disc_val) / 100.0, 2)
    else:
        invoice.discount_amount = round(disc_val, 2)

    invoice.round_off = round_off
    final = round(invoice.subtotal - invoice.discount_amount + round_off, 2)
    invoice.final_amount = max(0.0, final)

    await db.commit()
    await db.refresh(invoice)

    # Reload relationships
    res_stmt = (
        select(Invoice)
        .options(selectinload(Invoice.client), selectinload(Invoice.items))
        .where(Invoice.id == invoice.id)
    )
    res = await db.execute(res_stmt)
    return res.scalar_one()

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    stmt = select(Invoice).where(Invoice.id == invoice_id)
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    await db.delete(invoice)
    await db.commit()
    return {"message": f"Invoice {invoice.invoice_number} deleted successfully"}
