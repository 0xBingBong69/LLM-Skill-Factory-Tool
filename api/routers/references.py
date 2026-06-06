"""Reference-material extraction (text/markdown always; PDF if pypdf present)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Form, UploadFile

from skill_factory.references import combine_references, extract_text_from_upload

from ..schemas import ReferenceFileOut, ReferencesOut

router = APIRouter(tags=["references"])


@router.post("/references/extract", response_model=ReferencesOut)
async def extract(
    pasted: Annotated[str, Form()] = "",
    files: list[UploadFile] | None = None,
) -> ReferencesOut:
    """Extract + combine pasted text and uploaded files into one context blob.

    Per-file failures (e.g. an unsupported PDF when pypdf is missing) are reported
    on that file's entry without failing the whole request.
    """

    file_reports: list[ReferenceFileOut] = []
    extracted: list[tuple[str, str]] = []
    for up in files or []:
        data = await up.read()
        try:
            text = extract_text_from_upload(up.filename or "upload", data)
            extracted.append((up.filename or "upload", text))
            file_reports.append(ReferenceFileOut(name=up.filename or "upload", chars=len(text)))
        except Exception as exc:  # noqa: BLE001 - surface per-file, keep going
            file_reports.append(ReferenceFileOut(name=up.filename or "upload", error=str(exc)))

    combined = combine_references(pasted, extracted)
    return ReferencesOut(combined=combined, files=file_reports)
