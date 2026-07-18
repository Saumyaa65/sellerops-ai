"""
Embedder — wraps fastembed for creating embedding vectors.
Single point of control for the embedding model used across the system.
"""

from typing import List, TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from fastembed import TextEmbedding

from config.settings import get_settings
from utils.logger import logger

settings = get_settings()


import asyncio

class Embedder:
    _model: Optional["TextEmbedding"] = None

    def _get_model(self) -> "TextEmbedding":
        if Embedder._model is None:
            from fastembed import TextEmbedding
            logger.info(f"Loading embedding model (FastEmbed ONNX): {settings.embedding_model}")
            Embedder._model = TextEmbedding(model_name=settings.embedding_model)
        return Embedder._model

    async def embed(self, text: str) -> List[float]:
        """Embed a single text string. Returns a list of floats."""
        model = await asyncio.to_thread(self._get_model)
        # FastEmbed.embed takes an iterable and returns a generator
        generator = await asyncio.to_thread(model.embed, [text])
        embeddings = list(generator)
        return embeddings[0].tolist()

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple texts at once (more efficient than calling embed() in a loop)."""
        model = await asyncio.to_thread(self._get_model)
        generator = await asyncio.to_thread(model.embed, texts)
        embeddings = list(generator)
        return [v.tolist() for v in embeddings]
