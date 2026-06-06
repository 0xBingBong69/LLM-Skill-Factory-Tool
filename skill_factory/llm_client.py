"""Provider-agnostic LLM client.

All supported providers (OpenRouter, MiniMax, Kimi/Moonshot, or any custom
OpenAI-compatible endpoint) are driven through the OpenAI SDK pointed at the
provider's ``base_url``. The pipeline only depends on the small interface here
(``complete`` / ``chat``), which makes it trivial to mock in tests.
"""

from __future__ import annotations

from typing import Any, Iterator

from .config import get_settings
from .models import GenerationResult


class LLMError(RuntimeError):
    """Raised for configuration or API problems with a human-readable message."""


# Backwards-compatible alias (the project began as OpenRouter-only).
OpenRouterError = LLMError


class LLMClient:
    """Minimal wrapper over the OpenAI SDK configured for any compatible provider."""

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str,
        default_model: str,
        fallback_models: tuple[str, ...] = (),
        supports_model_listing: bool = True,
        app_title: str = "LLM Skill Factory",
        app_url: str = "",
        send_app_headers: bool = False,
    ) -> None:
        if not api_key:
            raise LLMError("No API key configured for this provider.")
        if not base_url:
            raise LLMError("No base URL configured for this provider.")
        self.api_key = api_key
        self.base_url = base_url
        self.default_model = default_model
        self.fallback_models = tuple(fallback_models)
        self.supports_model_listing = supports_model_listing
        self._extra_headers: dict[str, str] = {}
        if send_app_headers:
            self._extra_headers["X-Title"] = app_title
            if app_url:
                self._extra_headers["HTTP-Referer"] = app_url
        self._client = None  # lazily created

    # -- internal -----------------------------------------------------------
    def _ensure_client(self):
        if self._client is None:
            try:
                from openai import OpenAI
            except ImportError as exc:  # pragma: no cover
                raise LLMError(
                    "The 'openai' package is required. Run: pip install -r requirements.txt"
                ) from exc
            self._client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        return self._client

    # -- public API ---------------------------------------------------------
    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        stream: bool = False,
    ) -> GenerationResult | Iterator[str]:
        """Run a chat completion.

        Returns a :class:`GenerationResult` normally, or an iterator of text
        chunks when ``stream=True``.
        """

        client = self._ensure_client()
        model = model or self.default_model
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if self._extra_headers:
            kwargs["extra_headers"] = self._extra_headers
        if max_tokens:
            kwargs["max_tokens"] = max_tokens

        try:
            if stream:
                return self._stream(client, kwargs, model)
            resp = client.chat.completions.create(**kwargs)
        except LLMError:
            raise
        except Exception as exc:  # surface a clean message to the UI
            raise LLMError(f"Request failed: {exc}") from exc

        content = resp.choices[0].message.content or ""
        usage = {}
        if getattr(resp, "usage", None) is not None:
            usage = {
                "prompt_tokens": getattr(resp.usage, "prompt_tokens", None),
                "completion_tokens": getattr(resp.usage, "completion_tokens", None),
                "total_tokens": getattr(resp.usage, "total_tokens", None),
            }
        return GenerationResult(content=content, model=model, usage=usage)

    def _stream(self, client, kwargs: dict, model: str) -> Iterator[str]:
        kwargs = {**kwargs, "stream": True}
        try:
            for chunk in client.chat.completions.create(**kwargs):
                if not chunk.choices:
                    continue
                piece = getattr(chunk.choices[0].delta, "content", None)
                if piece:
                    yield piece
        except Exception as exc:  # pragma: no cover - network dependent
            raise LLMError(f"Stream failed: {exc}") from exc

    def complete(
        self,
        *,
        system: str,
        user: str,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> GenerationResult:
        """Convenience for a single system+user turn used by the pipeline."""

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        result = self.chat(
            messages, model=model, temperature=temperature, max_tokens=max_tokens
        )
        assert isinstance(result, GenerationResult)
        return result

    def list_models(self) -> list[str]:
        """Fetch available model ids from the provider; fall back to the curated list."""

        if not self.supports_model_listing:
            return list(self.fallback_models)
        try:
            import requests

            resp = requests.get(
                f"{self.base_url.rstrip('/')}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json().get("data", [])
            ids = sorted(m["id"] for m in data if isinstance(m, dict) and "id" in m)
            return ids or list(self.fallback_models)
        except Exception:
            return list(self.fallback_models)


def client_from_settings(overrides: dict | None = None) -> LLMClient:
    """Build a client from resolved :class:`~skill_factory.config.Settings`."""

    s = get_settings(overrides)
    return LLMClient(
        api_key=s.api_key,
        base_url=s.base_url,
        default_model=s.default_model,
        fallback_models=s.fallback_models,
        supports_model_listing=s.supports_model_listing,
        app_title=s.app_title,
        app_url=s.app_url,
        send_app_headers=s.sends_app_headers,
    )
