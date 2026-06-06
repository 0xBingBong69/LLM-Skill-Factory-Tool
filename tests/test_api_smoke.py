"""Smoke tests for the FastAPI service.

Exercises the 'not configured' paths (empty store, no/garbage key) and the
streaming contract with a mocked OpenRouter client — no real network is used.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app
from skill_factory.models import GenerationResult
from skill_factory.openrouter import FALLBACK_MODELS, OpenRouterClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Point the store at an isolated temp dir for every test.
    monkeypatch.setenv("SKILLS_DIR", str(tmp_path))
    return TestClient(app)


@pytest.fixture()
def mock_llm(monkeypatch):
    """Make ``OpenRouterClient.chat`` deterministic (stream + non-stream)."""

    def fake_chat(self, messages, *, model=None, temperature=0.7, max_tokens=None, stream=False):
        model = model or self.default_model
        if stream:
            return iter(["Hello ", "world"])
        return GenerationResult(content="Hello world", model=model)

    monkeypatch.setattr(OpenRouterClient, "chat", fake_chat)


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_config_no_key(client):
    r = client.get("/api/config")
    assert r.status_code == 200
    body = r.json()
    assert body["has_key"] is False
    assert body["skill_count"] == 0
    assert "pdf_available" in body and "default_model" in body


def test_config_never_echoes_key(client):
    secret = "sk-or-SECRET-do-not-leak-123"
    r = client.get("/api/config", headers={"X-OpenRouter-Key": secret})
    assert r.status_code == 200
    assert r.json()["has_key"] is True
    assert secret not in r.text  # the key must never appear in any response body


def test_models_fallback_without_key(client):
    r = client.get("/api/models")
    assert r.status_code == 200
    assert r.json()["models"] == FALLBACK_MODELS


def test_skills_empty(client):
    r = client.get("/api/skills")
    assert r.status_code == 200 and r.json() == []


def test_skill_not_found(client):
    assert client.get("/api/skills/nope").status_code == 404


def test_presets_list(client):
    # The repo ships at least the qse-banks example preset.
    r = client.get("/api/presets")
    assert r.status_code == 200 and isinstance(r.json(), list)


def test_slugify(client):
    assert client.get("/api/slugify", params={"name": "Backend API Engineer!"}).json() == {
        "slug": "backend-api-engineer"
    }


def test_validate_reports_missing_frontmatter(client):
    r = client.post("/api/validate", json={"content": "no frontmatter here"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False and body["errors"]


def test_outline_stream_contract(client, mock_llm):
    r = client.post(
        "/api/generate/outline",
        headers={"X-OpenRouter-Key": "test"},
        json={"spec": {"name": "demo"}},
    )
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")
    assert "event: token" in r.text
    assert "event: done" in r.text
    assert "Hello" in r.text


def test_draft_stream_cleans_and_reports_model(client, mock_llm):
    r = client.post(
        "/api/generate/draft",
        headers={"X-OpenRouter-Key": "test", "X-OpenRouter-Model": "x/y"},
        json={"spec": {"name": "demo"}, "outline": "- A\n- B"},
    )
    assert r.status_code == 200
    assert "event: done" in r.text
    assert '"model": "x/y"' in r.text  # resolved model surfaces in the done event


def test_generate_without_key_streams_error(client):
    r = client.post("/api/generate/outline", json={"spec": {"name": "demo"}})
    # The stream itself reports the missing key as an SSE error event.
    assert r.status_code == 200
    assert "event: error" in r.text
