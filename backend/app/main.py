from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router
# Import models to ensure they register on Base.metadata
import app.models.user_models  # noqa: F401
import app.models.settings_models  # noqa: F401
import app.models.client_model  # noqa: F401
import app.models.project_models  # noqa: F401
import app.models.invoice_model  # noqa: F401
import app.models.gateway_model  # noqa: F401

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def _migrate(sync_conn):
            cur = sync_conn.connection.cursor()
            cur.execute("PRAGMA table_info(tasks)")
            task_cols = [r[1] for r in cur.fetchall()]
            if task_cols and "checklist" not in task_cols:
                cur.execute("ALTER TABLE tasks ADD COLUMN checklist JSON DEFAULT '[]'")

            cur.execute("PRAGMA table_info(time_entries)")
            time_cols = [r[1] for r in cur.fetchall()]
            if time_cols and "invoice_id" not in time_cols:
                cur.execute("ALTER TABLE time_entries ADD COLUMN invoice_id VARCHAR(32) REFERENCES invoices(id) ON DELETE SET NULL")

            cur.execute("PRAGMA table_info(invoices)")
            inv_cols = [r[1] for r in cur.fetchall()]
            if inv_cols:
                if "received_amount_inr" not in inv_cols:
                    cur.execute("ALTER TABLE invoices ADD COLUMN received_amount_inr FLOAT")
                if "payment_date" not in inv_cols:
                    cur.execute("ALTER TABLE invoices ADD COLUMN payment_date VARCHAR(20)")
                if "is_reconciled" not in inv_cols:
                    cur.execute("ALTER TABLE invoices ADD COLUMN is_reconciled BOOLEAN DEFAULT 0")
                if "bank_transaction_id" not in inv_cols:
                    cur.execute("ALTER TABLE invoices ADD COLUMN bank_transaction_id VARCHAR(64)")

            # Seed default payment gateways if table is empty
            cur.execute("SELECT count(*) FROM payment_gateways")
            gw_count = cur.fetchone()[0]
            if gw_count == 0:
                defaults = [
                    (
                        "gw_razorpay",
                        "Razorpay",
                        "USD",
                        0.0,
                        0.0,
                        86.20,
                        "Remit payment via Razorpay Payment Link.\nInternational Cards & Wire supported.\nInclude Invoice number as payment reference.",
                        1,
                    ),
                    (
                        "gw_bank_wire",
                        "Direct Bank Wire",
                        "USD",
                        0.0,
                        0.0,
                        86.50,
                        "Bank: HDFC Bank Limited\nAccount Number: 50200088997766\nIFSC Code: HDFC0000123\nSWIFT / BIC: HDFCINBBXXX\nRemittance Reference: Invoice Number",
                        1,
                    ),
                    (
                        "gw_paypal",
                        "PayPal",
                        "USD",
                        0.0,
                        0.0,
                        83.80,
                        "Remit via PayPal checkout or transfer to: payments@agency.com\nPlease note: PayPal processing fees apply.\nInclude Invoice ID in note.",
                        1,
                    ),
                    (
                        "gw_wise",
                        "Wise",
                        "USD",
                        0.0,
                        0.0,
                        86.40,
                        "Direct foreign remittance via Wise (TransferWise).\nWise Account Email: finance@agency.com\nLower foreign exchange markup than retail wires.",
                        1,
                    ),
                    (
                        "gw_stripe",
                        "Stripe",
                        "USD",
                        0.0,
                        0.0,
                        85.90,
                        "Pay securely via Stripe hosted checkout.\nCards, Apple Pay, Google Pay accepted.\nImmediate settlement receipt provided.",
                        1,
                    ),
                ]
                cur.executemany(
                    """
                    INSERT INTO payment_gateways (
                        id, name, currency_code, total_incoming_amount, total_equivalent_inr, average_rate, gateway_note, is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """,
                    defaults,
                )

        await conn.run_sync(_migrate)
    yield
    # Shutdown connection pool
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# 1. Custom Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# 2. CORS configuration with credentials support
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 3. Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "SQLite (WAL)",
    }
