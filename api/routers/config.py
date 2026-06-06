"""Config & model-list endpoints (status panel + onboarding)."""

from __future__ import annotations

from fastapi import APIRouter

from skill_factory import references
from skill_factory.openrouter import FALLBACK_MODELS, client_from_settings

from ..deps import OverridesDep, SettingsDep, StoreDep
from ..schemas import ModelsOut, SettingsOut

router = APIRouter(tags=["config"])


@router.get("/config", response_model=SettingsOut)
def get_config(settings: SettingsDep, store: StoreDep) -> SettingsOut:
    return SettingsOut(
        has_key=settings.has_key,
        default_model=settings.default_model,
        app_title=settings.app_title,
        skills_dir=str(settings.skills_dir),
        pdf_available=references.PDF_AVAILABLE,
        skill_count=len(store.list_skills()),
    )


@router.get("/models", response_model=ModelsOut)
def get_models(overrides: OverridesDep, settings: SettingsDep) -> ModelsOut:
    """Live model list from OpenRouter; falls back to a built-in list.

    Without a key we cannot query OpenRouter, so we return the built-in fallback
    list (so the model picker always has options) rather than erroring.
    """

    if not settings.has_key:
        return ModelsOut(models=FALLBACK_MODELS)
    client = client_from_settings(overrides)
    return ModelsOut(models=client.list_models())
