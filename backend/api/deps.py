"""Shared FastAPI dependency providers."""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from models.database import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session, closing it after the request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
