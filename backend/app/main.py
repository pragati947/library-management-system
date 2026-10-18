import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database.init_db import init_all
from .database.connection import get_db_status
from .routers import (
    auth_router,
    members_router,
    books_router,
    authors_router,
    publishers_router,
    genres_router,
    copies_router,
    transactions_router,
    reservations_router,
    ratings_router,
    recommendations_router,
    dashboard_router,
    reports_router,
    settings_router
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("library_system")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables and sample data exist
    logger.info("Initializing application database and seed dataset...")
    try:
        init_all()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
    yield
    # Shutdown
    logger.info("Application shutting down.")

app = FastAPI(
    title="Intelligent & Personalized Library Management System",
    description="""
    ## College DBMS Project Backend API
    Designed for single-operator Librarian / Admin control with an **Intelligent & Personalized Recommendation Engine**.
    
    ### Key Features:
    * **Librarian Auth & JWT Security**: Protected administrative endpoints.
    * **Personalized Recommendations**: Deterministic multi-factor algorithm incorporating member genres, borrow history, author affinities, ratings, reservations, and copy availability.
    * **Real Database Analytics**: Aggregations via GROUP BY, HAVING, subqueries, and SQL views.
    * **Relational Schema**: 3NF normalized MySQL database with transaction auditing.
    """,
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development allow all local frontend ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Routers
app.include_router(auth_router)
app.include_router(members_router)
app.include_router(books_router)
app.include_router(authors_router)
app.include_router(publishers_router)
app.include_router(genres_router)
app.include_router(copies_router)
app.include_router(transactions_router)
app.include_router(reservations_router)
app.include_router(ratings_router)
app.include_router(recommendations_router)
app.include_router(dashboard_router)
app.include_router(reports_router)
app.include_router(settings_router)

@app.get("/", tags=["System Status"])
def root():
    return {
        "title": "Intelligent & Personalized Library Management System",
        "status": "Online",
        "docs_url": "/docs",
        "database": get_db_status()
    }

