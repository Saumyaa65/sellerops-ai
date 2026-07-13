"""
Qdrant vector database service.
Handles collection management, upsert, and semantic search operations.
"""

from typing import Any, Dict, List, Optional

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    Filter,
    FieldCondition,
    MatchValue,
    PointStruct,
    VectorParams,
)

from config.settings import get_settings
from utils.logger import logger

settings = get_settings()


class QdrantService:
    def __init__(self) -> None:
        self._client: Optional[AsyncQdrantClient] = None

    @property
    def client(self) -> AsyncQdrantClient:
        if self._client is None:
            self._client = AsyncQdrantClient(
                url=settings.qdrant_url,
                api_key=settings.qdrant_api_key,
            )
        return self._client

    async def ensure_collection(self, collection_name: str, dimension: int) -> None:
        """Create collection if it does not already exist."""
        existing = await self.client.get_collections()
        names = [c.name for c in existing.collections]
        if collection_name not in names:
            await self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=dimension,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Created Qdrant collection: {collection_name}")
            try:
                await self.client.create_payload_index(
                    collection_name=collection_name,
                    field_name="marketplace",
                    field_schema="keyword",
                )
                logger.info(f"Created payload index for 'marketplace' in collection {collection_name}")
            except Exception as e:
                logger.warning(f"Failed to create payload index: {e}")


    async def upsert(
        self,
        collection_name: str,
        points: List[Dict[str, Any]],
    ) -> None:
        """Upsert a list of points. Each dict must have 'id', 'vector', 'payload'."""
        structs = [
            PointStruct(id=p["id"], vector=p["vector"], payload=p["payload"])
            for p in points
        ]
        await self.client.upsert(collection_name=collection_name, points=structs)
        logger.debug(f"Upserted {len(structs)} points into {collection_name}")

    async def search(
        self,
        collection_name: str,
        query_vector: List[float],
        top_k: int = 5,
        filter_dict: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        """Semantic search with optional metadata filtering."""
        query_filter = None
        if filter_dict:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filter_dict.items()
            ]
            query_filter = Filter(must=conditions)

        results = await self.client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=top_k,
            query_filter=query_filter,
            with_payload=True,
        )
        return [{"score": r.score, "payload": r.payload} for r in results]

    async def health_check(self) -> bool:
        """Verify Qdrant connectivity."""
        try:
            await self.client.get_collections()
            return True
        except Exception as e:
            logger.warning(f"Qdrant health check failed: {e}")
            return False


qdrant_service = QdrantService()
