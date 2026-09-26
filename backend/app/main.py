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
