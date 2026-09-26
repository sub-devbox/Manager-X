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

@pytest.mark.asyncio
async def test_unbilled_tasks_aggregation_and_sync(client: AsyncClient):
    # Setup Admin User & Authenticate
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "tester_sync@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
            "full_name": "Sync Tester",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "tester_sync@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
        },
    )
    assert login_res.status_code == 200

    # Seed Base Currencies
    async with TestSessionLocal() as session:
        session.add_all([
            Currency(code="USD", symbol="$", name="US Dollar", is_base_currency=False, is_active=True),
        ])
        await session.commit()

    # Setup Client 1 & Client 2
    c1_res = await client.post(
        "/api/v1/clients",
        json={
            "company_name": "Client One Corp",
            "contact_person": "Person One",
            "email": "c1@testcorp.com",
            "address_line1": "100 Alpha St",
            "city": "Springfield",
            "state": "Oregon",
            "postal_code": "97477",
            "country": "United States",
            "currency_code": "USD",
            "hourly_rate": 50.0,
        },
    )
    assert c1_res.status_code == 201
    c1_id = c1_res.json()["id"]

    c2_res = await client.post(
        "/api/v1/clients",
        json={
            "company_name": "Client Two Corp",
            "contact_person": "Person Two",
            "email": "c2@testcorp.com",
            "address_line1": "200 Beta St",
            "city": "Springfield",
            "state": "Oregon",
            "postal_code": "97477",
            "country": "United States",
            "currency_code": "USD",
            "hourly_rate": 60.0,
        },
    )
    assert c2_res.status_code == 201
    c2_id = c2_res.json()["id"]

    # Setup Project 1 (Client 1) and Project 2 (Client 2)
    p1_res = await client.post(
        "/api/v1/projects",
        json={"name": "Project 1", "client_id": c1_id, "hourly_rate": 50.0},
    )
    p1_id = p1_res.json()["id"]

    p2_res = await client.post(
        "/api/v1/projects",
        json={"name": "Project 2", "client_id": c2_id, "hourly_rate": 60.0},
    )
    p2_id = p2_res.json()["id"]

    # Setup Task 1 (Project 1) and Task 2 (Project 2)
    t1_res = await client.post(
        "/api/v1/tasks",
        json={"title": "Task 1", "project_id": p1_id},
    )
    t1_id = t1_res.json()["id"]

    t2_res = await client.post(
        "/api/v1/tasks",
        json={"title": "Task 2", "project_id": p2_id},
    )
    t2_id = t2_res.json()["id"]

    # Time logs for Client 1, Task 1:
    # 1. 0.5 hr - Paid (invoiced=True)
    te_paid_res = await client.post(
        "/api/v1/time-entries",
        json={
            "task_id": t1_id,
            "start_time": "2026-09-01T10:00:00Z",
            "end_time": "2026-09-01T10:30:00Z",
            "duration_seconds": 1800,
            "is_billable": True,
        },
    )
    te_paid_id = te_paid_res.json()["id"]
    # Mark te_paid as invoiced directly
    await client.put(f"/api/v1/time-entries/{te_paid_id}", json={"invoiced": True})

    # 2. 0.5 hr - Due
    te_due1_res = await client.post(
        "/api/v1/time-entries",
        json={
            "task_id": t1_id,
            "start_time": "2026-09-01T11:00:00Z",
            "end_time": "2026-09-01T11:30:00Z",
            "duration_seconds": 1800,
            "is_billable": True,
        },
    )
    te_due1_id = te_due1_res.json()["id"]

    # 3. 1.5 hr - Due
    te_due2_res = await client.post(
        "/api/v1/time-entries",
        json={
            "task_id": t1_id,
            "start_time": "2026-09-02T09:00:00Z",
            "end_time": "2026-09-02T10:30:00Z",
            "duration_seconds": 5400,
            "is_billable": True,
        },
    )
    te_due2_id = te_due2_res.json()["id"]

    # Time log for Client 2, Task 2: 3.0 hr - Due
    te_c2_res = await client.post(
        "/api/v1/time-entries",
        json={
            "task_id": t2_id,
            "start_time": "2026-09-02T12:00:00Z",
            "end_time": "2026-09-02T15:00:00Z",
            "duration_seconds": 10800,
            "is_billable": True,
        },
    )
    te_c2_id = te_c2_res.json()["id"]

    # Assert get_unbilled_tasks for Client 1 sums ONLY Due hours (1800 + 5400 = 7200s = 2.0h)
    unbilled_c1 = await client.get(f"/api/v1/invoices/unbilled-tasks?client_id={c1_id}")
    assert unbilled_c1.status_code == 200
    c1_tasks = unbilled_c1.json()
    assert len(c1_tasks) == 1
    assert c1_tasks[0]["id"] == t1_id
    assert c1_tasks[0]["time_spent_seconds"] == 7200  # Exactly 2.0 hr!

    # Assert get_unbilled_tasks for Client 2 has 10800s (3.0h)
    unbilled_c2 = await client.get(f"/api/v1/invoices/unbilled-tasks?client_id={c2_id}")
    assert unbilled_c2.status_code == 200
    c2_tasks = unbilled_c2.json()
    assert len(c2_tasks) == 1
    assert c2_tasks[0]["id"] == t2_id
    assert c2_tasks[0]["time_spent_seconds"] == 10800

    # Create Draft Invoice for Client 1 with Task 1 (qty: 2.0 hr)
    inv_c1 = await client.post(
        "/api/v1/invoices",
        json={
            "client_id": c1_id,
            "status": "draft",
            "issue_date": "2026-09-26",
            "due_date": "2026-10-11",
            "items": [
                {
                    "task_id": t1_id,
                    "description": "[Project 1] Task 1",
                    "quantity": 2.0,
                    "unit_price": 50.0,
                    "price": 50.0,
                    "total": 100.0,
                }
            ],
        },
    )
    assert inv_c1.status_code == 201
    draft_inv_id = inv_c1.json()["id"]

    # Verify time entries invoice_status is now "draft" for due entries, and still "paid" for the paid entry
    te_paid_check = await client.get(f"/api/v1/time-entries/{te_paid_id}")
    assert te_paid_check.json()["invoice_status"] == "paid"

    te_due1_check = await client.get(f"/api/v1/time-entries/{te_due1_id}")
    assert te_due1_check.json()["invoice_status"] == "draft"
    assert te_due1_check.json()["invoice_id"] == draft_inv_id

    te_due2_check = await client.get(f"/api/v1/time-entries/{te_due2_id}")
    assert te_due2_check.json()["invoice_status"] == "draft"

    # Now update invoice status to "paid"
    await client.put(f"/api/v1/invoices/{draft_inv_id}", json={"status": "paid"})
    te_due1_paid_check = await client.get(f"/api/v1/time-entries/{te_due1_id}")
    assert te_due1_paid_check.json()["invoice_status"] == "paid"
    assert te_due1_paid_check.json()["invoiced"] is True

    # Delete invoice and verify time entries revert to "due"
    await client.delete(f"/api/v1/invoices/{draft_inv_id}")
    te_due1_revert = await client.get(f"/api/v1/time-entries/{te_due1_id}")
    assert te_due1_revert.json()["invoice_status"] == "due"
    assert te_due1_revert.json()["invoiced"] is False
    assert te_due1_revert.json()["invoice_id"] is None


