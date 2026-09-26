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
