import pytest
from httpx import AsyncClient
from app.models.settings_models import Currency
from conftest import TestSessionLocal

@pytest.mark.asyncio
async def test_client_lifecycle_and_address_validation(client: AsyncClient):
    # 1. Setup Admin User & Authenticate
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
            "full_name": "Admin Executive",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
        },
    )
    assert login_res.status_code == 200

    # 2. Seed Base Currencies
    async with TestSessionLocal() as session:
        session.add_all([
            Currency(code="USD", symbol="$", name="US Dollar", is_base_currency=False, is_active=True),
            Currency(code="INR", symbol="₹", name="Indian Rupee", is_base_currency=True, is_active=True),
        ])
        await session.commit()

    # 3. Test Invalid Currency Rejection
    bad_curr_res = await client.post(
        "/api/v1/clients",
        json={
            "company_name": "Globex Corp",
            "contact_person": "Hank Scorpio",
            "email": "hank@globex.internal",
            "address_line1": "123 Terror Way",
            "city": "Cypress Creek",
            "state": "Oregon",
            "postal_code": "97401",
            "country": "United States",
            "currency_code": "UNKNOWN",
        },
    )
    assert bad_curr_res.status_code == 400
    assert "not supported" in bad_curr_res.json()["detail"]

    # 4. Create Client with complete structured address
    client_payload = {
        "company_name": "Acme Innovations Ltd",
        "contact_person": "Wile E. Coyote",
        "email": "coyote@acme.corp",
        "phone": "+1-555-0199",
        "tax_id": "US-EIN-9928374",
        "address_line1": "456 Desert Canyon Boulevard",
        "address_line2": "Suite 800, Tech Park",
        "city": "Phoenix",
        "state": "Arizona",
        "postal_code": "85001",
        "country": "United States",
        "hourly_rate": 150.0,
        "currency_code": "USD",
        "payment_terms_days": 30,
        "is_active": True,
    }
    create_res = await client.post("/api/v1/clients", json=client_payload)
    assert create_res.status_code == 201
    created_client = create_res.json()

    assert created_client["id"].startswith("cli_")
    assert created_client["company_name"] == "Acme Innovations Ltd"
    assert created_client["contact_person"] == "Wile E. Coyote"
    assert created_client["address_line1"] == "456 Desert Canyon Boulevard"
    assert created_client["address_line2"] == "Suite 800, Tech Park"
    assert created_client["city"] == "Phoenix"
    assert created_client["state"] == "Arizona"
    assert created_client["postal_code"] == "85001"
    assert created_client["country"] == "United States"
    assert created_client["hourly_rate"] == 150.0
    assert created_client["currency_code"] == "USD"
    assert created_client["payment_terms_days"] == 30
    assert created_client["is_active"] is True

    client_id = created_client["id"]

    # 5. Fetch Client by ID
    get_res = await client.get(f"/api/v1/clients/{client_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == client_id

    # 6. List and Search Clients
    list_res = await client.get("/api/v1/clients?q=Acme")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    empty_search = await client.get("/api/v1/clients?q=NonExistent")
    assert empty_search.status_code == 200
    assert len(empty_search.json()) == 0

    # 7. Update Client
    update_res = await client.put(
        f"/api/v1/clients/{client_id}",
        json={
            "hourly_rate": 175.5,
            "payment_terms_days": 15,
            "address_line2": "Suite 900",
        },
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["hourly_rate"] == 175.5
    assert updated_data["payment_terms_days"] == 15
    assert updated_data["address_line2"] == "Suite 900"
    assert updated_data["company_name"] == "Acme Innovations Ltd"  # Unchanged

    # 8. Toggle Active Status
    toggle_res = await client.patch(f"/api/v1/clients/{client_id}/toggle-status")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # Filter by is_active=true
    active_only_res = await client.get("/api/v1/clients?is_active=true")
    assert len(active_only_res.json()) == 0

    # Filter by is_active=false
    inactive_only_res = await client.get("/api/v1/clients?is_active=false")
    assert len(inactive_only_res.json()) == 1

    # Toggle back to active
    toggle_back = await client.patch(f"/api/v1/clients/{client_id}/toggle-status")
    assert toggle_back.json()["is_active"] is True

    # 9. Delete Client
    del_res = await client.delete(f"/api/v1/clients/{client_id}")
    assert del_res.status_code == 200

    # 10. Verify Deletion
    del_verify = await client.get(f"/api/v1/clients/{client_id}")
    assert del_verify.status_code == 404


@pytest.mark.asyncio
async def test_client_incoming_currency_and_equivalent_inr_auto_calc(client: AsyncClient):
    # 1. Register & Login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "revenue_mgr@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
            "full_name": "Revenue Manager",
        },
    )
    await client.post(
        "/api/v1/auth/login",
        json={
            "email": "revenue_mgr@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
        },
    )

    # 2. Ensure Currencies exist
    async with TestSessionLocal() as session:
        session.add_all([
            Currency(code="USD", symbol="$", name="US Dollar", is_base_currency=False, is_active=True),
            Currency(code="INR", symbol="₹", name="Indian Rupee", is_base_currency=True, is_active=True),
        ])
        await session.commit()

    # 3. Create Client
    c_res = await client.post(
        "/api/v1/clients",
        json={
            "company_name": "Stark Industries",
            "contact_person": "Tony Stark",
            "email": "tony@stark.com",
            "address_line1": "10880 Malibu Point",
            "city": "Malibu",
            "state": "California",
            "postal_code": "90265",
            "country": "United States",
            "hourly_rate": 200.0,
            "currency_code": "USD",
        },
    )
    assert c_res.status_code == 201
    client_data = c_res.json()
    c_id = client_data["id"]
    assert client_data["total_incoming_amount"] == 0.0
    assert client_data["total_equivalent_inr"] == 0.0

    # 4. Create an unpaid/draft invoice for this client
    inv1_res = await client.post(
        "/api/v1/invoices",
        json={
            "client_id": c_id,
            "issue_date": "2026-09-26",
            "due_date": "2026-10-10",
            "currency_code": "USD",
            "items": [
                {
                    "description": "Arc Reactor R&D",
                    "price": 1000.0,
                    "quantity": 1.0,
                    "unit_price": 1000.0,
                    "total": 1000.0,
                }
            ],
        },
    )
    assert inv1_res.status_code == 201
    inv1_id = inv1_res.json()["id"]

    # Verify client totals are still 0 (draft invoice doesn't count)
    get_c = await client.get(f"/api/v1/clients/{c_id}")
    assert get_c.status_code == 200
    assert get_c.json()["total_incoming_amount"] == 0.0
    assert get_c.json()["total_equivalent_inr"] == 0.0

    # 5. Mark inv1 as paid with received_amount_inr = 85000.0
    pay_res = await client.put(
        f"/api/v1/invoices/{inv1_id}",
        json={
            "status": "paid",
            "received_amount_inr": 85000.0,
            "payment_date": "2026-09-26",
        },
    )
    assert pay_res.status_code == 200

    # Verify client totals update automatically
    get_c2 = await client.get(f"/api/v1/clients/{c_id}")
    assert get_c2.status_code == 200
    assert get_c2.json()["total_incoming_amount"] == 1000.0
    assert get_c2.json()["total_equivalent_inr"] == 85000.0

    # 6. Add second paid invoice (final_amount = 500, received_amount_inr = 42500)
    inv2_res = await client.post(
        "/api/v1/invoices",
        json={
            "client_id": c_id,
            "issue_date": "2026-09-26",
            "due_date": "2026-10-10",
            "currency_code": "USD",
            "items": [
                {
                    "description": "Suit Upgrades",
                    "price": 500.0,
                    "quantity": 1.0,
                    "unit_price": 500.0,
                    "total": 500.0,
                }
            ],
        },
    )
    inv2_id = inv2_res.json()["id"]
    await client.put(
        f"/api/v1/invoices/{inv2_id}",
        json={
            "status": "paid",
            "received_amount_inr": 42500.0,
            "payment_date": "2026-09-26",
        },
    )

    # Verify both list_clients and get_client return aggregated totals:
    # Incoming: 1000 + 500 = 1500.0
    # Equivalent INR: 85000 + 42500 = 127500.0
    get_c3 = await client.get(f"/api/v1/clients/{c_id}")
    assert get_c3.json()["total_incoming_amount"] == 1500.0
    assert get_c3.json()["total_equivalent_inr"] == 127500.0

    list_all = await client.get("/api/v1/clients")
    assert list_all.status_code == 200
    matching = [x for x in list_all.json() if x["id"] == c_id]
    assert len(matching) == 1
    assert matching[0]["total_incoming_amount"] == 1500.0
    assert matching[0]["total_equivalent_inr"] == 127500.0
