import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MYSQL_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:your_mysql_password@localhost:3306/library_db")
SQLITE_URL = os.getenv("SQLITE_URL", "sqlite:///./library.db")
FALLBACK_TO_SQLITE = os.getenv("FALLBACK_TO_SQLITE", "True").lower() in ("true", "1", "yes")

active_db_type = "UNKNOWN"
engine = None

def init_engine():
    global engine, active_db_type
    try:
        # First attempt: Try connecting to MySQL if configured
        if MYSQL_URL and "mysql" in MYSQL_URL:
            # Check if database exists or attempt connection
            logger.info(f"Attempting connection to MySQL: {MYSQL_URL.split('@')[-1] if '@' in MYSQL_URL else '...'}")
            test_engine = create_engine(MYSQL_URL, pool_pre_ping=True, echo=False)
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine = test_engine
            active_db_type = "MySQL 8.0"
            logger.info("Successfully connected to MySQL 8.0 database!")
            return engine
    except Exception as e:
        logger.warning(f"MySQL connection failed: {e}")
        if not FALLBACK_TO_SQLITE:
            raise e

    # Fallback attempt: SQLite
    if FALLBACK_TO_SQLITE:
        logger.info(f"Falling back to local SQLite database at {SQLITE_URL}")
        engine = create_engine(
            SQLITE_URL,
            connect_args={"check_same_thread": False},
            echo=False
        )
        active_db_type = "SQLite (Development Fallback)"
        return engine

    raise RuntimeError("No database connection available.")

engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_status():
    return {
        "database_type": active_db_type,
        "is_mysql": "MySQL" in active_db_type,
        "url_target": MYSQL_URL.split("@")[-1] if "@" in MYSQL_URL else "SQLite"
    }

