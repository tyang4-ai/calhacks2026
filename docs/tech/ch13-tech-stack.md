---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
captured: 2026-10-22
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
---

# Cindia tech stack

> **Repo copy, Oct 24.** The folders this note calls `docs/<library>/` are at `docs/tech/<library>/` in the repo. The versions here are v1's. The v2 backend's versions are in `docs/tech/README.md`.

Versions checked on npm and PyPI on Oct 22, 2026. Official docs for every piece are saved under `resources/tech/docs/` (table at the end), so the build works with bad Wi-Fi. Spec: [[cindia-spec]] · Hub: [[cal-hacks-13]]

This is the default plan. The open choices (FastAPI or Node, SheetJS or openpyxl, where the matcher runs) are in [[cindia-spec]], section 10.

## At a glance

| Layer | Pick | Version | Install | Local docs |
|---|---|---|---|---|
| App | React + TypeScript, from the Vite template | React 19.3.1 | `npm create vite@latest cindia -- --template react-ts` | `docs/vite/` |
| Build and dev server | Vite | 8.3.5 | comes with the template | `docs/vite/` |
| Styling | Tailwind CSS v4 | 4.3.3 | `npm install tailwindcss @tailwindcss/vite` | `docs/tailwindcss/` |
| Animation | Motion (formerly Framer Motion) | 14.6.0 | `npm install motion` | `docs/motion/` |
| Charts (suggested) | Recharts | 3.10.1 | `npm install recharts react-is` | `docs/recharts/` |
| Excel in the browser | SheetJS Community Edition | 0.20.3 | `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | `docs/sheetjs/` |
| Backend, Python option | FastAPI | 0.159.1 | `pip install "fastapi[standard]"` | `docs/fastapi/` |
| Excel on the backend | openpyxl | 3.1.5 | `pip install openpyxl` | `docs/openpyxl/` |
| Backend, Node option | Express 5 and cors | 5.3.0, 2.8.6 | `npm install express cors` | `docs/npm-readmes/` |
| Claude, Python | `anthropic` | 2.1.0 | `pip install anthropic` | `docs/anthropic-sdk-python/`, `docs/claude-api/` |
| Claude, TypeScript | `@anthropic-ai/sdk` | 1.1.0 | `npm install @anthropic-ai/sdk` | `docs/anthropic-sdk-typescript/`, `docs/claude-api/` |
| Bank | Nessie API | spec 1.0.0 | key from nessieisreal.com (GitHub login) | [[ch13-sponsor-capital-one]], [[ch13-nessie-openapi-spec.yaml]] |
| Hosting | Cloudflare Pages through Wrangler | 4.151.3 | `npx wrangler pages deploy dist` | `docs/cloudflare-pages/` |
| QR codes (optional) | qrcode.react | 4.2.0 | `npm install qrcode.react` | `docs/npm-readmes/qrcode.react.md` |

Requirements: Node 20.19+ or 22.12+ for Vite 8, and Python 3.10+ for the Claude SDK and FastAPI.

## What changed recently

Code written from memory can be out of date, and some of this changed in the last few weeks.

- **The Claude API moved to version 2026-10-21 on Oct 21, 2026.** The new SDKs (Python 2.x, TypeScript 1.x) use it. A request that sends `temperature`, `top_p` or `top_k` now fails with a 400, even at the default value. Details: `docs/claude-api/migration-2026-10-21.md`.
- **Model IDs:** `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5` and `claude-fable-5-1`. Older IDs won't work. Prices per million tokens, input and output: Haiku 5.5 from $0.10 and $0.50, Sonnet 5.5 $2 and $10, Opus 5.5 $4 and $20, Fable 5.1 $10 and $50.
- **No extended thinking and no prefill.** `thinking: {"type": "enabled"}` returns a 400 on Claude 4.7 and later, and prefilling the assistant's reply isn't supported on 4.6 and later. Current models think adaptively, steered by an effort setting.
- **Getting JSON back:** `client.messages.parse()` with a Pydantic model as `output_format` (Python), or `output_config.format` with `zodOutputFormat()` (TypeScript). For tools, `"strict": true` with `"additionalProperties": false` guarantees the input matches the schema.
- **The SDK sends the key as `Authorization: Bearer`** instead of `X-Api-Key`. That only matters for a proxy that reads the header.
- **The TypeScript SDK refuses to run in the browser** unless `dangerouslyAllowBrowser` is set. Don't set it. Call Claude from the backend so the key stays secret.
- **Tailwind v4 has no `tailwind.config.js` and no `@tailwind` directives.** It's the Vite plugin plus `@import "tailwindcss";` in the CSS.
- **Framer Motion is now Motion.** Install `motion` and import from `"motion/react"`.
- **SheetJS on npm is stuck at 0.18.5.** Install the 0.20.3 tarball from cdn.sheetjs.com. The free edition writes formulas but not charts or cell styles, which are SheetJS Pro features. If the workbook needs a real Excel chart, build it with openpyxl.
- **Vite only exposes env vars that start with `VITE_`** to the browser. Never give the Claude or Nessie key that prefix.
- **The Vite react-ts template pins TypeScript ~6.0** and lints with oxlint. npm's latest TypeScript is 7.x, so leave the pin alone unless something needs 7.

## Setup, step by step

### 1. Frontend

```bash
npm create vite@latest cindia -- --template react-ts
cd cindia
npm install
npm install tailwindcss @tailwindcss/vite motion recharts react-is
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
```

The proxy forwards `/api/...` to the backend during development, so the browser never makes a cross-origin call.

The main CSS file (for example `src/index.css`) needs one line:

```css
@import "tailwindcss";
```

Motion:

```tsx
import { motion } from "motion/react"

