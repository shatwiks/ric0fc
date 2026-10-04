from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.datasets import router as datasets_router
from app.routers.query import router as query_router
from app.routers.dashboards import router as dashboards_router
from app.routers.governance import router as governance_router
from app.routers.reports import router as reports_router
from app.routers.ai import router as ai_router
from app.routers.detective import router as detective_router
from app.routers.pulse import router as pulse_router

__all__ = [
    "auth_router",
    "health_router",
    "datasets_router",
    "query_router",
    "dashboards_router",
    "governance_router",
    "reports_router",
    "ai_router",
    "detective_router",
    "pulse_router",
]

