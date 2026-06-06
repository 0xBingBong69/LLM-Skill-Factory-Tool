"""Pluggable context providers for the (optional) research stage.

v1 ships only manual providers. A web-search provider (e.g. Tavily/Brave) is
deliberately deferred, but the interface seam is here so it can be added without
touching the pipeline or UI.
"""

from __future__ import annotations

from typing import Protocol


class ContextProvider(Protocol):
    """Anything that can gather extra context text for a generation."""

    def gather(self, query: str) -> str:  # pragma: no cover - interface
        ...


class NullProvider:
    """Default: contributes nothing."""

    def gather(self, query: str) -> str:
        return ""


class ManualProvider:
    """Wraps text the user pasted / extracted from documents."""

    def __init__(self, text: str = "") -> None:
        self.text = text

    def gather(self, query: str) -> str:
        return self.text


class WebResearchProvider:
    """Placeholder for a future web-search provider.

    Wire a real implementation (Tavily/Brave/SerpAPI) here; it only needs to
    implement ``gather``. Until then it is intentionally inert.
    """

    available = False

    def __init__(self, api_key: str = "") -> None:
        self.api_key = api_key

    def gather(self, query: str) -> str:  # pragma: no cover - deferred
        raise NotImplementedError(
            "Web research is not wired in this build. Paste facts manually, or "
            "implement WebResearchProvider.gather()."
        )
