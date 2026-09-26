from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user_models import User
from app.models.gateway_model import PaymentGateway
from app.models.invoice_model import Invoice
from app.schemas.gateway_schemas import (
    GatewayCreate,
    GatewayUpdate,
    GatewayResponse,
)

router = APIRouter(prefix="/gateways", tags=["Payment Gateways"])


async def build_gateway_response(gw: PaymentGateway, db: AsyncSession) -> GatewayResponse:
    """Helper to auto-calculate incoming amounts, equivalent INR, and realized average rate from paid invoices."""
    inv_stmt = select(
        func.coalesce(func.sum(Invoice.final_amount), 0.0),
        func.coalesce(func.sum(Invoice.received_amount_inr), 0.0),
    ).where(
        Invoice.payment_gateway == gw.name,
        Invoice.status == "paid",
    )
    inv_res = await db.execute(inv_stmt)
    live_incoming, live_inr = inv_res.one()

    incoming = round(float(live_incoming), 2)
    inr = round(float(live_inr), 2)
    rate = round(inr / incoming, 2) if incoming > 0 and inr > 0 else 0.0

    return GatewayResponse(
        id=gw.id,
        name=gw.name,
        currency_code=gw.currency_code,
        total_incoming_amount=incoming,
        total_equivalent_inr=inr,
        average_rate=rate,
        gateway_note=gw.gateway_note or "",
        is_active=gw.is_active,
        created_at=gw.created_at,
        updated_at=gw.updated_at,
    )


@router.get("", response_model=List[GatewayResponse])
async def list_gateways(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    q: Optional[str] = Query(None, description="Search query across name, currency, or note"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PaymentGateway)

    if is_active is not None:
        stmt = stmt.where(PaymentGateway.is_active == is_active)

    if q:
        query_pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                PaymentGateway.name.ilike(query_pattern),
                PaymentGateway.currency_code.ilike(query_pattern),
                PaymentGateway.gateway_note.ilike(query_pattern),
            )
        )

    stmt = stmt.order_by(PaymentGateway.name.asc())
    result = await db.execute(stmt)
    gateways = result.scalars().all()

    return [await build_gateway_response(gw, db) for gw in gateways]


@router.post("", response_model=GatewayResponse, status_code=status.HTTP_201_CREATED)
async def create_gateway(
    payload: GatewayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clean_name = payload.name.strip()
    dup_check = await db.execute(
        select(PaymentGateway).where(func.lower(PaymentGateway.name) == clean_name.lower())
    )
    if dup_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment Gateway with name '{clean_name}' already exists.",
        )

    gw = PaymentGateway(
        name=clean_name,
        currency_code=payload.currency_code.upper().strip(),
        total_incoming_amount=0.0,
        total_equivalent_inr=0.0,
        average_rate=0.0,
        gateway_note=payload.gateway_note or "",
        is_active=payload.is_active,
    )
    db.add(gw)
    await db.commit()
    await db.refresh(gw)
    return await build_gateway_response(gw, db)


@router.get("/{gateway_id}", response_model=GatewayResponse)
async def get_gateway(
    gateway_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PaymentGateway).where(PaymentGateway.id == gateway_id)
    res = await db.execute(stmt)
    gw = res.scalar_one_or_none()
    if not gw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gateway with ID '{gateway_id}' not found.",
        )
    return await build_gateway_response(gw, db)


@router.put("/{gateway_id}", response_model=GatewayResponse)
async def update_gateway(
    gateway_id: str,
    payload: GatewayUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PaymentGateway).where(PaymentGateway.id == gateway_id)
    res = await db.execute(stmt)
    gw = res.scalar_one_or_none()
    if not gw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gateway with ID '{gateway_id}' not found.",
        )

    if payload.name is not None and payload.name.strip() != gw.name:
        clean_name = payload.name.strip()
        dup_check = await db.execute(
            select(PaymentGateway).where(
                func.lower(PaymentGateway.name) == clean_name.lower(),
                PaymentGateway.id != gateway_id,
            )
        )
        if dup_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another Payment Gateway with name '{clean_name}' already exists.",
            )
        gw.name = clean_name

    if payload.currency_code is not None:
        gw.currency_code = payload.currency_code.upper().strip()
    if payload.gateway_note is not None:
        gw.gateway_note = payload.gateway_note
    if payload.is_active is not None:
        gw.is_active = payload.is_active

    await db.commit()
    await db.refresh(gw)
    return await build_gateway_response(gw, db)


@router.patch("/{gateway_id}/toggle-status", response_model=GatewayResponse)
async def toggle_gateway_status(
    gateway_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PaymentGateway).where(PaymentGateway.id == gateway_id)
    res = await db.execute(stmt)
    gw = res.scalar_one_or_none()
    if not gw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gateway with ID '{gateway_id}' not found.",
        )

    gw.is_active = not gw.is_active
    await db.commit()
    await db.refresh(gw)
    return await build_gateway_response(gw, db)


@router.delete("/{gateway_id}")
async def delete_gateway(
    gateway_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PaymentGateway).where(PaymentGateway.id == gateway_id)
    res = await db.execute(stmt)
    gw = res.scalar_one_or_none()
    if not gw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gateway with ID '{gateway_id}' not found.",
        )

    await db.delete(gw)
    await db.commit()
    return {"message": f"Payment Gateway '{gw.name}' deleted successfully."}
