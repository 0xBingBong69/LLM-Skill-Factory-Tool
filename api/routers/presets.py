"""Batch-generation preset endpoints (entity lists under ``presets/``)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from skill_factory import presets
from skill_factory.config import PROJECT_ROOT

from ..schemas import PresetOut

router = APIRouter(tags=["presets"])

PRESETS_DIR = PROJECT_ROOT / "presets"


@router.get("/presets", response_model=list[str])
def list_presets() -> list[str]:
    return presets.list_presets(PRESETS_DIR)


@router.get("/presets/{stem}", response_model=PresetOut)
def get_preset(stem: str) -> PresetOut:
    if stem not in presets.list_presets(PRESETS_DIR):
        raise HTTPException(status_code=404, detail=f"Preset '{stem}' not found.")
    data = presets.load_preset(PRESETS_DIR, stem)
    return PresetOut(
        stem=stem,
        name=data.get("name", ""),
        description=data.get("description", ""),
        entities=data.get("entities", []),
        labels=presets.entity_labels(data),
    )
