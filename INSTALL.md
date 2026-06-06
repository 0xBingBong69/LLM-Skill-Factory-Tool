# 🛠️ Installation & Setup Guide (step by step)

Never used Python or a terminal before? No problem. This guide takes you from zero to a running
app in about 10 minutes. Pick the section for your operating system where it matters.

> **TL;DR for the impatient:** install Python 3.10+, download this project, then run
> `pip install -r requirements.txt` and `streamlit run app.py`. The detailed steps are below.

---

## What you'll need
- A computer running **Windows, macOS, or Linux**.
- **One** API key from a supported provider (OpenRouter is the easiest — see Step 6).
- ~10 minutes.

---

## Step 1 — Open a terminal

The "terminal" (a.k.a. command line) is where you type the commands below.

- **Windows:** press `Win + R`, type `powershell`, press Enter.
- **macOS:** press `Cmd + Space`, type `Terminal`, press Enter.
- **Linux:** press `Ctrl + Alt + T` (or open your "Terminal" app).

---

## Step 2 — Install Python 3.10 or newer

First check whether you already have it. Type:

```bash
python --version
```

If that prints `Python 3.10.x` or higher, skip to Step 3. If it says "not found" or shows 3.9 or
lower, try `python3 --version`. Still no luck? Install it:

- **Windows:** download from [python.org/downloads](https://www.python.org/downloads/) and run the
  installer. **Important:** on the first screen, tick **"Add python.exe to PATH"** before clicking
  Install. (Or, if you have it, run `winget install Python.Python.3.12`.)
- **macOS:** easiest is [Homebrew](https://brew.sh): `brew install python`. Or use the
  [python.org installer](https://www.python.org/downloads/macos/).
- **Linux (Debian/Ubuntu):** `sudo apt update && sudo apt install -y python3 python3-venv python3-pip`

> **`python` vs `python3`:** on macOS/Linux the command is often `python3` (and `pip3`). On Windows
> it's usually `python`. Use whichever one Step 2 showed a version for.

---

## Step 3 — Download the project

**Option A — with Git (recommended):**

```bash
git clone https://github.com/0xBingBong69/LLM-Skill-Factory-Tool.git
cd LLM-Skill-Factory-Tool
```

(No Git? Install it from [git-scm.com](https://git-scm.com/downloads), or use Option B.)

**Option B — download a ZIP (no Git):**
1. Open the repo on GitHub, click the green **`< > Code`** button → **Download ZIP**.
2. Unzip it.
3. In your terminal, move into the unzipped folder, e.g. `cd Downloads/LLM-Skill-Factory-Tool-main`.

---

## Step 4 — Create a virtual environment (recommended)

This keeps the tool's dependencies separate from the rest of your system.

```bash
python -m venv .venv
```

Then **activate** it:

- **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`
  - If you get a script-execution error, run this once, then try again:
    `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
- **Windows (Command Prompt):** `.venv\Scripts\activate.bat`
- **macOS / Linux:** `source .venv/bin/activate`

When it's active you'll see `(.venv)` at the start of your prompt. (Use `python3`/`pip3` instead of
`python`/`pip` if that's what your system uses.)

---

## Step 5 — Install the tool's dependencies

```bash
pip install -r requirements.txt
```

If `pip` is "not found", use `python -m pip install -r requirements.txt`. This downloads Streamlit
and the other libraries (takes a minute or two).

---

## Step 6 — Get an API key

You only need **one**. The app brings your own key — it's never shared or stored on a server.

| Provider | Get a key |
|---|---|
| **OpenRouter** (easiest — one key, many models) | https://openrouter.ai/keys |
| **MiniMax** | https://platform.minimax.io/ |
| **Kimi (Moonshot)** | https://platform.moonshot.ai/console/api-keys |

---

## Step 7 — Tell the app your key (two ways)

**Option A — paste it in the app (simplest):** skip ahead to Step 8, then paste the key on the
**Config** page. It lives only in that browser session.

**Option B — save it in a file (so you don't re-enter it):** make a copy of the example file and
edit it.

- **macOS / Linux:** `cp .env.example .env`
- **Windows:** `copy .env.example .env`

Open the new `.env` file in any text editor and set the key for your provider, for example:

```
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-your-key-here
```

Save the file. (`.env` is git-ignored, so your key won't be committed.)

---

## Step 8 — Run it!

```bash
streamlit run app.py
```

Your browser should open automatically at **http://localhost:8501**. If it doesn't, open that
address yourself. To stop the app, press `Ctrl + C` in the terminal.

---

## Step 9 — Make your first skill

1. **Config** tab → choose your **Provider**, paste your key (if you didn't use `.env`), then click
   **Fetch models** (optional).
2. **New Skill** tab → give it a name (e.g. `backend-api-engineer`), a short "use when…" description,
   pick a type → **Continue to outline**.
3. Click **Generate outline**, tweak it, then **Generate draft**.
4. Review the live preview + validation, then **Save version**.
5. Your file is saved at `skills/<name>/v1/SKILL.md`. Try it in the **Playground**, or generate a
   whole family of related skills in **Batch**.

---

## Running it again next time

```bash
cd path/to/LLM-Skill-Factory-Tool
# re-activate the virtual environment:
#   Windows:  .venv\Scripts\Activate.ps1
#   mac/Linux: source .venv/bin/activate
streamlit run app.py
```

---

## Prefer Docker? (optional, no Python setup needed)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. From the project folder:
   ```bash
   docker build -t skill-factory .
   docker run -p 8501:8501 -e OPENROUTER_API_KEY=sk-or-... skill-factory
   ```
3. Open http://localhost:8501.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `python: command not found` | Try `python3`. On Windows, reinstall Python and tick **Add to PATH**. |
| `pip: command not found` | Use `python -m pip ...` (or `python3 -m pip ...`). |
| `streamlit: command not found` | Activate the virtual environment (Step 4), then re-run Step 5. |
| PowerShell won't activate the venv | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then activate again. |
| `Port 8501 is already in use` | Run `streamlit run app.py --server.port 8502`. |
| App says "No API key" | Set it on the **Config** page, or in `.env` (Step 7). |
| Model error like "model not found" | On **Config**, click **Fetch models** and pick one, or type a current model id. |
| PDF upload is disabled | It's optional — paste text instead. To enable, ensure `pypdf` installed correctly. |
| Nothing happens / network errors | Check your internet and that your firewall allows your provider's API domain. |

Still stuck? Open an issue on the repository with the exact command you ran and the full error text.