export function Coin() {
  return <motion.div animate={{ x: 100 }} />
}
```

### 2. Backend, FastAPI option

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows. On macOS or Linux: source .venv/bin/activate
pip install "fastapi[standard]" anthropic openpyxl httpx
fastapi dev main.py
```

Keep the quotes around `"fastapi[standard]"`. It also installs Uvicorn and python-multipart, which file uploads need. `fastapi dev` serves on port 8000.

```python
from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/scenario")
async def scenario(file: UploadFile):
    text = (await file.read()).decode("utf-8")
    return {"filename": file.filename, "lines": len(text.splitlines())}
```

CORS only matters once the frontend and backend live on different hosts. The Vite proxy covers development.

### 3. Claude, from the backend

Structured output, for example the explanation behind the catch (F8):

```python
from anthropic import Anthropic
from pydantic import BaseModel

client = Anthropic()  # reads ANTHROPIC_API_KEY

class CatchExplanation(BaseModel):
    trusted_source: str
    reason: str
    follow_up_draft: str

resp = client.messages.parse(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": prompt}],
    output_format=CatchExplanation,
)
explanation = resp.parsed_output
```

A strict tool for Ask Cindy (F14):

```python
render_chart = {
    "name": "render_chart",
    "description": "Show the studio owner a chart built from ledger rows.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "kind": {"type": "string", "enum": ["bar", "line", "pie"]},
            "title": {"type": "string"},
            "labels": {"type": "array", "items": {"type": "string"}},
            "values": {"type": "array", "items": {"type": "number"}},
        },
        "required": ["kind", "title", "labels", "values"],
        "additionalProperties": False,
    },
}
```

When a reply's `stop_reason` is `"tool_use"`, send the tool call's `input` to the frontend and draw it with Recharts. The full request and reply loop is in `docs/anthropic-sdk-python/example-tools.py`, and the SDK's tool runner is in `docs/anthropic-sdk-python/tools.md`.

Which model: `claude-sonnet-5-5` is fast and a good default. Switch to `claude-opus-5-5` if the explanations aren't good enough, or to `claude-haiku-5-5` if answers feel slow during judging.

### 4. Nessie

```python
import os
import httpx

BASE = "https://prod-api.nessieisreal.com"  # Getting Started shows api.nessieisreal.com, so test both
KEY = os.environ["NESSIE_KEY"]

accounts = httpx.get(f"{BASE}/accounts", params={"key": KEY}).json()
httpx.post(
    f"{BASE}/accounts/{account_id}/deposits",
    params={"key": KEY},
    json={
        "medium": "balance",
        "transaction_date": "2026-10-24",
        "status": "completed",
        "amount": 18000,
        "description": "Cindia sale: peony piece",
    },
)
```

