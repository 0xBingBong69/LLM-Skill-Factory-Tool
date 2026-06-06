"""Playground: stream a skill body (as system prompt) against a user prompt."""

from __future__ import annotations

from fastapi import APIRouter

from skill_factory.config import get_settings
from skill_factory.frontmatter import split_frontmatter
from skill_factory.openrouter import client_from_settings

from ..deps import OverridesDep
from ..schemas import PlaygroundRunIn
from ..streaming import sse_response, stream_chat

router = APIRouter(tags=["playground"])


@router.post("/playground/run")
def playground_run(body: PlaygroundRunIn, overrides: OverridesDep):
    # The skill body (frontmatter stripped) becomes the system prompt — same as
    # ui/playground_page.py.
    _, sk_body = split_frontmatter(body.content)
    system_prompt = sk_body or body.content
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": body.user_prompt},
    ]
    model = body.model or get_settings(overrides).default_model
    return sse_response(stream_chat(
        lambda: client_from_settings(overrides), messages,
        model=model, temperature=body.temperature, clean=False,
    ))
