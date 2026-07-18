"""
SQLAlchemy async engine and session factory.
Uses aiosqlite for prototype; swap DATABASE_URL for PostgreSQL in production.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import event

from config.settings import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args={"check_same_thread": False},  # SQLite-specific
)

# Set SQLite Pragmas dynamically for high concurrency (WAL Mode & Normal Sync)
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in settings.database_url.lower():
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def init_db() -> None:
    """Create all tables on startup."""
    from models.base import Base
    import asyncio
    from seed import run_seed

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Auto-seed the database if it is empty
    await asyncio.to_thread(run_seed)


async def close_db() -> None:
    """Dispose engine on shutdown."""
    await engine.dispose()
