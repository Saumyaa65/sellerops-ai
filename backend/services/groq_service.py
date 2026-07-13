"""
Groq LLM service — wraps the Groq Python SDK for Llama 3.3 inference.
All LLM calls go through this service to keep agents decoupled from the SDK.
"""

from typing import Any, AsyncIterator, Dict, List, Optional

from groq import AsyncGroq

from config.settings import get_settings
from utils.logger import logger

settings = get_settings()


class GroqService:
    def __init__(self) -> None:
        self._client: Optional[AsyncGroq] = None

    @property
    def client(self) -> AsyncGroq:
        if self._client is None:
            self._client = AsyncGroq(api_key=settings.groq_api_key)
        return self._client

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        model: Optional[str] = None,
    ) -> str:
        """Single-turn chat completion. Returns the assistant message content."""
        model = model or settings.groq_model
        logger.debug(f"GroqService.chat | model={model} | messages={len(messages)}")

        response = await self.client.chat.completions.create(
            model=model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
        )
        content = response.choices[0].message.content or ""
        return content

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        model: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Streaming chat completion. Yields text deltas."""
        model = model or settings.groq_model
        logger.debug(f"GroqService.chat_stream | model={model}")

        stream = await self.client.chat.completions.create(
            model=model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def health_check(self) -> bool:
        """Verify Groq connectivity."""
        try:
            await self.chat(
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5,
            )
            return True
        except Exception as e:
            logger.warning(f"Groq health check failed: {e}")
            return False


# Singleton instance
groq_service = GroqService()
