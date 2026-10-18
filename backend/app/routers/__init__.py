from .auth import router as auth_router
from .members import router as members_router
from .books import router as books_router
from .authors import router as authors_router
from .publishers import router as publishers_router
from .genres import router as genres_router
from .copies import router as copies_router
from .transactions import router as transactions_router
from .reservations import router as reservations_router
from .ratings import router as ratings_router
from .recommendations import router as recommendations_router
from .dashboard import router as dashboard_router
from .reports import router as reports_router
from .settings import router as settings_router

__all__ = [
    "auth_router", "members_router", "books_router", "authors_router",
    "publishers_router", "genres_router", "copies_router",
    "transactions_router", "reservations_router", "ratings_router",
    "recommendations_router", "dashboard_router", "reports_router", "settings_router"
]

