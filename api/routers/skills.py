"""Skill CRUD, versioning, validation, export, and test-result recording."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response

from skill_factory.exporter import zip_skill
from skill_factory.frontmatter import split_frontmatter
from skill_factory.models import SkillMeta
from skill_factory.skill_store import slugify
from skill_factory.validator import estimate_tokens, validate_skill_md

from ..deps import StoreDep
from ..schemas import (
    OverwriteIn,
    SaveVersionIn,
    SaveVersionOut,
    SkillDetailOut,
    SkillMetaOut,
    SlugOut,
    TestRecordOut,
    TestResultIn,
    ValidateIn,
    ValidationReportOut,
)

router = APIRouter(tags=["skills"])


# ---------------------------------------------------------------------------
# Convenience
# ---------------------------------------------------------------------------
@router.get("/slugify", response_model=SlugOut)
def get_slug(name: str = Query("")) -> SlugOut:
    return SlugOut(slug=slugify(name))


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------
@router.get("/skills", response_model=list[SkillMetaOut])
def list_skills(store: StoreDep) -> list[SkillMetaOut]:
    return [SkillMetaOut.from_meta(m) for m in store.library()]


@router.get("/skills/{slug}/versions", response_model=list[int])
def list_versions(slug: str, store: StoreDep) -> list[int]:
    versions = store.versions(slug)
    if not versions:
        raise HTTPException(status_code=404, detail=f"Skill '{slug}' not found.")
    return versions


@router.get("/skills/{slug}", response_model=SkillDetailOut)
def get_skill(slug: str, store: StoreDep, version: int | None = Query(None)) -> SkillDetailOut:
    versions = store.versions(slug)
    if not versions:
        raise HTTPException(status_code=404, detail=f"Skill '{slug}' not found.")
    v = version or versions[-1]
    if v not in versions:
        raise HTTPException(status_code=404, detail=f"Skill '{slug}' has no version v{v}.")
    content, meta = store.load(slug, v)
    return SkillDetailOut(
        slug=slug, content=content, meta=SkillMetaOut.from_meta(meta), versions=versions
    )


# ---------------------------------------------------------------------------
# Write
# ---------------------------------------------------------------------------
def _carry_forward_meta(
    store, slug: str, content: str, *, source_version: int, version: int,
    notes: str, model: str, keep_tests: bool,
) -> SkillMeta:
    """Carry metadata forward from an existing version, refreshing description.

    Mirrors the Streamlit editor's ``_meta_for_save``: new versions start with a
    clean test history; overwrites preserve it.
    """

    fm, _ = split_frontmatter(content)
    base = store.load_meta(slug, source_version)
    return SkillMeta(
        name=slug,
        description=str(fm.get("description", base.description)),
        skill_type=base.skill_type,
        domain_focus=base.domain_focus,
        tags=base.tags,
        entities=base.entities,
        base_skill=base.base_skill,
        version=version,
        version_notes=notes or base.version_notes,
        model=model or base.model,
        test_results=base.test_results if keep_tests else [],
    )


@router.post("/skills/{slug}/versions", response_model=SaveVersionOut)
def save_version(slug: str, body: SaveVersionIn, store: StoreDep) -> SaveVersionOut:
    """Create a new version (wizard ``spec`` mode, or editor carry-forward mode)."""

    if body.spec is not None:
        # Wizard: build metadata from the full spec.
        meta = SkillMeta.from_spec(
            body.spec.to_spec(), model=body.model, version_notes=body.version_notes
        )
    else:
        # Editor: carry forward from an existing version.
        source = body.from_version or store.latest_version(slug)
        if source is None:
            raise HTTPException(
                status_code=400,
                detail="Provide a spec to create the first version of a new skill.",
            )
        next_v = (store.latest_version(slug) or 0) + 1
        meta = _carry_forward_meta(
            store, slug, body.content, source_version=source, version=next_v,
            notes=body.version_notes, model=body.model, keep_tests=False,
        )
    version = store.save_new_version(slug, body.content, meta)
    return SaveVersionOut(slug=slug, version=version)


@router.put("/skills/{slug}/versions/{version}", response_model=SaveVersionOut)
def overwrite_version(
    slug: str, version: int, body: OverwriteIn, store: StoreDep
) -> SaveVersionOut:
    if not store.exists(slug, version):
        raise HTTPException(status_code=404, detail=f"Skill '{slug}' has no version v{version}.")
    meta = _carry_forward_meta(
        store, slug, body.content, source_version=version, version=version,
        notes=body.version_notes, model=body.model, keep_tests=True,
    )
    store.overwrite_version(slug, version, body.content, meta)
    return SaveVersionOut(slug=slug, version=version)


# ---------------------------------------------------------------------------
# Validate
# ---------------------------------------------------------------------------
@router.post("/validate", response_model=ValidationReportOut)
def validate(body: ValidateIn) -> ValidationReportOut:
    report = validate_skill_md(
        body.content, expected_name=body.expected_name, token_budget=body.token_budget
    )
    _, sk_body = split_frontmatter(body.content)
    return ValidationReportOut(
        ok=report.ok,
        summary=report.summary(),
        errors=report.errors,
        warnings=report.warnings,
        suggestions=report.suggestions,
        frontmatter=report.frontmatter,
        estimated_tokens=estimate_tokens(sk_body or body.content),
        line_count=len((sk_body or body.content).splitlines()),
    )


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
@router.get("/skills/{slug}/export")
def export_skill(
    slug: str, store: StoreDep,
    version: int | None = Query(None), all_versions: bool = Query(False),
) -> Response:
    if not store.exists(slug):
        raise HTTPException(status_code=404, detail=f"Skill '{slug}' not found.")
    data = zip_skill(store, slug, version=version, all_versions=all_versions)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{slug}.zip"'},
    )


# ---------------------------------------------------------------------------
# Playground test recording
# ---------------------------------------------------------------------------
@router.post("/skills/{slug}/versions/{version}/tests", response_model=TestRecordOut)
def record_test(
    slug: str, version: int, body: TestResultIn, store: StoreDep
) -> TestRecordOut:
    if not store.exists(slug, version):
        raise HTTPException(status_code=404, detail=f"Skill '{slug}' has no version v{version}.")
    meta = store.load_meta(slug, version)
    meta.test_results.append(body.to_test_result())
    store.update_meta(slug, version, meta)
    return TestRecordOut(version=version, count=len(meta.test_results))
