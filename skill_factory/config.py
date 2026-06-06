"""Configuration & settings resolution.

Resolution order for any value is: explicit override (e.g. the UI session) >
environment variable > ``.env`` file > built-in default. The core never hardcodes
an API key and never persists one to disk.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:  # python-dotenv is a hard dependency, but keep import resilient for tests
    from dotenv import load_dotenv
except Exception:  # pragma: no cover
    def load_dotenv(*_args, **_kwargs):  # type: ignore
        return False

# Project root = parent of this package directory.
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DEFAULT_MODEL = "anthropic/claude-sonnet-4.6"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

_ENV_LOADED = False


def load_env() -> None:
    """Load ``.env`` from the project root exactly once (idempotent)."""

    global _ENV_LOADED
    if not _ENV_LOADED:
        load_dotenv(PROJECT_ROOT / ".env")
        _ENV_LOADED = True


@dataclass
class Settings:
    api_key: str = ""
    default_model: str = DEFAULT_MODEL
    app_title: str = "LLM Skill Factory"
    app_url: str = "https://github.com/0xBingBong69/LLM-Skill-Factory-Tool"
    skills_dir: Path = PROJECT_ROOT / "skills"
    base_url: str = OPENROUTER_BASE_URL

    @property
    def has_key(self) -> bool:
        return bool(self.api_key.strip())


def get_settings(overrides: dict | None = None) -> Settings:
    """Build a :class:`Settings` from overrides > env > defaults.

    ``overrides`` is typically the Streamlit session state, so a key typed into
    the UI wins over the environment without ever being written to disk.
    """

    load_env()
    overrides = overrides or {}

    def pick(override_key: str, env_key: str, default: str) -> str:
        val = overrides.get(override_key)
        if val:
            return str(val)
        return os.environ.get(env_key, default)

    skills_dir_raw = pick("skills_dir", "SKILLS_DIR", "")
    skills_dir = Path(skills_dir_raw) if skills_dir_raw else PROJECT_ROOT / "skills"

    return Settings(
        api_key=pick("api_key", "OPENROUTER_API_KEY", ""),
        default_model=pick("default_model", "OPENROUTER_DEFAULT_MODEL", DEFAULT_MODEL),
        app_title=pick("app_title", "OPENROUTER_APP_TITLE", "LLM Skill Factory"),
        app_url=pick("app_url", "OPENROUTER_APP_URL",
                     "https://github.com/0xBingBong69/LLM-Skill-Factory-Tool"),
        skills_dir=skills_dir,
    )