@pytest.mark.asyncio
async def test_invoice_payment_and_reconciliation(client: AsyncClient):
    # Setup & Login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pay_reconcile@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
            "full_name": "Pay Reconcile User",
        },
    )
    await client.post(
        "/api/v1/auth/login",
        json={
            "email": "pay_reconcile@managerx.com",
            "password": "Str0ngAdminP@ssw0rd!2026",
        },
    )

    # Seed Currencies
    async with TestSessionLocal() as session:
        session.add_all([
            Currency(code="USD", symbol="$", name="US Dollar", is_base_currency=False, is_active=True),
            Currency(code="EUR", symbol="€", name="Euro", is_base_currency=False, is_active=True),
        ])
        await session.commit()

    # Create client
    c_res = await client.post(
        "/api/v1/clients",
        json={
            "company_name": "Nordic Solutions OY",
            "contact_person": "Lars Lindqvist",
            "email": "lars@nordicsolutions.fi",
            "address_line1": "Mannerheimintie 12",
            "city": "Helsinki",
            "state": "Uusimaa",
            "postal_code": "00100",
            "country": "Finland",
            "hourly_rate": 80.0,
            "currency_code": "USD",
            "payment_terms_days": 15,
        },
    )
    assert c_res.status_code == 201
    client_id = c_res.json()["id"]

    # Create Invoice in EUR
    inv_res = await client.post(
        "/api/v1/invoices",
        json={
            "client_id": client_id,
            "status": "sent",
            "currency_code": "EUR",
            "issue_date": "2026-09-26",
            "due_date": "2026-10-10",
            "items": [
                {
                    "description": "Backend System Migration",
                    "quantity": 10.0,
                    "unit_price": 80.0,
                    "total": 800.0,
                }
            ],
            "subtotal": 800.0,
            "final_amount": 800.0,
        },
    )
    assert inv_res.status_code == 201
    inv = inv_res.json()
    inv_id = inv["id"]
    assert inv["status"] == "sent"
    assert inv["is_reconciled"] is False
    assert inv["received_amount_inr"] is None

    # Test POST /api/v1/invoices/{id}/pay
    pay_res = await client.post(
        f"/api/v1/invoices/{inv_id}/pay",
        json={
            "received_amount_inr": 72450.50,
            "payment_date": "2026-09-27",
            "bank_reference": "HDFC-WIRE-EUR-9988",
        },
    )
    assert pay_res.status_code == 200
    paid_inv = pay_res.json()
    assert paid_inv["status"] == "paid"
    assert paid_inv["received_amount_inr"] == 72450.50
    assert paid_inv["payment_date"] == "2026-09-27"
    assert "HDFC-WIRE-EUR-9988" in (paid_inv["gateway_notes"] or "")

    # Test POST /api/v1/invoices/{id}/reconcile
    rec_res = await client.post(
        f"/api/v1/invoices/{inv_id}/reconcile",
        json={
            "bank_transaction_id": "TXN_BANK_FEED_445566",
            "payment_date": "2026-09-27",
        },
    )
    assert rec_res.status_code == 200
    rec_inv = rec_res.json()
    assert rec_inv["is_reconciled"] is True
    assert rec_inv["bank_transaction_id"] == "TXN_BANK_FEED_445566"
    assert rec_inv["payment_date"] == "2026-09-27"

    # Test ReportLab PDF Download with PAID stamp and INR received row
    pdf_res = await client.get(f"/api/v1/invoices/{inv_id}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")

