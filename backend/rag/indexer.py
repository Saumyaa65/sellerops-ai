"""
Indexer — chunks policy documents and indexes them into Qdrant.
Run once during initial setup or when policies are updated.
"""

import uuid
from pathlib import Path
from typing import List

from config.settings import get_settings
from rag.embedder import Embedder
from services.qdrant_service import qdrant_service
from utils.helpers import load_text_file
from utils.logger import logger

settings = get_settings()

CHUNK_SIZE = 500       # characters per chunk
CHUNK_OVERLAP = 100    # overlap between consecutive chunks


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


async def index_policies() -> None:
    """Read all policy files and index them into Qdrant."""
    policies_dir = Path(settings.policies_dir)
    embedder = Embedder()

    await qdrant_service.ensure_collection(
        settings.qdrant_collection_policies,
        settings.embedding_dimension,
    )

    for policy_file in policies_dir.glob("*.txt"):
        marketplace = policy_file.stem.replace("_policy", "")
        logger.info(f"Indexing policy: {policy_file.name} (marketplace={marketplace})")

        text = load_text_file(policy_file)
        chunks = _chunk_text(text)

        vectors = await embedder.embed_batch(chunks)

        points = [
            {
                "id": str(uuid.uuid4()),
                "vector": vector,
                "payload": {
                    "text": chunk,
                    "marketplace": marketplace,
                    "source": policy_file.name,
                    "chunk_index": i,
                },
            }
            for i, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]

        await qdrant_service.upsert(settings.qdrant_collection_policies, points)
        logger.info(f"Indexed {len(points)} chunks for {marketplace}")
