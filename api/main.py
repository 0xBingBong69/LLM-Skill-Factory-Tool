"""FastAPI application for the LLM Skill Factory.

Run (dev):   uvicorn api.main:app --reload --port 8000
Serve (prod): the same process also serves the built SPA from ``web/dist``.
"""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from skill_factory.config import PROJECT_ROOT

from .errors import install_error_handlers
from .routers import config, generate, playground, presets, references, skills

app = FastAPI(title="LLM Skill Factory API", version="1.0.0")

# CORS: with the Vite dev proxy, requests are same-origin; allow common localhost
# origins so the frontend may also call the API directly. Override via CORS_ORIGINS.
_DEV_ORIGINS = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:8000", "http://127.0.0.1:8000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", ",".join(_DEV_ORIGINS)).split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

install_error_handlers(app)

for _router in (
    config.router, skills.router, generate.router,
    playground.router, references.router, presets.router,
):
    app.include_router(_router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Serve the built SPA (prod). Absent in dev — Vite serves the frontend instead.
# ---------------------------------------------------------------------------
DIST = (PROJECT_ROOT / "web" / "dist").resolve()


@app.get("/{full_path:path}", include_in_schema=False)
def spa(full_path: str) -> FileResponse:
    # Never let the SPA catch-all shadow the API or the docs.
    if full_path.startswith("api") or full_path in {"docs", "redoc", "openapi.json"}:
        raise HTTPException(status_code=404, detail="Not found")
    candidate = (DIST / full_path).resolve()
    if full_path and candidate.is_file() and candidate.is_relative_to(DIST):
        return FileResponse(candidate)  # static asset (js/css/favicon)
    index = DIST / "index.html"
    if index.is_file():
        return FileResponse(index)  # SPA entry — client-side routing handles the path
    raise HTTPException(
        status_code=404,
        detail="Frontend not built. Run: npm --prefix web ci && npm --prefix web run build",
    )
