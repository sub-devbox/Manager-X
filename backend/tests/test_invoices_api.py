import pytest
from httpx import AsyncClient
from app.models.settings_models import Currency
from conftest import TestSessionLocal

@pytest.mark.asyncio
async def test_invoice_lifecycle_and_numbering(client: AsyncClient):
    # 1. Setup Admin User & Authenticate
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "invoicer@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
            "full_name": "Billing Manager",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "invoicer@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
        },
    )
    assert login_res.status_code == 200

    # 2. Seed Base Currencies
    async with TestSessionLocal() as session:
        session.add_all([
            Currency(code="USD", symbol="$", name="US Dollar", is_base_currency=False, is_active=True),
        ])
        await session.commit()

    # 3. Create Client: "American Dreams LLC" -> Initials "ADL"
    client_res = await client.post(
        "/api/v1/clients",
        json={
            "company_name": "American Dreams LLC",
            "contact_person": "John Doe",
            "email": "john@americandreams.com",
            "address_line1": "742 Evergreen Terrace",
            "city": "Springfield",
            "state": "Oregon",
            "postal_code": "97477",
            "country": "United States",
            "hourly_rate": 100.0,
            "currency_code": "USD",
            "payment_terms_days": 15,
        },
    )
    assert client_res.status_code == 201
    client_id = client_res.json()["id"]

    # 4. Test Next Number calculation: Should be INV-2026-09-ADL.1
    next_num_res = await client.get(
        f"/api/v1/invoices/next-number?client_id={client_id}&issue_date=2026-09-26"
    )
    assert next_num_res.status_code == 200
    assert next_num_res.json()["invoice_number"] == "INV-2026-09-ADL.1"

    # 5. Create First Invoice
    inv_payload = {
        "client_id": client_id,
        "issue_date": "2026-09-26",
        "due_date": "2026-10-11",
        "payment_gateway": "Razorpay",
        "currency_code": "USD",
        "discount_type": "fixed",
        "discount_value": 50.0,
        "round_off": 0.0,
        "gateway_notes": "Pay via Razorpay Link or SWIFT transfer.",
        "items": [
            {
                "description": "Full Stack System Architecture",
                "hsn_sac": "998311",
                "price": 100.0,
                "quantity": 10.0,
                "unit_price": 100.0,
                "total": 1000.0,
            }
        ],
    }
    create_inv = await client.post("/api/v1/invoices", json=inv_payload)
    assert create_inv.status_code == 201
    inv_data = create_inv.json()

    assert inv_data["invoice_number"] == "INV-2026-09-ADL.1"
    assert inv_data["subtotal"] == 1000.0
    assert inv_data["discount_amount"] == 50.0
    assert inv_data["final_amount"] == 950.0
    assert len(inv_data["items"]) == 1

    inv_id = inv_data["id"]

    # 6. Verify Next Number Increments to .2
    next_num_res_2 = await client.get(
        f"/api/v1/invoices/next-number?client_id={client_id}&issue_date=2026-09-26"
    )
    assert next_num_res_2.status_code == 200
    assert next_num_res_2.json()["invoice_number"] == "INV-2026-09-ADL.2"

    # 7. Update Invoice Status to Paid
    update_res = await client.put(
        f"/api/v1/invoices/{inv_id}",
        json={"status": "paid"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "paid"

    # 8. List Invoices
    list_res = await client.get("/api/v1/invoices")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 9. Test ReportLab PDF Download Endpoint
    pdf_res = await client.get(f"/api/v1/invoices/{inv_id}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert "INV-2026-09-ADL.1.pdf" in pdf_res.headers.get("content-disposition", "")
    assert pdf_res.content.startswith(b"%PDF")
    assert len(pdf_res.content) > 1000

    # 10. Test Custom On-The-Fly ReportLab PDF Render Endpoint
    custom_render_res = await client.post(
        "/api/v1/invoices/render-pdf",
        json={
            "invoice_number": "INV-2026-09-CUSTOM.1",
            "client_id": client_id,
            "currency_code": "USD",
            "items": [
                {"description": "Design Audit", "quantity": 1, "unit_price": 400.0, "total": 400.0}
            ],
            "subtotal": 400.0,
            "final_amount": 400.0,
        },
    )
    assert custom_render_res.status_code == 200
    assert custom_render_res.headers["content-type"] == "application/pdf"
    assert custom_render_res.content.startswith(b"%PDF")

    # 11. Delete Invoice
    del_res = await client.delete(f"/api/v1/invoices/{inv_id}")
    assert del_res.status_code == 200

    # 12. Verify Deletion
    del_check = await client.get(f"/api/v1/invoices/{inv_id}")
    assert del_check.status_code == 404
