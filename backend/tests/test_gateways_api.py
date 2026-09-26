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

    # 2. List initial gateways
    list_init = await client.get("/api/v1/gateways")
    assert list_init.status_code == 200
    assert isinstance(list_init.json(), list)

    # 3. Create a new custom Gateway
    gw_payload = {
        "name": "Custom Corporate SWIFT Wire",
        "currency_code": "USD",
        "total_incoming_amount": 2000.0,
        "total_equivalent_inr": 173000.0,
        "average_rate": 0.0,  # Should auto-calculate to 86.5
        "gateway_note": "Bank: HDFC Bank Ltd\nAccount: 502000998877\nIFSC: HDFC0000123\nSWIFT: HDFCINBBXXX",
        "is_active": True,
    }
    create_res = await client.post("/api/v1/gateways", json=gw_payload)
    assert create_res.status_code == 201
    gw = create_res.json()
    gw_id = gw["id"]
    assert gw["name"] == "Custom Corporate SWIFT Wire"
    assert gw["currency_code"] == "USD"
    assert gw["average_rate"] == 86.5
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
        json={"gateway_note": updated_note, "total_incoming_amount": 2500.0},
    )
    assert update_res.status_code == 200
    updated_gw = update_res.json()
    assert updated_gw["gateway_note"] == updated_note
    assert updated_gw["total_incoming_amount"] == 2500.0

    # 7. Toggle status
    toggle_res = await client.patch(f"/api/v1/gateways/{gw_id}/toggle-status")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    toggle_back = await client.patch(f"/api/v1/gateways/{gw_id}/toggle-status")
    assert toggle_back.status_code == 200
    assert toggle_back.json()["is_active"] is True

    # 8. Delete gateway
    del_res = await client.delete(f"/api/v1/gateways/{gw_id}")
    assert del_res.status_code == 200

    # 9. Verify 404 after deletion
    get_del = await client.get(f"/api/v1/gateways/{gw_id}")
    assert get_del.status_code == 404
