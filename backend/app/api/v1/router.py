from fastapi import APIRouter
from app.api.v1.endpoints import auth, settings, clients, projects, tasks, time_entries

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(settings.router)
api_router.include_router(clients.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(time_entries.router)

