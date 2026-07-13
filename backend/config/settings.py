"""
Application settings using Pydantic Settings.
All configuration is driven by environment variables with sensible defaults.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "SellerOps AI"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False

    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "sqlite+aiosqlite:///./sellerops.db"

    # Groq / LLM
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"  # Groq Llama 3.3 70B
    groq_model_light: str = "llama-3.1-8b-instant"  # Lightweight Groq Llama 3.1 8B
    groq_cache_enabled: bool = True  # Enable in-memory prompt/response caching

    # Qdrant
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection_policies: str = "seller_policies"
    qdrant_collection_memory: str = "agent_memory"

    # Embedding
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384

    # Data paths
    mock_data_dir: str = "data/mock"
    policies_dir: str = "data/policies"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance. LRU cache ensures single instantiation."""
    return Settings()
