"""Thin OpenRouter client.

OpenRouter exposes an OpenAI-compatible API, so we drive it with the ``openai``
SDK pointed at OpenRouter's ``base_url``. The pipeline only depends on the small
interface defined here (``complete`` / ``chat``), which makes it trivial to mock
in tests.
"""

from __future__ import annotations

from typing import Any, Iterator

from .config import OPENROUTER_BASE_URL, get_settings
from .models import GenerationResult


class OpenRouterError(RuntimeError):
    """Raised for configuration or API problems with a human-readable message."""


# A tiny fallback list shown if the live /models call fails (offline, bad key…).
FALLBACK_MODELS: list[str] = [
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-opus-4.1",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-2.5-pro",
    "x-ai/grok-2",
    "meta-llama/llama-3.3-70b-instruct",
]


class OpenRouterClient:
    """Minimal wrapper over the OpenAI SDK configured for OpenRouter."""

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = OPENROUTER_BASE_URL,
        default_model: str = "anthropic/claude-sonnet-4.6",
        app_title: str = "LLM Skill Factory",
        app_url: str = "",
    ) -> None:
        if not api_key:
            raise OpenRouterError("No OpenRouter API key configured.")
        self.api_key = api_key
        self.base_url = base_url
        self.default_model = default_model
        # Headers OpenRouter uses for attribution / rankings.
        self._extra_headers = {"X-Title": app_title}
        if app_url:
            self._extra_headers["HTTP-Referer"] = app_url
        self._client = None  # lazily created

    # -- internal -----------------------------------------------------------
    def _ensure_client(self):
        if self._client is None:
            try:
                from openai import OpenAI
            except ImportError as exc:  # pragma: no cover
                raise OpenRouterError(
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
            "extra_headers": self._extra_headers,
        }
        if max_tokens:
            kwargs["max_tokens"] = max_tokens

        try:
            if stream:
                return self._stream(client, kwargs, model)
            resp = client.chat.completions.create(**kwargs)
        except OpenRouterError:
            raise
        except Exception as exc:  # surface a clean message to the UI
            raise OpenRouterError(f"OpenRouter request failed: {exc}") from exc

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
                delta = chunk.choices[0].delta
                piece = getattr(delta, "content", None)
                if piece:
                    yield piece
        except Exception as exc:  # pragma: no cover - network dependent
            raise OpenRouterError(f"OpenRouter stream failed: {exc}") from exc

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
        """Fetch available model ids from OpenRouter, sorted; fallback on error."""

        try:
            import requests

            resp = requests.get(
                f"{self.base_url}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json().get("data", [])
            ids = sorted(m["id"] for m in data if "id" in m)
            return ids or FALLBACK_MODELS
        except Exception:
            return FALLBACK_MODELS


def client_from_settings(overrides: dict | None = None) -> OpenRouterClient:
    """Build a client from resolved :class:`~skill_factory.config.Settings`."""

    s = get_settings(overrides)
    return OpenRouterClient(
        api_key=s.api_key,
        base_url=s.base_url,
        default_model=s.default_model,
        app_title=s.app_title,
        app_url=s.app_url,
    )
