"""Pydantic request/response models.

These mirror the core dataclasses (``skill_factory.models``) so the wire format
is explicit and decoupled from the dataclasses' ``to_dict``/``from_dict``. They
also generate the OpenAPI schema the frontend's typed client is built from.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from skill_factory.models import SkillMeta, SkillSpec, TestResult


# ---------------------------------------------------------------------------
# Skill spec / metadata
# ---------------------------------------------------------------------------
class SpecIn(BaseModel):
    """Everything needed to generate a skill (mirrors ``SkillSpec``)."""

    name: str
    description: str = ""
    skill_type: str = "domain-expert"
    domain_focus: str = ""
    tags: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    base_skill: str | None = None
    token_budget: int = 1500
    tone: str = "balanced"
    reference_text: str = ""

    def to_spec(self) -> SkillSpec:
        return SkillSpec(**self.model_dump())


class TestResultOut(BaseModel):
    test_name: str
    user_prompt: str
    output: str
    model: str
    rating: str = ""  # "up" | "down" | ""
    notes: str = ""
    created_at: float


class SkillMetaOut(BaseModel):
    name: str
    description: str = ""
    skill_type: str = "domain-expert"
    domain_focus: str = ""
    tags: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    base_skill: str | None = None
    version: int = 1
    version_notes: str = ""
    model: str = ""
    created_at: float = 0.0
    test_results: list[TestResultOut] = Field(default_factory=list)

    @classmethod
    def from_meta(cls, meta: SkillMeta) -> "SkillMetaOut":
        return cls.model_validate(meta.to_dict())


class SkillDetailOut(BaseModel):
    slug: str
    content: str
    meta: SkillMetaOut
    versions: list[int]


# ---------------------------------------------------------------------------
# Config / models
# ---------------------------------------------------------------------------
class SettingsOut(BaseModel):
    """Status payload. The API key itself is NEVER returned — only ``has_key``."""

    has_key: bool
    default_model: str
    app_title: str
    skills_dir: str
    pdf_available: bool
    skill_count: int


class ModelsOut(BaseModel):
    models: list[str]


class SlugOut(BaseModel):
    slug: str


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
class ValidateIn(BaseModel):
    content: str
    expected_name: str | None = None
    token_budget: int | None = None


class ValidationReportOut(BaseModel):
    ok: bool
    summary: str
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    frontmatter: dict = Field(default_factory=dict)
    estimated_tokens: int = 0
    line_count: int = 0


# ---------------------------------------------------------------------------
# Save / overwrite
# ---------------------------------------------------------------------------
class SaveVersionIn(BaseModel):
    """Create a new version.

    Two modes (matching the Streamlit UI):
      * wizard:   provide ``spec`` -> metadata built via ``SkillMeta.from_spec``.
      * editor:   omit ``spec`` -> carry metadata forward from ``from_version``
                  (or latest), refreshing ``description`` from the frontmatter and
                  starting a clean test history.
    """

    content: str
    version_notes: str = ""
    model: str = ""
    spec: SpecIn | None = None
    from_version: int | None = None


class OverwriteIn(BaseModel):
    """Overwrite a version in place, preserving its recorded test history."""

    content: str
    version_notes: str = ""
    model: str = ""


class SaveVersionOut(BaseModel):
    slug: str
    version: int


# ---------------------------------------------------------------------------
# Generation (streaming request bodies)
# ---------------------------------------------------------------------------
class OutlineIn(BaseModel):
    spec: SpecIn
    model: str | None = None
    temperature: float = 0.5


class DraftIn(BaseModel):
    spec: SpecIn
    outline: str = ""
    model: str | None = None
    temperature: float = 0.6


class RefineIn(BaseModel):
    content: str
    instruction: str
    section: str = ""
    model: str | None = None
    temperature: float = 0.5


class OverlayIn(BaseModel):
    base_content: str
    entity: str
    spec: SpecIn
    model: str | None = None
    temperature: float = 0.6


class BatchOverlayIn(BaseModel):
    base_slug: str
    base_version: int | None = None
    entities: list[str]
    name_pattern: str = "{slug}-specialist"
    tone: str = "balanced"
    token_budget: int = 1500
    tags: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    model: str | None = None
    temperature: float = 0.6


# ---------------------------------------------------------------------------
# Playground
# ---------------------------------------------------------------------------
class PlaygroundRunIn(BaseModel):
    """Run a skill body as a system prompt against the user's prompt."""

    content: str  # full SKILL.md or a raw system prompt; frontmatter is stripped
    user_prompt: str
    model: str | None = None
    temperature: float = 0.7


class TestResultIn(BaseModel):
    user_prompt: str
    output: str
    model: str
    test_name: str = "ad-hoc test"
    rating: str = ""  # "up" | "down" | ""
    notes: str = ""

    def to_test_result(self) -> TestResult:
        return TestResult(
            test_name=self.test_name,
            user_prompt=self.user_prompt,
            output=self.output,
            model=self.model,
            rating=self.rating,
            notes=self.notes,
        )


class TestRecordOut(BaseModel):
    version: int
    count: int


# ---------------------------------------------------------------------------
# References / presets
# ---------------------------------------------------------------------------
class ReferenceFileOut(BaseModel):
    name: str
    chars: int = 0
    error: str | None = None


class ReferencesOut(BaseModel):
    combined: str
    files: list[ReferenceFileOut] = Field(default_factory=list)


class PresetEntityOut(BaseModel):
    name: str = ""
    ticker: str = ""
    notes: str = ""


class PresetOut(BaseModel):
    stem: str
    name: str = ""
    description: str = ""
    entities: list[PresetEntityOut] = Field(default_factory=list)
    labels: list[str] = Field(default_factory=list)
