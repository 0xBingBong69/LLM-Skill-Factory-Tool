"""Route tests for skill CRUD, versioning, export, references — against a tmp store."""

from __future__ import annotations

import io
import zipfile

import pytest
from fastapi.testclient import TestClient

from api.main import app

WIZARD_BODY = {
    "content": (
        "---\nname: demo\ndescription: Use when testing the demo skill end to end "
        "across the API surface.\n---\n# Demo\nAlways do X.\n"
    ),
    "version_notes": "init",
    "model": "x/y",
    "spec": {"name": "demo", "skill_type": "domain-expert", "tags": ["a"], "domain_focus": "testing"},
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("SKILLS_DIR", str(tmp_path))
    return TestClient(app)


def _v2_body(desc: str, notes: str) -> dict:
    return {
        "content": f"---\nname: demo\ndescription: {desc}\n---\n# Demo v2\n",
        "version_notes": notes,
    }


def test_wizard_save_then_get(client):
    r = client.post("/api/skills/demo/versions", json=WIZARD_BODY)
    assert r.json() == {"slug": "demo", "version": 1}

    detail = client.get("/api/skills/demo").json()
    assert detail["slug"] == "demo"
    assert detail["versions"] == [1]
    assert detail["meta"]["model"] == "x/y"
    assert detail["meta"]["tags"] == ["a"]
    assert detail["meta"]["domain_focus"] == "testing"


def test_editor_new_version_carries_meta_and_refreshes_description(client):
    client.post("/api/skills/demo/versions", json=WIZARD_BODY)
    r = client.post("/api/skills/demo/versions", json=_v2_body("Brand new v2 description here.", "v2"))
    assert r.json()["version"] == 2

    meta = client.get("/api/skills/demo", params={"version": 2}).json()["meta"]
    assert meta["description"] == "Brand new v2 description here."  # from frontmatter
    assert meta["tags"] == ["a"]                                    # carried forward
    assert meta["test_results"] == []                              # new version => clean


def test_record_test_then_overwrite_preserves_history(client):
    client.post("/api/skills/demo/versions", json=WIZARD_BODY)

    rec = client.post(
        "/api/skills/demo/versions/1/tests",
        json={"user_prompt": "hi", "output": "yo", "model": "x/y", "rating": "up"},
    )
    assert rec.json() == {"version": 1, "count": 1}

    # Overwrite keeps the recorded test history.
    client.put("/api/skills/demo/versions/1", json=_v2_body("Overwritten desc for v1.", "edit"))
    meta = client.get("/api/skills/demo", params={"version": 1}).json()["meta"]
    assert len(meta["test_results"]) == 1
    assert meta["description"] == "Overwritten desc for v1."


def test_save_without_spec_on_new_skill_is_rejected(client):
    r = client.post("/api/skills/ghost/versions", json=_v2_body("x", "y"))
    assert r.status_code == 400


def test_versions_and_export_zip(client):
    client.post("/api/skills/demo/versions", json=WIZARD_BODY)
    assert client.get("/api/skills/demo/versions").json() == [1]

    r = client.get("/api/skills/demo/export")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"
    names = zipfile.ZipFile(io.BytesIO(r.content)).namelist()
    assert "demo/SKILL.md" in names and "demo/USAGE.md" in names


def test_references_extract_combines_and_reports_errors(client):
    r = client.post(
        "/api/references/extract",
        data={"pasted": "durable facts"},
        files=[
            ("files", ("a.txt", b"file body text", "text/plain")),
            ("files", ("bad.xyz", b"nope", "application/octet-stream")),
        ],
    )
    assert r.status_code == 200
    body = r.json()
    assert "durable facts" in body["combined"]
    assert "file body text" in body["combined"]
    names = {f["name"]: f for f in body["files"]}
    assert names["a.txt"]["error"] is None and names["a.txt"]["chars"] > 0
    assert names["bad.xyz"]["error"]  # unsupported type reported, request still succeeds
