"""
Groq LLM service — wraps the Groq Python SDK for Llama 3.3 inference.
All LLM calls go through this service to keep agents decoupled from the SDK.
"""

from typing import Any, AsyncIterator, Dict, List, Optional
import hashlib
import json

from groq import AsyncGroq

from config.settings import get_settings
from utils.logger import logger

settings = get_settings()


class GroqService:
    def __init__(self) -> None:
        self._client: Optional[AsyncGroq] = None
        self._cache: Dict[str, str] = {}

    @property
    def client(self) -> AsyncGroq:
        if self._client is None:
            self._client = AsyncGroq(api_key=settings.groq_api_key)
        return self._client

    def _get_cache_key(self, messages: List[Dict[str, str]], model: str, temperature: float) -> str:
        """Deterministic cache key helper."""
        data = {
            "messages": messages,
            "model": model,
            "temperature": temperature
        }
        serialized = json.dumps(data, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        model: Optional[str] = None,
    ) -> str:
        """Single-turn chat completion. Returns the assistant message content."""
        model = model or settings.groq_model
        
        # Check cache if enabled
        cache_key = None
        if settings.groq_cache_enabled:
            cache_key = self._get_cache_key(messages, model, temperature)
            if cache_key in self._cache:
                logger.info(f"GroqService.chat | Cache HIT for model={model}")
                return self._cache[cache_key]

        logger.debug(f"GroqService.chat | Cache MISS | model={model} | messages={len(messages)}")

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content or ""
        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "rate limit" in err_msg or "quota" in err_msg:
                light_model = settings.groq_model_light
                if model != light_model:
                    logger.warning(f"GroqService.chat | Rate limit/429 hit for {model}. Falling back to {light_model}...")
                    response = await self.client.chat.completions.create(
                        model=light_model,
                        messages=messages,  # type: ignore[arg-type]
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )
                    content = response.choices[0].message.content or ""
                else:
                    raise e
            else:
                raise e

        # Store in cache if enabled
        if settings.groq_cache_enabled and cache_key:
            self._cache[cache_key] = content

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
