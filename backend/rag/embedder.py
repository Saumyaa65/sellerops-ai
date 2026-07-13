"""
Embedder — wraps sentence-transformers for creating embedding vectors.
Single point of control for the embedding model used across the system.
"""

from typing import List

from sentence_transformers import SentenceTransformer

from config.settings import get_settings
from utils.logger import logger

settings = get_settings()


class Embedder:
    _model: SentenceTransformer | None = None

    def _get_model(self) -> SentenceTransformer:
        if Embedder._model is None:
            logger.info(f"Loading embedding model: {settings.embedding_model}")
            Embedder._model = SentenceTransformer(settings.embedding_model)
        return Embedder._model

    async def embed(self, text: str) -> List[float]:
        """Embed a single text string. Returns a list of floats."""
        model = self._get_model()
        vector = model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple texts at once (more efficient than calling embed() in a loop)."""
        model = self._get_model()
        vectors = model.encode(texts, normalize_embeddings=True, batch_size=32)
        return [v.tolist() for v in vectors]
