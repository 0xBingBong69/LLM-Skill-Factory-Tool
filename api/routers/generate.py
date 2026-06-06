"""Streaming generation endpoints (SSE): outline, draft, refine, overlay, batch.

These deliberately bypass ``pipeline.*`` (which is non-streaming): each builds the
same system/user prompts from ``meta_prompts`` and drives ``client.chat(stream=True)``,
applying ``clean_skill_output`` to the final accumulated text via the ``done`` event.
"""

from __future__ import annotations

from fastapi import APIRouter

from skill_factory import meta_prompts as mp
from skill_factory import pipeline
from skill_factory.config import get_settings
from skill_factory.models import SkillMeta, SkillSpec
from skill_factory.openrouter import OpenRouterError, client_from_settings
from skill_factory.skill_store import slugify
from skill_factory.validator import validate_skill_md

from ..deps import OverridesDep, StoreDep
from ..schemas import BatchOverlayIn, DraftIn, OutlineIn, OverlayIn, RefineIn
from ..streaming import sse_format, sse_response, stream_chat

router = APIRouter(tags=["generate"])


def _model(overrides: dict, requested: str | None) -> str:
    return requested or get_settings(overrides).default_model


def _messages(system: str, user: str) -> list[dict[str, str]]:
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


@router.post("/generate/outline")
def generate_outline(body: OutlineIn, overrides: OverridesDep):
    spec = body.spec.to_spec()
    msgs = _messages(mp.outline_system(), mp.outline_user(spec))
    return sse_response(stream_chat(
        lambda: client_from_settings(overrides), msgs,
        model=_model(overrides, body.model), temperature=body.temperature, clean=False,
    ))


@router.post("/generate/draft")
def generate_draft(body: DraftIn, overrides: OverridesDep):
    spec = body.spec.to_spec()
    msgs = _messages(mp.draft_system(), mp.draft_user(spec, body.outline))
    return sse_response(stream_chat(
        lambda: client_from_settings(overrides), msgs,
        model=_model(overrides, body.model), temperature=body.temperature, clean=True,
    ))


@router.post("/generate/refine")
def generate_refine(body: RefineIn, overrides: OverridesDep):
    msgs = _messages(mp.refine_system(), mp.refine_user(body.content, body.instruction, body.section))
    return sse_response(stream_chat(
        lambda: client_from_settings(overrides), msgs,
        model=_model(overrides, body.model), temperature=body.temperature, clean=True,
    ))


@router.post("/generate/overlay")
def generate_overlay(body: OverlayIn, overrides: OverridesDep):
    spec = body.spec.to_spec()
    msgs = _messages(mp.overlay_system(), mp.overlay_user(body.base_content, body.entity, spec))
    return sse_response(stream_chat(
        lambda: client_from_settings(overrides), msgs,
        model=_model(overrides, body.model), temperature=body.temperature, clean=True,
    ))


# ---------------------------------------------------------------------------
# Batch overlay — streams per-item progress (mirrors ui/batch_page.py)
# ---------------------------------------------------------------------------
def _final_slug(entity: str, pattern: str) -> str:
    base = slugify(entity)
    try:
        return slugify(pattern.format(slug=base)) or base
    except Exception:
        return base


def _overlay_spec(entity: str, slug: str, base_slug: str, body: BatchOverlayIn) -> SkillSpec:
    return SkillSpec(
        name=slug,
        description=(
            f"Use when the work specifically concerns {entity}. "
            f"Specialises the '{base_slug}' base skill."
        ),
        skill_type="specialist",
        tags=body.tags,
        entities=[entity],
        requirements=body.requirements,
        base_skill=base_slug,
        token_budget=body.token_budget,
        tone=body.tone,
    )


@router.post("/batch/overlay")
def batch_overlay(body: BatchOverlayIn, overrides: OverridesDep, store: StoreDep):
    def gen():
        try:
            client = client_from_settings(overrides)
        except OpenRouterError as exc:
            yield sse_format("error", {"message": str(exc)})
            return

        base_version = body.base_version or store.latest_version(body.base_slug)
        if base_version is None:
            yield sse_format("error", {"message": f"Base skill '{body.base_slug}' not found."})
            return
        base_md = store.load_content(body.base_slug, base_version)
        model = _model(overrides, body.model)

        entities = [e.strip() for e in body.entities if e.strip()]
        yield sse_format("start", {"total": len(entities)})
        for i, entity in enumerate(entities):
            slug = _final_slug(entity, body.name_pattern)
            yield sse_format("item", {"index": i, "entity": entity, "slug": slug, "status": "running"})
            try:
                spec = _overlay_spec(entity, slug, body.base_slug, body)
                res = pipeline.generate_overlay(
                    client, base_md, entity, spec, model=model, temperature=body.temperature
                )
                meta = SkillMeta.from_spec(
                    spec, model=res.model, version_notes=f"Batch overlay from {body.base_slug}"
                )
                version = store.save_new_version(slug, res.content, meta)
                rep = validate_skill_md(res.content, expected_name=slug, token_budget=body.token_budget)
                yield sse_format("item", {
                    "index": i, "entity": entity, "slug": slug, "version": version,
                    "status": "ok" if rep.ok else "saved (with warnings)",
                    "issues": rep.summary(),
                })
            except Exception as exc:  # noqa: BLE001 - keep going, report per-entity
                yield sse_format("item", {
                    "index": i, "entity": entity, "slug": slug, "version": None,
                    "status": "failed", "issues": str(exc),
                })
        yield sse_format("done", {"total": len(entities)})

    return sse_response(gen())
