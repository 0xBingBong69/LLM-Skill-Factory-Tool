"""Exception handlers mapping core exceptions to clean HTTP responses.

The frontend surfaces the ``detail`` message in a toast, so messages must stay
human-readable (the core already raises ``OpenRouterError`` with such messages).
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from skill_factory.openrouter import OpenRouterError


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(OpenRouterError)
    async def _openrouter(_req: Request, exc: OpenRouterError) -> JSONResponse:
        # Missing-key is a client problem; upstream/API failures are a bad gateway.
        msg = str(exc)
        status = 400 if "api key" in msg.lower() else 502
        return JSONResponse(status_code=status, content={"detail": msg})

    @app.exception_handler(ValueError)
    async def _value(_req: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(FileNotFoundError)
    async def _missing(_req: Request, exc: FileNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})
