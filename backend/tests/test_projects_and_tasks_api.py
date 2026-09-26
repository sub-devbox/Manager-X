import pytest
from httpx import AsyncClient
from app.models.settings_models import Currency
from conftest import TestSessionLocal

@pytest.mark.asyncio
async def test_projects_and_tasks_lifecycle(client: AsyncClient):
    # 1. Register and log in admin user to obtain authenticated cookie
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pm_admin@managerx.io",
            "password": "Password123#Secure!",
            "full_name": "Project Manager Admin",
        },
    )
    assert reg_res.status_code == 201

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "pm_admin@managerx.io", "password": "Password123#Secure!"},
    )
    assert login_res.status_code == 200

    # Seed USD currency into test database
    async with TestSessionLocal() as session:
        session.add(Currency(code="USD", symbol="$", name="US Dollar", is_base_currency=True, is_active=True))
        await session.commit()

    # 2. Create Client
    client_res = await client.post(
        "/api/v1/clients",
        json={
            "company_name": "Acme Robotics Corp",
            "contact_person": "Jane Doe",
            "email": "jane@acmerobotics.com",
            "phone": "+1-555-0199",
            "tax_id": "US-EIN-9921",
            "address_line1": "100 Tech Way",
            "city": "San Francisco",
            "state": "CA",
            "postal_code": "94107",
            "country": "United States",
            "hourly_rate": 150.0,
            "currency_code": "USD",
            "payment_terms_days": 30,
            "is_active": True,
        },
    )
    assert client_res.status_code == 201
    client_data = client_res.json()
    client_id = client_data["id"]
    assert client_id.startswith("cli_")

    # 3. Create Project with Hourly Billing (Omit rate to test auto-inheritance)
    proj_res = await client.post(
        "/api/v1/projects",
        json={
            "client_id": client_id,
            "name": "Robotics Vision Platform",
            "description": "AI-powered optical inspection for manufacturing assembly.",
            "billing_type": "hourly",
            "status": "active",
            "start_date": "2026-10-01",
        },
    )
    assert proj_res.status_code == 201
    proj_data = proj_res.json()
    project_id = proj_data["id"]
    assert project_id.startswith("prj_")
    # Rate should have auto-inherited from client (150.0)
    assert proj_data["hourly_rate"] == 150.0
    assert proj_data["name"] == "Robotics Vision Platform"

    # 4. Create Tasks under the Project (including simple checklist)
    task1_res = await client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_id,
            "title": "Camera Calibration Module",
            "status": "backlog",
            "estimated_hours": 12.5,
            "checklist": [
                {"id": "chk_1", "text": "Collect checkerboard images", "completed": True},
                {"id": "chk_2", "text": "Compute intrinsic parameters", "completed": False},
            ],
        },
    )
    assert task1_res.status_code == 201
    task1_data = task1_res.json()
    task1_id = task1_data["id"]
    assert task1_id.startswith("tsk_")
    assert task1_data["status"] == "backlog"
    assert len(task1_data["checklist"]) == 2
    assert task1_data["checklist"][0]["completed"] is True
    assert task1_data["checklist"][1]["completed"] is False

    # Update task checklist
    task1_update = await client.put(
        f"/api/v1/tasks/{task1_id}",
        json={
            "checklist": [
                {"id": "chk_1", "text": "Collect checkerboard images", "completed": True},
                {"id": "chk_2", "text": "Compute intrinsic parameters", "completed": True},
                {"id": "chk_3", "text": "Export reprojection error report", "completed": False},
            ]
        },
    )
    assert task1_update.status_code == 200
    assert len(task1_update.json()["checklist"]) == 3
    assert task1_update.json()["checklist"][1]["completed"] is True

    task2_res = await client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_id,
            "title": "Edge Inference Engine",
            "status": "in_progress",
            "estimated_hours": 20.0,
        },
    )
    assert task2_res.status_code == 201
    task2_id = task2_res.json()["id"]

    # 5. Verify Project Metrics & Task Counts
    proj_get = await client.get(f"/api/v1/projects/{project_id}")
    assert proj_get.status_code == 200
    proj_detail = proj_get.json()
    assert proj_detail["task_count"] == 2
    assert proj_detail["active_task_count"] == 2
    assert proj_detail["completed_task_count"] == 0

    # 6. Kanban Transition: Move task 1 to in_progress, then done
    patch_res = await client.patch(
        f"/api/v1/tasks/{task1_id}/status",
        json={"status": "done"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "done"

    # Verify updated metrics on project
    proj_get2 = await client.get(f"/api/v1/projects/{project_id}")
    assert proj_get2.json()["completed_task_count"] == 1
    assert proj_get2.json()["active_task_count"] == 1

    # 7. Referential Deletion Invariant Checks:
    # A. Attempting to delete client should be BLOCKED because project exists
    del_client_fail = await client.delete(f"/api/v1/clients/{client_id}")
    assert del_client_fail.status_code in (400, 409)

    # B. Attempting to delete project should be BLOCKED because tasks exist
    del_proj_fail = await client.delete(f"/api/v1/projects/{project_id}")
    assert del_proj_fail.status_code == 400
    assert "contains 2 task(s)" in del_proj_fail.json()["detail"]

    # 8. Clean Deletion Cascade
    # Delete tasks
    del_t1 = await client.delete(f"/api/v1/tasks/{task1_id}")
    assert del_t1.status_code == 200
    del_t2 = await client.delete(f"/api/v1/tasks/{task2_id}")
    assert del_t2.status_code == 200

    # Now project has 0 tasks -> deletion succeeds
    del_proj = await client.delete(f"/api/v1/projects/{project_id}")
    assert del_proj.status_code == 200

    # Now client has 0 projects -> deletion succeeds
    del_client = await client.delete(f"/api/v1/clients/{client_id}")
    assert del_client.status_code == 200
