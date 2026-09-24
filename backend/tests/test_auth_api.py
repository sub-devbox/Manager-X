import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.user_models import User
from conftest import TestSessionLocal

@pytest.mark.asyncio
async def test_full_security_and_auth_lifecycle(client: AsyncClient):
        # 1. Verify Security Headers Middleware on all responses
        health_res = await client.get("/health")
        assert health_res.status_code == 200
        assert health_res.headers.get("x-content-type-options") == "nosniff"
        assert health_res.headers.get("x-frame-options") == "DENY"
        assert "mode=block" in health_res.headers.get("x-xss-protection", "")

        # 2. Check initial auth status (0 users)
        status_res = await client.get("/api/v1/auth/status")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["initialized"] is False
        assert status_data["allow_registration"] is True

        # 3. Test weak password registration rejection (OWASP rule enforcement)
        weak_reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "admin@managerx.com",
                "password": "weak",
                "full_name": "Admin User",
            },
        )
        assert weak_reg_res.status_code == 422

        # 4. Test valid administrator registration
        valid_password = "Str0ngAdminP@ssw0rd!2026"
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "admin@managerx.com",
                "password": valid_password,
                "full_name": "Admin User",
            },
        )
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert reg_data["email"] == "admin@managerx.com"
        assert reg_data["is_superuser"] is True

        # 5. Prevent second registration (system locked to existing admin only)
        second_reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "attacker@managerx.com",
                "password": "AnotherStr0ngP@ss123!",
                "full_name": "Attacker",
            },
        )
        assert second_reg_res.status_code == 403

        # 6. Test login failure with invalid password & attempts remaining
        wrong_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@managerx.com", "password": "WrongPassword123!"},
        )
        assert wrong_res.status_code == 401
        assert "attempt(s) remaining" in wrong_res.json()["detail"]

        # 7. Test Brute-Force lockout after 5 consecutive failures
        # Attempt 2, 3, 4
        for _ in range(3):
            res = await client.post(
                "/api/v1/auth/login",
                json={"email": "admin@managerx.com", "password": "WrongPassword123!"},
            )
            assert res.status_code == 401

        # Attempt 5 -> triggers account lockout
        lockout_trigger_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@managerx.com", "password": "WrongPassword123!"},
        )
        assert lockout_trigger_res.status_code == 423
        assert "Account locked" in lockout_trigger_res.json()["detail"]

        # Attempt 6 with CORRECT password during lockout -> MUST BE REJECTED
        locked_valid_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@managerx.com", "password": valid_password},
        )
        assert locked_valid_res.status_code == 423

        # 8. Reset lockout manually in database to test successful login & session revocation
        async with TestSessionLocal() as session:
            stmt = select(User).where(User.email == "admin@managerx.com")
            user_obj = (await session.execute(stmt)).scalar_one()
            user_obj.locked_until = None
            user_obj.failed_login_attempts = 0
            await session.commit()

        # 9. Successful login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@managerx.com", "password": valid_password},
        )
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        token = token_data["access_token"]
        assert "manager_x_access_token" in login_res.cookies

        # 10. Verify /me endpoint with Bearer token
        me_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "admin@managerx.com"

        # 11. Test Logout and Session Revocation
        logout_res = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert logout_res.status_code == 200

        # 12. Token must now be rejected because session is revoked in database
        me_after_logout = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_after_logout.status_code == 401
        assert "revoked" in me_after_logout.json()["detail"]
