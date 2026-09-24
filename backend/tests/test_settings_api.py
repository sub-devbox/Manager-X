import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_settings_lifecycle(client: AsyncClient):
    # Register and log in admin user to obtain authenticated cookie
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "admin@managerx.io",
                "password": "Password123#Secure!",
                "full_name": "Admin User",
            },
        )
        assert reg_res.status_code == 201

        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@managerx.io", "password": "Password123#Secure!"},
        )
        assert login_res.status_code == 200

        # 1. Company Profile
        prof_get = await client.get("/api/v1/settings/company")
        assert prof_get.status_code == 200
        assert prof_get.json()["name"] == ""

        prof_put = await client.put(
            "/api/v1/settings/company",
            json={
                "name": "Acme Ventures Pvt Ltd",
                "address": "123 Financial District, Bengaluru, KA 560001",
                "phone": "+91 9876543210",
                "pan": "ABCDE1234F",
                "gstin": "29ABCDE1234F1Z5",
                "email": "finance@acme.io",
                "website": "https://acme.io",
            },
        )
        assert prof_put.status_code == 200
        assert prof_put.json()["pan"] == "ABCDE1234F"
        assert prof_put.json()["name"] == "Acme Ventures Pvt Ltd"

        # 2. Theme & Accent Color
        theme_get = await client.get("/api/v1/settings/theme")
        assert theme_get.status_code == 200

        theme_put = await client.put(
            "/api/v1/settings/theme",
            json={"accent_color": "#10b981", "theme_mode": "dark"},
        )
        assert theme_put.status_code == 200
        assert theme_put.json()["accent_color"] == "#10b981"

        # 3. Currencies
        curr_res = await client.get("/api/v1/settings/currencies")
        assert curr_res.status_code == 200
        currencies = curr_res.json()
        assert len(currencies) >= 4  # Default INR, USD, EUR, GBP
        base = next(c for c in currencies if c["is_base_currency"])
        assert base["code"] == "INR"

        # Add JPY
        jpy_res = await client.post(
            "/api/v1/settings/currencies",
            json={
                "code": "jpy",
                "symbol": "¥",
                "name": "Japanese Yen",
                "is_base_currency": False,
            },
        )
        assert jpy_res.status_code == 201
        assert jpy_res.json()["code"] == "JPY"
        assert jpy_res.json()["symbol"] == "¥"

        # Update JPY (Edit currency)
        jpy_update = await client.put(
            "/api/v1/settings/currencies/JPY",
            json={
                "symbol": "JP¥",
                "name": "Japan Yen Updated",
            },
        )
        assert jpy_update.status_code == 200
        assert jpy_update.json()["symbol"] == "JP¥"
        assert jpy_update.json()["name"] == "Japan Yen Updated"

        # Prevent duplicate currency
        dup_res = await client.post(
            "/api/v1/settings/currencies",
            json={"code": "JPY", "symbol": "¥", "name": "Yen"},
        )
        assert dup_res.status_code == 409

        # Prevent deleting base currency
        del_base_res = await client.delete("/api/v1/settings/currencies/INR")
        assert del_base_res.status_code == 400

        # Delete non-base currency
        del_jpy = await client.delete("/api/v1/settings/currencies/JPY")
        assert del_jpy.status_code == 200

        # 4. Backup listing
        backups_res = await client.get("/api/v1/settings/backup/list")
        assert backups_res.status_code == 200
        assert isinstance(backups_res.json(), list)
