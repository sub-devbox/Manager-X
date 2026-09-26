import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_payment_gateways_lifecycle(client: AsyncClient):
    # 1. Register & Login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "gateway_mgr@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
            "full_name": "Gateway Admin",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "gateway_mgr@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
        },
    )
    assert login_res.status_code == 200

    # 2. List initial gateways - should be blank
    list_init = await client.get("/api/v1/gateways")
    assert list_init.status_code == 200
    assert isinstance(list_init.json(), list)

    # 3. Create a new custom Gateway (without manual financial amounts)
    gw_payload = {
        "name": "Custom Corporate SWIFT Wire",
        "currency_code": "USD",
        "gateway_note": "Bank: HDFC Bank Ltd\nAccount: 502000998877\nIFSC: HDFC0000123\nSWIFT: HDFCINBBXXX",
        "is_active": True,
    }
    create_res = await client.post("/api/v1/gateways", json=gw_payload)
    assert create_res.status_code == 201
    gw = create_res.json()
    gw_id = gw["id"]
    assert gw["name"] == "Custom Corporate SWIFT Wire"
    assert gw["currency_code"] == "USD"
    assert gw["total_incoming_amount"] == 0.0
    assert gw["total_equivalent_inr"] == 0.0
    assert gw["average_rate"] == 0.0
    assert "HDFC0000123" in gw["gateway_note"]
    assert gw["is_active"] is True

    # 4. Prevent duplicate gateway name
    dup_res = await client.post("/api/v1/gateways", json=gw_payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 5. Search gateway
    search_res = await client.get("/api/v1/gateways?q=Corporate")
    assert search_res.status_code == 200
    search_results = search_res.json()
    assert len(search_results) >= 1
    assert any(g["id"] == gw_id for g in search_results)

    # 6. Update gateway note
    updated_note = "Bank: HDFC Bank Ltd\nUpdated Instructions: Include invoice number in wire memo."
    update_res = await client.put(
        f"/api/v1/gateways/{gw_id}",
        json={"gateway_note": updated_note},
    )
    assert update_res.status_code == 200
    updated_gw = update_res.json()
    assert updated_gw["gateway_note"] == updated_note

    # 7. Toggle status
    toggle_res = await client.patch(f"/api/v1/gateways/{gw_id}/toggle-status")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    toggle_back = await client.patch(f"/api/v1/gateways/{gw_id}/toggle-status")
    assert toggle_back.status_code == 200
    assert toggle_back.json()["is_active"] is True

    # 8. Test deletion guard: create client & invoice assigned to this gateway
    from app.models.settings_models import Currency
    from conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        session.add(Currency(code="USD", symbol="$", name="US Dollar", is_base_currency=False, is_active=True))
        await session.commit()

    c_res = await client.post(
        "/api/v1/clients",
        json={
            "company_name": "Acme Holdings",
            "contact_person": "Jane Acme",
            "email": "jane@acme.com",
            "address_line1": "100 Market St",
            "city": "Dallas",
            "state": "Texas",
            "postal_code": "75001",
            "country": "United States",
            "currency_code": "USD",
        },
    )
    assert c_res.status_code == 201
    client_id = c_res.json()["id"]

    inv_res = await client.post(
        "/api/v1/invoices",
        json={
            "client_id": client_id,
            "payment_gateway": "Custom Corporate SWIFT Wire",
            "currency_code": "USD",
            "issue_date": "2026-09-26",
            "due_date": "2026-10-10",
            "items": [{"description": "Dev Ops", "quantity": 1, "unit_price": 500.0, "total": 500.0}],
            "subtotal": 500.0,
            "final_amount": 500.0,
        },
    )
    assert inv_res.status_code == 201
    inv_id = inv_res.json()["id"]

    # Attempt to delete gateway while assigned to invoice -> must fail with 409
    del_blocked = await client.delete(f"/api/v1/gateways/{gw_id}")
    assert del_blocked.status_code == 409
    assert "cannot be deleted because it is assigned to 1 invoice(s)" in del_blocked.json()["detail"]

    # Test Rename Cascade: Rename gateway from "Custom Corporate SWIFT Wire" -> "Renamed Global Wire"
    rename_res = await client.put(
        f"/api/v1/gateways/{gw_id}",
        json={"name": "Renamed Global Wire"},
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["name"] == "Renamed Global Wire"

    # Verify linked invoice automatically updated its payment_gateway to "Renamed Global Wire"
    inv_check = await client.get(f"/api/v1/invoices/{inv_id}")
    assert inv_check.status_code == 200
    assert inv_check.json()["payment_gateway"] == "Renamed Global Wire"

    # Delete invoice first
    await client.delete(f"/api/v1/invoices/{inv_id}")

    # Now deletion of gateway succeeds
    del_res = await client.delete(f"/api/v1/gateways/{gw_id}")
    assert del_res.status_code == 200

    # 9. Verify 404 after deletion
    get_del = await client.get(f"/api/v1/gateways/{gw_id}")
    assert get_del.status_code == 404
