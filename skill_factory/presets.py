"""Generic, data-driven entity presets used by the batch generator.

A preset is just a JSON file under ``presets/`` describing a named list of
entities. Nothing about presets is domain-specific — ``qse-banks.json`` ships
purely as an example; users can add ``s&p-500.json``, ``microservices.json``,
``robot-platforms.json``, etc.

Format::

    {
      "name": "QSE Banks",
      "description": "Banks listed on the Qatar Stock Exchange.",
      "entities": [
        {"name": "Qatar National Bank", "ticker": "QNBK", "notes": "..."}
      ]
    }
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def list_presets(presets_dir: Path) -> list[str]:
    """Return preset file stems (without .json), sorted."""

    p = Path(presets_dir)
    if not p.exists():
        return []
    return sorted(f.stem for f in p.glob("*.json"))


def load_preset(presets_dir: Path, stem: str) -> dict[str, Any]:
    path = Path(presets_dir) / f"{stem}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def save_preset(presets_dir: Path, stem: str, preset: dict[str, Any]) -> Path:
    p = Path(presets_dir)
    p.mkdir(parents=True, exist_ok=True)
    path = p / f"{stem}.json"
    path.write_text(json.dumps(preset, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def entity_labels(preset: dict[str, Any]) -> list[str]:
    """Human-friendly labels ('Name (TICKER)') for each entity in a preset."""

    labels = []
    for e in preset.get("entities", []):
        name = e.get("name", "").strip()
        ticker = e.get("ticker", "").strip()
        labels.append(f"{name} ({ticker})" if ticker else name)
    return [x for x in labels if x]
