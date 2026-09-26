from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, text, func, case

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user_models import User
from app.models.client_model import Client
from app.models.settings_models import Currency
from app.models.invoice_model import Invoice
from app.schemas.client_schemas import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientSummary,
)

router = APIRouter(prefix="/clients", tags=["Clients"])


async def get_client_aggregates(client_id: str, db: AsyncSession) -> tuple[float, float]:
    """Helper to auto-calculate incoming amounts and equivalent INR from paid invoices for a client."""
    inv_stmt = select(
        func.coalesce(func.sum(Invoice.final_amount), 0.0),
        func.coalesce(
            func.sum(
                func.coalesce(
                    Invoice.received_amount_inr,
                    case((Invoice.currency_code == "INR", Invoice.final_amount), else_=0.0),
                )
            ),
            0.0,
        ),
    ).where(
        Invoice.client_id == client_id,
        Invoice.status == "paid",
    )
    res = await db.execute(inv_stmt)
    incoming, inr = res.one()
    return round(float(incoming), 2), round(float(inr), 2)


def build_client_response(client: Client, incoming: float = 0.0, inr: float = 0.0) -> ClientResponse:
    resp = ClientResponse.model_validate(client)
    resp.total_incoming_amount = incoming
    resp.total_equivalent_inr = inr
    return resp


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    q: Optional[str] = Query(None, description="Search query across company, contact, or email"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Client)

    if is_active is not None:
        stmt = stmt.where(Client.is_active == is_active)

    if q:
        query_pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Client.company_name.ilike(query_pattern),
                Client.contact_person.ilike(query_pattern),
                Client.email.ilike(query_pattern),
            )
        )

    stmt = stmt.order_by(Client.company_name.asc())
    result = await db.execute(stmt)
    clients = result.scalars().all()

    if not clients:
        return []

    client_ids = [c.id for c in clients]
    inv_agg_stmt = (
        select(
            Invoice.client_id,
            func.coalesce(func.sum(Invoice.final_amount), 0.0).label("incoming"),
            func.coalesce(
                func.sum(
                    func.coalesce(
                        Invoice.received_amount_inr,
                        case((Invoice.currency_code == "INR", Invoice.final_amount), else_=0.0),
                    )
                ),
                0.0,
            ).label("inr"),
        )
        .where(
            Invoice.client_id.in_(client_ids),
            Invoice.status == "paid",
        )
        .group_by(Invoice.client_id)
    )
    agg_res = await db.execute(inv_agg_stmt)
    agg_map = {row.client_id: (round(float(row.incoming), 2), round(float(row.inr), 2)) for row in agg_res.all()}

    return [
        build_client_response(c, *agg_map.get(c.id, (0.0, 0.0)))
        for c in clients
    ]


@router.get("/summary", response_model=List[ClientSummary])
async def list_clients_summary(
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Client).where(Client.is_active == is_active).order_by(Client.company_name.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Zero-hardcoding check: currency must exist in settings
    curr_res = await db.execute(
        select(Currency).where(Currency.code == payload.currency_code.upper())
    )
    currency = curr_res.scalar_one_or_none()
    if not currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Currency '{payload.currency_code}' is not supported. Please add it to workspace settings first.",
        )

    client_data = payload.model_dump()
    client_data["currency_code"] = payload.currency_code.upper()

    client = Client(**client_data)
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return build_client_response(client, 0.0, 0.0)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Client).where(Client.id == client_id)
    res = await db.execute(stmt)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    incoming, inr = await get_client_aggregates(client.id, db)
    return build_client_response(client, incoming, inr)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    payload: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Client).where(Client.id == client_id)
    res = await db.execute(stmt)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)

    if "currency_code" in update_data and update_data["currency_code"]:
        curr_code = update_data["currency_code"].upper()
        curr_res = await db.execute(select(Currency).where(Currency.code == curr_code))
        if not curr_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Currency '{curr_code}' is not supported. Please add it to workspace settings first.",
            )
        update_data["currency_code"] = curr_code

    for key, value in update_data.items():
        setattr(client, key, value)

    await db.commit()
    await db.refresh(client)
    incoming, inr = await get_client_aggregates(client.id, db)
    return build_client_response(client, incoming, inr)


@router.patch("/{client_id}/toggle-status", response_model=ClientResponse)
async def toggle_client_status(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Client).where(Client.id == client_id)
    res = await db.execute(stmt)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )

    client.is_active = not client.is_active
    await db.commit()
    await db.refresh(client)
    incoming, inr = await get_client_aggregates(client.id, db)
    return build_client_response(client, incoming, inr)

@router.delete("/{client_id}")
async def delete_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Client).where(Client.id == client_id)
    res = await db.execute(stmt)
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )

    # Referential Deletion Protection: Check if linked to any projects or invoices
    # Check projects table if exists
    try:
        prj_check = await db.execute(
            text("SELECT count(*) FROM projects WHERE client_id = :cid"),
            {"cid": client_id},
        )
        if prj_check.scalar_one() > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete client '{client.company_name}' because linked projects exist. Deactivate the client instead.",
            )
    except HTTPException:
        raise
    except Exception:
        pass  # Table does not exist yet

    # Check invoices table if exists
    try:
        inv_check = await db.execute(
            text("SELECT count(*) FROM invoices WHERE client_id = :cid"),
            {"cid": client_id},
        )
        if inv_check.scalar_one() > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete client '{client.company_name}' because linked invoices exist. Deactivate the client instead.",
            )
    except HTTPException:
        raise
    except Exception:
        pass  # Table does not exist yet

    await db.delete(client)
    await db.commit()
    return {"message": f"Client '{client.company_name}' was successfully deleted."}
