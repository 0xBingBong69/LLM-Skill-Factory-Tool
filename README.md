# 🏭 LLM Skill Factory

A domain-agnostic **Skill Studio** for rapidly authoring high-quality, production-ready
`SKILL.md` files — modular expert system prompts that make an LLM dramatically better at a
specific kind of work.

Build a skill for a **backend engineer**, a **quant researcher**, a **robotics designer**, a
**financial analyst**, or anything else. The tool is generic by design and powered by
[OpenRouter](https://openrouter.ai) (bring your own API key).

> The leverage comes from a strong built-in **meta-skill** plus a **multi-stage,
> human-in-the-loop** pipeline — structured generation beats one-shot prompting.

The UI is a modern **React** single-page app talking to a **FastAPI** service that wraps the
Python core. (A legacy Streamlit UI is still available — see [below](#legacy-streamlit-ui).)

---

## Features

- **Multi-stage generation pipeline** with approval gates: *outline → (optional) context →
  draft → refine → validate → save* — with **streaming** generation (tokens appear live).
- **Skill types**: domain-expert, specialist, workflow, hybrid.
- **Hierarchical skills**: a base skill plus specialist **overlays** that extend it.
- **Batch generator**: produce one overlay per entity from a base skill, with **live per-item
  progress** (entities from a JSON preset or pasted list).
- **Versioned, filesystem-first library**: every skill is plain `SKILL.md` + `metadata.json`,
  git-friendly and inspectable.
- **Editor** with a CodeMirror editor, live markdown preview, a best-practice **validator**,
  **side-by-side version diffs**, debounced **autosave**, and targeted LLM "refine".
- **Testing playground**: run a skill as a system prompt against any OpenRouter model
  (streaming) and record thumbs/notes.
- **Reference material ingestion**: paste text or upload files (`.txt`/`.md`; `.pdf` when `pypdf`
  is available).
- **Export**: download a skill as a zip (with a usage guide).
- **Polished UX**: light/dark themes, accessible Radix-based components, a ⌘K command palette,
  guided first-run onboarding, and responsive layouts.

---

## Architecture

```
web/ (React + Vite + Tailwind SPA)
   │  fetch + X-OpenRouter-Key header; SSE for streamed generation
   ▼
api/ (FastAPI) ── wraps, unchanged ──▶ skill_factory/ (pure Python core)
   └─ in production also serves web/dist as static files (single container)
```

- `skill_factory/` — all logic (pipeline, validator, store, OpenRouter client). No UI imports.
- `api/` — thin FastAPI layer exposing the core over REST + SSE. OpenAPI docs at `/docs`.
- `web/` — the React frontend. In dev it runs on Vite and proxies `/api` to the API.

---

## Quickstart

### Docker (recommended)

Builds the frontend and serves everything from one container on port 8000:

```bash
docker build -t skill-factory .
docker run -p 8000:8000 -e OPENROUTER_API_KEY=sk-or-... skill-factory
# open http://localhost:8000
```

You can also paste your key into the in-app **Config** page (kept in the browser tab only,
never written to disk).

### Local development (two processes)

```bash
# 1. Backend (FastAPI on :8000)
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# 2. Frontend (Vite on :5173, proxies /api -> :8000)
cd web
npm install
npm run dev
# open http://localhost:5173
```

Optionally `cp .env.example .env` and set `OPENROUTER_API_KEY` to have the server pick it up
automatically. Then open the app, finish onboarding (paste/test your key), and head to
**New Skill**.

### Production build (no Docker)

```bash
cd web && npm ci && npm run build      # outputs web/dist
cd .. && uvicorn api.main:app --port 8000   # serves the SPA + API on :8000
```

---

## How it works

The **New Skill** wizard walks three gates, with you in control at each step:

1. **Specify** — name, type, trigger description, domain, tags, requirements, tone, token budget,
   optional reference material, and an optional base skill to extend.
2. **Outline** — the model proposes a section outline; you edit it freely before drafting.
3. **Draft** — the model writes the full `SKILL.md`. Preview it, run the validator, then save it
   as a version (or open it in the **Editor** to refine sections via the LLM).

Open any saved skill in the **Editor** to hand-edit, re-validate, refine with the LLM, and save
new versions. Try it in the **Playground**, or generate a family of specialists in **Batch**.

### What makes a good `SKILL.md`?

The built-in meta-skill enforces these conventions (and the validator checks them):

- **Frontmatter**: a kebab-case `name` and a `description` that states *what the skill does* **and**
  *when to use it* (trigger conditions). The description drives activation — make it specific.
- **Imperative voice** aimed at the model that will run the skill ("Always…", "Check the
  following…").
- **Only non-obvious, high-value knowledge** — don't restate what a capable model already knows.
- **Actionable** frameworks, checklists, and output templates; at least one concrete example.
- **Progressive disclosure** — keep the main file focused; push deep detail into references.

See ready-made examples in [`examples/`](examples/): `backend-api-engineer`,
`quant-research-analyst`, `financial-statement-analyst`.

---

## Storage layout

```
skills/
└── <skill-name>/
    ├── v1/
    │   ├── SKILL.md
    │   └── metadata.json
    └── v2/
        └── ...
```

`skills/` is gitignored by default (your generated skills are yours). `metadata.json` records
type, tags, domain, entities, base skill, version notes, the model used, and playground results.

## Presets (for batch generation)

Presets are **generic data** under [`presets/`](presets/). A preset is a JSON file listing named
entities; the batch generator turns each into a specialist overlay of a base skill. Ships with
`qse-banks.json` purely as an example — add your own (`s-and-p-500.json`, `microservices.json`,
`robot-platforms.json`, …).

---

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter key (required) | — |
| `OPENROUTER_DEFAULT_MODEL` | Default generation model | `anthropic/claude-sonnet-4.6` |
| `OPENROUTER_APP_TITLE` / `OPENROUTER_APP_URL` | Sent to OpenRouter for attribution | — |
| `SKILLS_DIR` | Where skills are written | `./skills` |

The API key is resolved as: **in-app input → environment → `.env`**, and is never written to disk
by the app. In the web UI the key is held in the browser tab (`sessionStorage`) and sent to the
API per request via the `X-OpenRouter-Key` header — the server never persists or logs it.

---

## Development

```bash
# Python: core round-trips, validator rules, pipeline (mocked), and FastAPI route tests
pip install -r requirements.txt
pytest

# Frontend: unit tests + production build (type-check)
cd web
npm install
npm run test
npm run build
```

The core package [`skill_factory/`](skill_factory/) contains all logic and has **no UI imports**,
so it is fully unit-testable and reusable. The API layer is [`api/`](api/) and the frontend is
[`web/`](web/). Regenerate the typed API client with `npm run gen:types` (against a running
server's `/openapi.json`).

### Legacy Streamlit UI

The original Streamlit app is still available and shares the same core:

```bash
streamlit run app.py     # http://localhost:8501
```

It will be removed once the web app has been validated against your workflows.

## Roadmap (deferred)

The interfaces/seams for these are in place; they were intentionally left out of v1:

- **Web research provider** (Tavily/Brave) for automatic context injection — see
  `skill_factory/research.py`.
- **SQLite search index** for very large libraries (filesystem + filters cover smaller ones).
- Richer test-result analytics dashboards.

## License

MIT — see [LICENSE](LICENSE).
