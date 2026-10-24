---
paths:
  - "server/**/*.py"
  - "tests/server/**/*.py"
---

# Backend rules

Stack: Python 3.12 or later, FastAPI 0.159 installed as `fastapi[standard]` (that brings Uvicorn, plus `python-multipart`, which file uploads need), `anthropic` 2.1.0, openpyxl 3.1.5 and httpx. Setup is in `ch13-tech-stack.md` in the vault docs folder.

- **One router per upgrade** in `server/routers/bNN_<slug>.py`. `server/main.py` includes every router it finds, so an upgrade never edits `main.py`.
- **Routes** live under `/api` and match `api-contract.md` exactly, including the error shape.
- **Keys:** the server config module reads `ANTHROPIC_API_KEY` and `NESSIE_KEY` from `.env`. Nothing else reads keys. Never print, log or return a key, and never put one in an error message.
- **Claude API, version 2026-10-21:** model IDs are `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-5-5`. Sending `temperature`, `top_p` or `top_k` returns a 400, and so does `thinking: {"type": "enabled"}`. Prefilled assistant turns aren't supported. Remove those first when a call returns 400.
- **JSON from Claude:** `client.messages.parse()` with a Pydantic model as `output_format`, then read `resp.parsed_output`. For tools, `"strict": True` with `"additionalProperties": False`.
- **The Python SDK just changed major versions.** Check `README.md`, `MIGRATION.md` and `api.md` in `docs/anthropic-sdk-python/` in the vault docs folder before writing SDK code from memory.
- **Nessie:** the key goes in the query string as `?key=`. There's no way to create purchases or transfers, so use deposits and withdrawals. All five deposit fields are required and amounts are integers. A create call answers with a plain string, so GET the list afterwards to find the new record. Use the base URL `ch13-tech-stack.md` gives, and test both hosts it names.
- **Every outbound call has a timeout.** On a 429, a 529, a timeout or any other error, return the error shape so the adapter falls back to scripted events. The demo never waits on a live call.
- **Excel with a native chart** is built with openpyxl, since SheetJS Community can't write charts. openpyxl stores a formula as text starting with `=` and doesn't calculate it. Excel does when the file opens.
- **Tests** use FastAPI's TestClient, which starts no server. Each upgrade has one test marked live that makes a single real call and is skipped when its key is missing. No live calls in loops.
- **CORS** isn't needed in development, because the Vite proxy forwards `/api` from 5173 to 8000.
