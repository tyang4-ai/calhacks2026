---
paths:
  - "server/**/*.py"
  - "tests/server/**/*.py"
---

# Backend rules

Stack: Python 3.12 or later, FastAPI 0.159 installed as `fastapi[standard]` (that brings Uvicorn, plus `python-multipart`, which file uploads need), `anthropic` 2.1.0, openpyxl 3.1.5 and httpx. Setup is in `docs/tech/ch13-tech-stack.md`.

- **One router per upgrade** in `server/routers/bNN_<slug>.py`. `server/main.py` includes every router it finds, so an upgrade never edits `main.py`.
- **Routes** live under `/api` and match `api-contract.md` exactly, including the error shape.
- **Keys:** only `server/config.py` reads keys. It reads the process environment first, then `.env`. In the cloud session the keys are the cloud environment's variables, and on the Windows machines they're in `.env`. The names are in `docs/v2/contracts.md` section 1: `CINDIA_ANTHROPIC_API_KEY` (read first, and `ANTHROPIC_API_KEY` only when it's unset), `NESSIE_KEY`, `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `APIFY_TOKEN`, `HF_TOKEN` and `SPACETIME_TOKEN`, plus the names that aren't secret: `CINDIA_HF_REPO`, `CINDIA_MODEL_DIR`, `SPACETIME_URL`, `SPACETIME_DB` and `PUBLIC_SITE_URL`. Build outside headers only through `config.elastic_headers()`, `config.apify_headers()` and `config.spacetime_headers()`. Each returns an empty dict in proxy mode (`ELASTIC_AUTH=proxy` or `APIFY_AUTH=proxy`, when a cloud network secret attaches the key) or when its key or token is unset. `has_key()` reads config's resolved values, never `os.environ`. Never print, log or return a key, never put one in an error message or a URL you log, and never assert on headers in a test.
- **Claude API, version 2026-10-21:** model IDs are `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-5-5`, and the platform uses only `claude-haiku-5-5` and `claude-sonnet-5-5` (`config.ALLOWED_MODELS`). No Opus and no Fable, and a test fails on any other model ID. Every Claude client takes its base URL from `config.CLAUDE_BASE_URL`. Sending `temperature`, `top_p` or `top_k` returns a 400, and so does `thinking: {"type": "enabled"}`. Prefilled assistant turns aren't supported. Remove those first when a call returns 400.
- **JSON from Claude:** `client.messages.parse()` with a Pydantic model as `output_format`, then read `resp.parsed_output`. For tools, `"strict": True` with `"additionalProperties": False`.
- **The Python SDK just changed major versions.** Check the SDK pages in `docs/tech/anthropic-sdk-python/` (`README.md`, `MIGRATION.md` and `api.md`) and `docs/tech/claude-api/` before writing SDK code from memory.
- **Nessie:** the key goes in the query string as `?key=`. There's no way to create purchases or transfers, so use deposits and withdrawals. All five deposit fields are required and amounts are integers. A create call answers with a plain string, so GET the list afterwards to find the new record. Use the base URL `docs/tech/ch13-tech-stack.md` gives, and test both hosts it names.
- **Every outbound call has a timeout.** On a 429, a 529, a timeout or any other error, return the error shape so the adapter falls back to scripted events. The demo never waits on a live call.
- **Excel with a native chart** is built with openpyxl, since SheetJS Community can't write charts. openpyxl stores a formula as text starting with `=` and doesn't calculate it. Excel does when the file opens.
- **Tests** use FastAPI's TestClient, which starts no server. Each upgrade has one test marked live that makes a single real call and is skipped when its key or service is missing (`needs_key()` and `needs_service()` from `tests/server/conftest.py`). Outside live tests, an autouse fixture swaps every key in `config` for a fake and clears the `*_AUTH` flags. No live calls in loops.
- **CORS** isn't needed in development, because the Vite proxy forwards `/api` from 5173 to 8000.