All five deposit fields are required, and the amount is an integer (cents here). The create call answers with a plain string, so read `GET /accounts/{id}/deposits` afterwards to find the new record. There's no way to create purchases or transfers. More in [[ch13-sponsor-capital-one]] and [[cindia-spec]] section 9.

### 5. The Excel file (F12)

In the browser, with SheetJS:

```ts
import { utils, writeFileXLSX } from "xlsx"

const ws = utils.json_to_sheet(ledgerRows)
const wb = utils.book_new()
utils.book_append_sheet(wb, ws, "Ledger")
writeFileXLSX(wb, "cindia-month-close.xlsx")
```

A formula goes in a cell's `f` field without the leading `=`, for example `{ t: "n", f: "SUM(E2:E31)" }`. A cell outside the sheet's range (`ws["!ref"]`) isn't written, so extend the range when you add one. See `docs/sheetjs/formulae.md`.

On the backend, with openpyxl, when the workbook needs a native chart:

```python
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference

wb = Workbook()
ws = wb.active
for row in rows:  # first row is the header, e.g. ("Maker", "Earnings")
    ws.append(row)

chart = BarChart()
chart.title = "Earnings by maker"
data = Reference(ws, min_col=2, min_row=1, max_row=len(rows), max_col=2)
cats = Reference(ws, min_col=1, min_row=2, max_row=len(rows))
chart.add_data(data, titles_from_data=True)
chart.set_categories(cats)
ws.add_chart(chart, "E2")
wb.save("cindia-month-close.xlsx")
```

openpyxl stores a formula as text that starts with `=` (for example `ws["B10"] = "=SUM(B2:B9)"`) and doesn't calculate it. Excel calculates it when the file opens.

### 6. Hosting and the offline copy

```bash
npm run build
npm run preview                      # serves the built app at http://localhost:4173, the offline copy
npx wrangler login                   # first time only
npx wrangler pages project create    # first time only
npx wrangler pages deploy dist
```

`vite preview` is a local preview server, not a production server, which is all the offline copy needs. The phone uses the Cloudflare URL.

## Docs on disk

Everything below is under `resources/tech/docs/`. Each file starts with a line saying where it came from.

| Folder | What's in it | How it got here |
|---|---|---|
| `claude-api/` | Models overview, tool use (overview, defining tools, handling calls, strict mode), structured outputs, errors, the 2026-10-21 migration guide | Copied from platform.claude.com. Code samples in other languages were removed |
| `anthropic-sdk-python/` | README, full API reference (`api.md`), helpers, tool helpers (`tools.md`), migration notes, two examples | Downloaded from GitHub |
| `anthropic-sdk-typescript/` | README, API reference, helpers (streaming, structured outputs, tool runner), migration note, tool example | Downloaded from GitHub |
| `vite/` | Getting started, env variables, features, server options (proxy), static deploy | Downloaded from GitHub |
| `tailwindcss/` | Installing with Vite, README | Copied from tailwindcss.com, README from GitHub |
| `motion/`, `recharts/` | READMEs | Downloaded from GitHub |
| `sheetjs/` | Install for bundlers, export example, formulae, feature list | Copied from docs.sheetjs.com |
| `fastapi/` | README and tutorials (first steps, body, CORS, files, static files), with their example code in `docs_src/` | Downloaded from GitHub |
| `openpyxl/` | Simple usage, charts introduction, bar charts | Copied from openpyxl.readthedocs.io |
| `cloudflare-pages/` | Direct upload with Wrangler, redirects | Downloaded from GitHub |
| `npm-readmes/`, `pypi-readmes/` | express, cors, wrangler, qrcode.react, openpyxl, uvicorn, python-multipart | From the npm registry and PyPI |
| `claude-code/` | The Claude Code docs the build harness relies on: subagents, `/goal`, permission modes, hooks, Remote Control, skills, worktrees, the settings and environment variable references, errors. `README.md` says which page to read for what | Copied from code.claude.com |

The full index of Claude docs pages, for when there's Wi-Fi: https://platform.claude.com/llms.txt. For Claude Code: https://code.claude.com/docs/llms.txt
