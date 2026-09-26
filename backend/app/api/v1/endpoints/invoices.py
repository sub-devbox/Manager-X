import json
import re
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_optional_user
from app.models.user_models import User
from app.models.invoice_model import Invoice, InvoiceItem
from app.models.client_model import Client
from app.models.project_models import Project, Task, TimeEntry
from app.models.settings_models import SystemSetting
from app.services.invoice_pdf import build_invoice_pdf
from app.schemas.invoice_schemas import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    UnbilledTaskOut,
    RecordPaymentRequest,
    ReconcileRequest,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])

async def get_company_profile_dict(db: AsyncSession) -> Dict[str, Any]:
    stmt = select(SystemSetting).where(SystemSetting.key == "company_profile")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except Exception:
            pass
    return {}

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

    # 2. Get task IDs already assigned to other invoices
    inv_item_stmt = select(InvoiceItem.task_id).where(InvoiceItem.task_id.isnot(None))
    if exclude_invoice_id:
        inv_item_stmt = inv_item_stmt.where(InvoiceItem.invoice_id != exclude_invoice_id)
    inv_item_res = await db.execute(inv_item_stmt)
    other_invoiced_task_ids = set([t for t in inv_item_res.scalars().all() if t])

    # 3. Fetch all tasks for these projects
    task_stmt = select(Task).where(Task.project_id.in_(list(project_map.keys())))
    task_res = await db.execute(task_stmt)
    all_tasks = task_res.scalars().all()

    unbilled: List[UnbilledTaskOut] = []
    for task in all_tasks:
        proj = project_map.get(task.project_id)

        # Sum ONLY Due time entries for this task
        # Due means: billable, duration > 0, and not attached to another invoice
        time_cond = and_(
            TimeEntry.task_id == task.id,
            TimeEntry.is_billable == True,
            TimeEntry.duration_seconds > 0,
        )
        if exclude_invoice_id:
            time_cond = and_(
                time_cond,
                or_(TimeEntry.invoice_id.is_(None), TimeEntry.invoice_id == exclude_invoice_id),
            )
        else:
            time_cond = and_(
                time_cond,
                TimeEntry.invoice_id.is_(None),
                TimeEntry.invoiced == False,
            )

        time_stmt = select(func.sum(TimeEntry.duration_seconds)).where(time_cond)
        time_res = await db.execute(time_stmt)
        due_sec = time_res.scalar() or 0

        # Check total time entries for this task (to know if work was logged)
        total_time_stmt = select(func.count(TimeEntry.id)).where(TimeEntry.task_id == task.id)
        total_time_res = await db.execute(total_time_stmt)
        total_entries_count = total_time_res.scalar() or 0

        if due_sec > 0:
            # Has unbilled/due time to invoice!
            unbilled.append(
                UnbilledTaskOut(
                    id=task.id,
                    title=task.title,
                    project_id=task.project_id,
                    project_name=proj.name if proj else None,
                    estimated_hours=task.estimated_hours or 0.0,
                    hourly_rate=proj.hourly_rate if proj and proj.hourly_rate else None,
                    time_spent_seconds=int(due_sec),
                )
            )
        elif total_entries_count == 0 and task.id not in other_invoiced_task_ids:
            # No time entries logged at all, but task exists and hasn't been invoiced
            unbilled.append(
                UnbilledTaskOut(
                    id=task.id,
                    title=task.title,
                    project_id=task.project_id,
                    project_name=proj.name if proj else None,
                    estimated_hours=task.estimated_hours or 0.0,
                    hourly_rate=proj.hourly_rate if proj and proj.hourly_rate else None,
                    time_spent_seconds=0,
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
        received_amount_inr=payload.received_amount_inr,
        payment_date=payload.payment_date,
        is_reconciled=payload.is_reconciled,
        bank_transaction_id=payload.bank_transaction_id,
        items=items_to_create,
    )

    db.add(invoice)
    await db.flush()

    # Link unbilled time entries for each line item with task_id
    for item in items_to_create:
        if item.task_id:
            time_update_stmt = (
                update(TimeEntry)
                .where(
                    TimeEntry.task_id == item.task_id,
                    TimeEntry.is_billable == True,
                    TimeEntry.invoice_id.is_(None),
                    TimeEntry.invoiced == False,
                )
                .values(
                    invoice_id=invoice.id,
                    invoiced=(invoice.status == "paid"),
                )
            )
            await db.execute(time_update_stmt)

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
    if payload.received_amount_inr is not None:
        invoice.received_amount_inr = payload.received_amount_inr
    if payload.payment_date is not None:
        invoice.payment_date = payload.payment_date
    if payload.is_reconciled is not None:
        invoice.is_reconciled = payload.is_reconciled
    if payload.bank_transaction_id is not None:
        invoice.bank_transaction_id = payload.bank_transaction_id

    # Update line items if provided
    if payload.items is not None:
        current_task_ids = [item.task_id for item in payload.items if item.task_id]

        # 1. Unlink time entries for tasks that were removed from this invoice
        if current_task_ids:
            unlink_stmt = (
                update(TimeEntry)
                .where(
                    TimeEntry.invoice_id == invoice.id,
                    TimeEntry.task_id.not_in(current_task_ids),
                )
                .values(invoice_id=None, invoiced=False)
            )
        else:
            unlink_stmt = (
                update(TimeEntry)
                .where(TimeEntry.invoice_id == invoice.id)
                .values(invoice_id=None, invoiced=False)
            )
        await db.execute(unlink_stmt)

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

        # 2. Link unbilled time entries for all current tasks
        target_status = payload.status if payload.status is not None else invoice.status
        is_paid = (target_status == "paid")
        for tid in current_task_ids:
            link_stmt = (
                update(TimeEntry)
                .where(
                    TimeEntry.task_id == tid,
                    TimeEntry.is_billable == True,
                    or_(
                        and_(TimeEntry.invoice_id.is_(None), TimeEntry.invoiced == False),
                        TimeEntry.invoice_id == invoice.id,
                    ),
                )
                .values(
                    invoice_id=invoice.id,
                    invoiced=is_paid,
                )
            )
            await db.execute(link_stmt)
    elif payload.status is not None:
        # Items were not replaced, but status changed
        if payload.status == "paid":
            await db.execute(
                update(TimeEntry)
                .where(TimeEntry.invoice_id == invoice.id)
                .values(invoiced=True)
            )
        else:
            await db.execute(
                update(TimeEntry)
                .where(TimeEntry.invoice_id == invoice.id)
                .values(invoiced=False)
            )

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

@router.post("/{invoice_id}/pay", response_model=InvoiceResponse)
async def record_invoice_payment(
    invoice_id: str,
    payload: RecordPaymentRequest,
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

    pay_date = payload.payment_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    invoice.status = "paid"
    invoice.received_amount_inr = payload.received_amount_inr
    invoice.payment_date = pay_date
    if payload.bank_reference:
        ref_text = f"Bank Ref: {payload.bank_reference}"
        if invoice.gateway_notes:
            invoice.gateway_notes = f"{invoice.gateway_notes}\n{ref_text}"
        else:
            invoice.gateway_notes = ref_text

    # Mark all linked time entries as invoiced (paid)
    await db.execute(
        update(TimeEntry)
        .where(TimeEntry.invoice_id == invoice.id)
        .values(invoiced=True)
    )

    await db.commit()
    await db.refresh(invoice)

    reload_stmt = (
        select(Invoice)
        .options(selectinload(Invoice.client), selectinload(Invoice.items))
        .where(Invoice.id == invoice.id)
    )
    reload_res = await db.execute(reload_stmt)
    return reload_res.scalar_one()

@router.post("/{invoice_id}/reconcile", response_model=InvoiceResponse)
async def reconcile_invoice(
    invoice_id: str,
    payload: ReconcileRequest,
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

    invoice.is_reconciled = True
    if payload.bank_transaction_id:
        invoice.bank_transaction_id = payload.bank_transaction_id
    if payload.payment_date:
        invoice.payment_date = payload.payment_date

    await db.commit()
    await db.refresh(invoice)

    reload_stmt = (
        select(Invoice)
        .options(selectinload(Invoice.client), selectinload(Invoice.items))
        .where(Invoice.id == invoice.id)
    )
    reload_res = await db.execute(reload_stmt)
    return reload_res.scalar_one()

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

    # Unlink any time entries associated with this invoice before deleting
    await db.execute(
        update(TimeEntry)
        .where(TimeEntry.invoice_id == invoice_id)
        .values(invoice_id=None, invoiced=False)
    )

    await db.delete(invoice)
    await db.commit()
    return {"message": f"Invoice {invoice.invoice_number} deleted successfully"}

@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
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

    company_profile = await get_company_profile_dict(db)

    inv_data = {
        "invoice_number": invoice.invoice_number,
        "issue_date": invoice.issue_date,
        "due_date": invoice.due_date,
        "status": invoice.status,
        "currency_code": invoice.currency_code,
        "payment_gateway": invoice.payment_gateway,
        "gateway_notes": invoice.gateway_notes,
        "subtotal": invoice.subtotal,
        "discount_type": invoice.discount_type,
        "discount_value": invoice.discount_value,
        "discount_amount": invoice.discount_amount,
        "round_off": invoice.round_off,
        "final_amount": invoice.final_amount,
        "received_amount_inr": invoice.received_amount_inr,
        "payment_date": invoice.payment_date,
        "is_reconciled": invoice.is_reconciled,
        "items": [
            {
                "description": itm.description,
                "hsn_sac": itm.hsn_sac,
                "quantity": itm.quantity,
                "unit_price": itm.unit_price,
                "total": itm.total,
            }
            for itm in invoice.items
        ],
    }

    client_data = {}
    if invoice.client:
        client_data = {
            "company_name": invoice.client.company_name,
            "contact_person": invoice.client.contact_person,
            "address_line1": invoice.client.address_line1,
            "address_line2": invoice.client.address_line2,
            "city": invoice.client.city,
            "state": invoice.client.state,
            "postal_code": invoice.client.postal_code,
            "country": invoice.client.country,
            "tax_id": invoice.client.tax_id,
            "email": invoice.client.email,
        }

    pdf_bytes = build_invoice_pdf(inv_data, client_data, company_profile)
    filename = f"{invoice.invoice_number or 'Invoice'}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

@router.post("/render-pdf")
async def render_custom_invoice_pdf(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    company_profile = await get_company_profile_dict(db)

    client_id = payload.get("client_id")
    client_data = payload.get("client") or {}
    if client_id and not client_data:
        c_stmt = select(Client).where(Client.id == client_id)
        c_res = await db.execute(c_stmt)
        client = c_res.scalar_one_or_none()
        if client:
            client_data = {
                "company_name": client.company_name,
                "contact_person": client.contact_person,
                "address_line1": client.address_line1,
                "address_line2": client.address_line2,
                "city": client.city,
                "state": client.state,
                "postal_code": client.postal_code,
                "country": client.country,
                "tax_id": client.tax_id,
                "email": client.email,
            }

    pdf_bytes = build_invoice_pdf(payload, client_data, company_profile)
    filename = f"{payload.get('invoice_number', 'Invoice')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
