"""Server-Sent Events (SSE) helpers for streamed generation.

Event protocol consumed by the frontend:
  * ``event: token`` ``data: {"text": "..."}``     — one per streamed chunk
  * ``event: done``  ``data: {"content": "...", "model": "..."}`` — terminal payload
  * ``event: error`` ``data: {"message": "..."}``  — clean failure

For draft/refine/overlay the ``done`` ``content`` is ``clean_skill_output`` of the
full accumulated text (the model is told to emit no fences/preamble, but the cleaner
is a whole-document operation that can only run once streaming completes). Outline and
playground stream raw text and need no cleaning.
"""

from __future__ import annotations

import json
from typing import Callable, Iterator

from fastapi.responses import StreamingResponse

from skill_factory.openrouter import OpenRouterClient, OpenRouterError
from skill_factory.pipeline import clean_skill_output

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",  # disable proxy buffering so tokens flush immediately
}


def sse_format(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def stream_chat(
    build_client: Callable[[], OpenRouterClient],
    messages: list[dict[str, str]],
    *,
    model: str,
    temperature: float,
    clean: bool,
) -> Iterator[str]:
    """Drive a streamed chat completion and yield SSE event strings."""

    try:
        client = build_client()
    except OpenRouterError as exc:
        yield sse_format("error", {"message": str(exc)})
        return

    acc: list[str] = []
    try:
        for piece in client.chat(
            messages, model=model, temperature=temperature, stream=True
        ):
            acc.append(piece)
            yield sse_format("token", {"text": piece})
    except OpenRouterError as exc:
        yield sse_format("error", {"message": str(exc)})
        return
    except Exception as exc:  # defensive: never leak a stack trace mid-stream
        yield sse_format("error", {"message": f"Generation failed: {exc}"})
        return

    full = "".join(acc)
    content = clean_skill_output(full) if clean else full
    yield sse_format("done", {"content": content, "model": model})


def sse_response(generator: Iterator[str]) -> StreamingResponse:
    return StreamingResponse(
        generator, media_type="text/event-stream", headers=_SSE_HEADERS
    )
