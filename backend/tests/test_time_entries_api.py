import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from app.models.settings_models import Currency
from conftest import TestSessionLocal

@pytest.mark.asyncio
async def test_time_entries_lifecycle_and_task_tracking(client: AsyncClient):
    # 1. Register & login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "tracker_user@managerx.io",
            "password": "Password123#Secure!",
            "full_name": "Time Tracker Tester",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "tracker_user@managerx.io", "password": "Password123#Secure!"},
    )
    assert login_res.status_code == 200

    # Seed USD
    async with TestSessionLocal() as session:
        session.add(Currency(code="USD", symbol="$", name="US Dollar", is_base_currency=True, is_active=True))
        await session.commit()

    # 2. Create Client
    client_res = await client.post(
        "/api/v1/clients",
        json={
            "company_name": "Apex Innovations",
            "contact_person": "Sarah Connor",
            "email": "sarah@apex.io",
            "phone": "+1-555-0199",
            "tax_id": "US-EIN-9921",
            "address_line1": "100 Tech Way",
            "city": "San Francisco",
            "state": "CA",
            "postal_code": "94107",
            "country": "United States",
            "hourly_rate": 120.0,
            "currency_code": "USD",
            "payment_terms_days": 30,
            "is_active": True,
        },
    )
    assert client_res.status_code == 201
    client_id = client_res.json()["id"]

    # 3. Create Project
    proj_res = await client.post(
        "/api/v1/projects",
        json={
            "client_id": client_id,
            "name": "Cloud Migration",
            "billing_type": "hourly",
            "hourly_rate": 150.0,
        },
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 4. Create Task in backlog
    task_res = await client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_id,
            "title": "Configure VPC Peering",
            "status": "backlog",
            "priority": "high",
            "estimated_hours": 4.0,
        },
    )
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # 5. Create Time Entry with start and stop (duration calculated automatically)
    start_time = datetime(2026, 9, 26, 9, 0, 0, tzinfo=timezone.utc)
    end_time = datetime(2026, 9, 26, 11, 0, 0, tzinfo=timezone.utc)

    entry_res = await client.post(
        "/api/v1/time-entries",
        json={
            "task_id": task_id,
            "description": "Configured AWS-GCP peering mesh and routing tables",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_seconds": 0,  # Auto-calculate: 11:00 - 09:00 = 7200 seconds
            "is_billable": True,
        },
    )
    assert entry_res.status_code == 201
    entry_data = entry_res.json()
    entry_id = entry_data["id"]

    assert entry_id.startswith("tim_")
    assert entry_data["task_id"] == task_id
    assert entry_data["project_id"] == project_id
    assert entry_data["duration_seconds"] == 7200  # Calculated: stop - start = 2 hours
    assert entry_data["hourly_rate"] == 150.0  # Auto-inherited from project
    assert entry_data["billable_amount"] == 300.0  # 2 hrs * $150
    assert entry_data["task_title"] == "Configure VPC Peering"
    assert entry_data["project_name"] == "Cloud Migration"
    assert entry_data["client_name"] == "Apex Innovations"

    # 5b. Manual Entry: time stop = time start + manual time
    manual_start = datetime(2026, 9, 26, 14, 0, 0, tzinfo=timezone.utc)
    manual_duration = 5400  # 1.5 hours
    manual_res = await client.post(
        "/api/v1/time-entries",
        json={
            "task_id": task_id,
            "description": "Manual entry: documentation update",
            "start_time": manual_start.isoformat(),
            "duration_seconds": manual_duration,
            "is_billable": True,
        },
    )
    assert manual_res.status_code == 201
    manual_data = manual_res.json()
    assert manual_data["duration_seconds"] == 5400
    expected_stop = manual_start + timedelta(seconds=manual_duration)
    assert manual_data["end_time"] is not None
    # Parse returned end_time and verify it matches start + manual duration
    actual_stop = datetime.fromisoformat(manual_data["end_time"])
    if actual_stop.tzinfo is None:
        actual_stop = actual_stop.replace(tzinfo=timezone.utc)
    assert actual_stop == expected_stop

    # Clean up manual entry so subsequent tests continue with single entry
    await client.delete(f"/api/v1/time-entries/{manual_data['id']}")

    # Verify task auto-transitioned from backlog to in_progress
    get_task_res = await client.get(f"/api/v1/tasks/{task_id}")
    assert get_task_res.status_code == 200
    assert get_task_res.json()["status"] == "in_progress"

    # 6. List Time Entries
    list_res = await client.get(f"/api/v1/time-entries?task_id={task_id}")
    assert list_res.status_code == 200
    entries = list_res.json()
    assert len(entries) == 1
    assert entries[0]["id"] == entry_id

    # 7. Update Time Entry notes & duration
    patch_res = await client.patch(
        f"/api/v1/time-entries/{entry_id}",
        json={
            "description": "Updated notes: VPC peering configured and tested",
            "duration_seconds": 9000,  # 2.5 hours
        },
    )
    assert patch_res.status_code == 200
    updated_data = patch_res.json()
    assert updated_data["duration_seconds"] == 9000
    assert updated_data["billable_amount"] == 375.0  # 2.5 hrs * $150

    # 7b. Update with is_billable=None should ignore null and preserve existing value
    patch_null_res = await client.patch(
        f"/api/v1/time-entries/{entry_id}",
        json={"is_billable": None, "duration_seconds": 7200},
    )
    assert patch_null_res.status_code == 200
    assert patch_null_res.json()["is_billable"] is True
    assert patch_null_res.json()["duration_seconds"] == 7200

    # 8. Referential integrity: Cannot delete task while time entries exist
    del_task_res = await client.delete(f"/api/v1/tasks/{task_id}")
    assert del_task_res.status_code == 400
    assert "time entries are recorded against it" in del_task_res.json()["detail"]

    # 9. Invoiced protection: Lock when invoiced
    lock_res = await client.patch(
        f"/api/v1/time-entries/{entry_id}",
        json={"invoiced": True},
    )
    assert lock_res.status_code == 200

    # Cannot delete invoiced entry
    del_invoiced_res = await client.delete(f"/api/v1/time-entries/{entry_id}")
    assert del_invoiced_res.status_code == 409

    # Unlock entry and delete
    unlock_res = await client.patch(
        f"/api/v1/time-entries/{entry_id}",
        json={"invoiced": False},
    )
    assert unlock_res.status_code == 200

    del_entry_res = await client.delete(f"/api/v1/time-entries/{entry_id}")
    assert del_entry_res.status_code == 204

    # Now task can be deleted
    del_task_ok = await client.delete(f"/api/v1/tasks/{task_id}")
    assert del_task_ok.status_code == 200
