"""FastAPI dependencies: stateless settings/store/client wiring.

The OpenRouter key arrives per-request in the ``X-OpenRouter-Key`` header and is
mapped onto the core's override chain (override > env > .env > default). It is never
persisted, never logged, and never echoed in a response.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header

from skill_factory.config import Settings, get_settings
from skill_factory.openrouter import OpenRouterClient, client_from_settings
from skill_factory.skill_store import SkillStore


def get_overrides(
    x_openrouter_key: Annotated[str | None, Header(alias="X-OpenRouter-Key")] = None,
    x_openrouter_model: Annotated[str | None, Header(alias="X-OpenRouter-Model")] = None,
) -> dict:
    overrides: dict = {}
    if x_openrouter_key:
        overrides["api_key"] = x_openrouter_key
    if x_openrouter_model:
        overrides["default_model"] = x_openrouter_model
    return overrides


OverridesDep = Annotated[dict, Depends(get_overrides)]


def get_settings_dep(overrides: OverridesDep) -> Settings:
    return get_settings(overrides)


SettingsDep = Annotated[Settings, Depends(get_settings_dep)]


def get_store(settings: SettingsDep) -> SkillStore:
    return SkillStore(settings.skills_dir)


StoreDep = Annotated[SkillStore, Depends(get_store)]


def get_client(overrides: OverridesDep) -> OpenRouterClient:
    """Build a client now (raises ``OpenRouterError`` if no key is configured)."""

    return client_from_settings(overrides)


ClientDep = Annotated[OpenRouterClient, Depends(get_client)]
