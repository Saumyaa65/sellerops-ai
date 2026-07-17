"""
SQLAlchemy async engine and session factory.
Uses aiosqlite for prototype; swap DATABASE_URL for PostgreSQL in production.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config.settings import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args={"check_same_thread": False},  # SQLite-specific
)

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
