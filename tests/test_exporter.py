import io
import zipfile

from skill_factory.exporter import copy_skill_to, usage_guide, zip_skill
from skill_factory.models import SkillMeta, SkillSpec
from skill_factory.skill_store import SkillStore


def _seed(tmp_path):
    store = SkillStore(tmp_path)
    spec = SkillSpec(name="demo", description="Use when demoing.", tags=["t"])
    store.save_new_version("demo", "---\nname: demo\n---\nbody v1", SkillMeta.from_spec(spec))
    store.save_new_version("demo", "---\nname: demo\n---\nbody v2", SkillMeta.from_spec(spec))
    return store


def test_zip_latest_contains_files(tmp_path):
    store = _seed(tmp_path)
    data = zip_skill(store, "demo")
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = zf.namelist()
        assert "demo/SKILL.md" in names
        assert "demo/metadata.json" in names
        assert "demo/USAGE.md" in names
        assert "body v2" in zf.read("demo/SKILL.md").decode()


def test_zip_all_versions(tmp_path):
    store = _seed(tmp_path)
    data = zip_skill(store, "demo", all_versions=True)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = zf.namelist()
        assert "demo/v1/SKILL.md" in names
        assert "demo/v2/SKILL.md" in names


def test_copy_skill_to(tmp_path):
    store = _seed(tmp_path)
    dest = tmp_path / "out"
    target = copy_skill_to(store, "demo", dest)
    assert (target / "SKILL.md").exists()
    assert (target / "metadata.json").exists()


def test_usage_guide_mentions_slug():
    meta = SkillMeta(name="demo", description="Use when demoing.")
    guide = usage_guide("demo", meta)
    assert "demo" in guide
    assert "SKILL.md" in guide
