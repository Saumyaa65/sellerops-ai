"""
Policy Retriever — semantic search over indexed marketplace policies.
"""

from typing import Any, Dict, List, Optional

from config.settings import get_settings
from rag.embedder import Embedder
from services.qdrant_service import qdrant_service
from utils.logger import logger

settings = get_settings()


class PolicyRetriever:
    def __init__(self) -> None:
        self._embedder = Embedder()

    async def retrieve(
        self,
        query: str,
        marketplace: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the most relevant policy chunks for a query.
        Optionally filter by marketplace (meesho, amazon, flipkart).
        """
        try:
            query_vector = await self._embedder.embed(query)
            filter_dict = {"marketplace": marketplace} if marketplace else None

            results = await qdrant_service.search(
                collection_name=settings.qdrant_collection_policies,
                query_vector=query_vector,
                top_k=top_k,
                filter_dict=filter_dict,
            )
            logger.debug(f"PolicyRetriever: {len(results)} results for '{query[:50]}'")
            return results

        except Exception as e:
            logger.warning(f"PolicyRetriever.retrieve failed: {e} — returning empty results")
            return []
