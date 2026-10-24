# API contract

Read by every backend-builder, by the integrator, and by the scaffolder for the server skeleton. It fixes every Phase 2 endpoint: path, request, the events it returns, its timeout, its scripted fallback and the key it needs. The event shapes come from `events.md` and the entities from `data-model.md`.

## Rules for every endpoint

- **Where it runs:** FastAPI on http://localhost:8000, started by the orchestrator with `npm run server` (uvicorn with `--reload`). In the browser, the Vite dev server and the preview proxy `/api` to port 8000, so the app calls relative paths like `/api/b01/reconcile`. No CORS setup is needed.
- **Nothing in the browser calls Claude or Nessie.** Only `server/` does, with the keys from `server/config.py`. Live adapters in `src/sources/live/` call only `/api/...`.
- **One prefix per upgrade:** every route of upgrade NN lives under `/api/bNN/` and is defined in `server/routers/bNN_<slug>.py` as `router = APIRouter(prefix="/api/bNN")`. `server/main.py` includes the `router` of every module in `server/routers/` that defines one, so an upgrade never edits it. A helper module with the upgrade's prefix and no `router`, such as `server/routers/b04_nessie.py`, is skipped.
- **Requests** are JSON with `Content-Type: application/json`, except the B05 upload. Every POST body has a `trigger` field: the scripted event the adapter is replacing, the person's request event when the registry passes one on (see Requests from people in `events.md`), or `null` when nothing in the store started the call. The adapter sends the records the server needs in the body, taken from `src/mock`, because the server can't read the TypeScript dataset.
- **A success** is status 200 with the body `{ "events": CindiaEvent[] }`. Every returned event follows the envelope in `events.md`, with:
  - `source: "live"` and `key` set to the upgrade's key (`b01-match` and so on).
  - `id` as `evt_live_` plus a number, unique within the server process.
  - `at` copied from the trigger, or `0` when there is none.
  - IDs inside payloads that already exist in the dataset kept as they are. The live result replaces the scripted event for the same `matchId`, `flagId` or `approvalId`, so the screens line up.
- **An empty `events` list** means "nothing live to add". The registry then plays the scripted event, so return `[]` instead of guessing.
- **A failure** is a non-2xx status with the body `{ "error": { "code": string, "message": string } }`. `message` is one plain sentence and never contains a key, a full request or a stack trace.

| Code | Status | When |
|---|---|---|
| `bad_request` | 400 | The body doesn't match this contract |
| `not_found` | 404 | An ID in the request doesn't exist |
| `key_missing` | 503 | The upgrade needs `ANTHROPIC_API_KEY` or `NESSIE_KEY` and it isn't set |
| `upstream_timeout` | 504 | Claude or Nessie didn't answer in time |
| `upstream_error` | 502 | Claude or Nessie answered with an error |
| `invalid_model_output` | 502 | Claude's answer failed the server's checks (wrong ID, wrong number, wrong shape) |
| `internal` | 500 | Anything else |

- **Timeouts:** the registry gives `produce()` 8 seconds, so the adapter aborts its fetch at 7.5 seconds and each endpoint finishes in under 7. Every Claude call has a timeout of its own, given per endpoint below. Every Nessie call has a 5-second timeout and no retries inside a request.
- **Logging:** one line per request (route, status, milliseconds). Never log a key, a request body or Claude's raw output.
- **Claude:** the `anthropic` Python SDK 2.1.0. `claude-sonnet-5-5` by default, `claude-haiku-5-5` where an endpoint says so. Never send `temperature`, `top_p`, `top_k`, `thinking: {"type": "enabled"}` or a prefilled assistant turn. Structured answers come from `client.messages.parse()` with a Pydantic model as `output_format`, or from strict tools (`"strict": true`, `"additionalProperties": false`). The server checks every ID and amount Claude returns against the request before using it. A failed check is `invalid_model_output`, and the scripted event plays instead.
- **Nessie:** the key goes in the query string as `?key=`. Only deposits and withdrawals move money, because purchases and transfers can't be created. A create call answers with a plain string, so the server reads the list back to find the new record. Amounts are integer cents. The base URL is the first of `https://api.nessieisreal.com`, `https://prod-api.nessieisreal.com` and `https://qa-api.nessieisreal.com` that answers `GET /accounts`, found once per server process.

## `GET /api/health` (server skeleton, built in S1)

Response 200:

```json
{ "ok": true, "version": "0.1.0", "keys": { "anthropic": true, "nessie": false }, "routers": ["b01", "b04"] }
```

`keys` says only whether each key is set, never its value. `routers` lists the upgrade prefixes `main.py` loaded. Every adapter's `health()` calls this first and checks that its own prefix is listed and, if it needs one, that its key is set.

## B01 · the matcher (`b01-match`)

**`POST /api/b01/reconcile`** · no key needed · finishes in under 2 seconds

Request:

```json
{ "trigger": { "...": "a scripted match.made or flag.raised event" }, "monthId": "2026-09",
  "records": { "orders": [], "payouts": [], "refunds": [], "statements": [], "bankTxns": [], "contracts": [] } }
```

`records` holds the full objects from `data-model.md` for the month, plus the first days of the next one so the late payout can be seen.

Returns every `match.made` and `flag.raised` the matcher finds for the month, in date order. It finds:
- `one_to_one`: a payout that equals one order's settlement.
- `bundled`: a payout that equals the sum of two to four orders' settlements from the days before it.
- `refund_netted`: a payout that equals its orders minus a refund.
- `carried_over`: a payout dated after the month's last day, matched into the next month.
- `short_payment` flags: the consignment statement checked against the contract's `commissionBps` and against the bank deposit, with `expectedCents`, `actualCents` and `deltaCents`.

The scripted IDs are kept: a returned match uses the `matchId` of the scripted match with the same anchor record (its payout or refund), and a returned flag uses the scripted `flagId` of the same kind on the same statement. A live result with no scripted twin gets `mat_live_` or `flg_live_` plus a number.

**Fallback:** the scripted `match.made` and `flag.raised` events from `timelines/month.ts`.

## B02 · Claude explains the catch (`b02-explain`)

**`POST /api/b02/explain`** · `ANTHROPIC_API_KEY` · `claude-sonnet-5-5` with a 6-second timeout

Request:

```json
{ "trigger": { "...": "the scripted flag.explained event" }, "flagId": "flg_01",
  "flag": {}, "contract": {}, "statement": {}, "bankTxn": {}, "followUpId": "fup_01", "approvalId": "apr_01" }
```

Claude reads the three records and answers through `messages.parse()` with this model:

```python
class CatchExplanation(BaseModel):
    trusted_record_id: str        # must be one of the flag's recordIds
    delta_cents: int              # must equal the flag's deltaCents
    explanation_en: str           # two or three plain sentences, first person as Cindy
    explanation_zh: str
    follow_up_subject_en: str
    follow_up_subject_zh: str
    follow_up_body_en: str        # a polite note to the gallery asking for the difference
    follow_up_body_zh: str
```

Returns a `flag.explained` with the same `flagId`, plus a `followup.drafted` for `followUpId` once that event is in `events.md`. The server rejects an answer whose `trusted_record_id` or `delta_cents` doesn't match the request (`invalid_model_output`).

**Fallback:** the scripted `flag.explained` and the follow-up text in `src/mock`. Sending the follow-up stays simulated: `followup.sent` is never real.

## B03 · the proof panel scores the matcher (`b03-proof`)

**`POST /api/b03/score`** · no key needed · under 2 seconds · builds on B01

Request:

```json
{ "trigger": { "...": "the scripted proof.scored event" }, "monthId": "2026-09",
  "records": { "...": "same shape as B01" }, "answerKey": [] }
```

`answerKey` is the list from `src/mock/answerKey.ts`. The server runs B01's matcher (it imports `reconcile_month` from `server/routers/b01_match.py`) and marks each planted error caught when the matcher reported exactly what the answer key expects.

Returns one `proof.scored` with `caught`, `total` and one result per planted error.

**Fallback:** the scripted `proof.scored` (4 of 4).

## B04 · Nessie, the studio's bank account (`b04-bank`)

Needs `NESSIE_KEY`. The server keeps the Nessie customer and account IDs in memory once found or created.

**`GET /api/b04/status`** · returns `{ "seeded": boolean, "accountId": string | null, "balanceCents": number | null }` (this is not an events response, the adapter's `health()` reads it).

**`POST /api/b04/seed`** · up to 30 seconds, called once by the adapter's `health()` in live mode, never during the demo's 8-second window

Request: `{ "trigger": null, "studio": {}, "history": { "deposits": [], "withdrawals": [] } }`, where `history` is September's bank transactions from `src/mock`, except the buyer's sale (`pay_001`) and the maker payouts.

Idempotent. When an account nicknamed "Gu studio operating" already has deposits, it does nothing. Otherwise it creates the customer (a fictional US mailing address), a Checking account, and one deposit or withdrawal per history line. Returns `{ "events": [account.synced] }`.

**`POST /api/b04/sale`** · under 4 seconds

Request: `{ "trigger": { "...": "the scripted order.placed or money.moved for the sale" }, "orderId": "ord_001", "payoutId": "pay_001", "netCents": 15648, "date": "2026-09-01", "description": "Cindia sale ord_001, Peony fan, net of fees" }`

Creates one deposit of `netCents`, reads the deposits back, then the account. Returns the `order.placed` and the settlement `money.moved` (same `moveId` as the scripted one), and an `account.synced` with Nessie's balance.

**`POST /api/b04/payouts`** · under 6 seconds

Request: `{ "trigger": { "...": "a scripted payout.sent" }, "makerPayouts": [ { "makerPayoutId": "mpo_01", "makerId": "mkr_01", "amountCents": 0, "date": "2026-10-02" } ] }`

Creates one withdrawal per maker payout, described "Maker payout mpo_01", then reads the account. Returns a `payout.sent` and a `maker_pay` `money.moved` per payout, and one `account.synced`.

**Fallback:** the scripted money events and balances. Without the key, `health()` is false and the money map stays scripted with its `Simulated` badge.

## B05 · the judge's scenario (`b05-scenario`)

**`POST /api/b05/scenario`** · multipart form · no key needed · under 3 seconds · builds on B01

Form fields: `trigger` (the event as a JSON string), `file` (a CSV or a JSON statement, at most 1 MB), `monthId`, and `records` (the month's records as a JSON string, same shape as B01). `python-multipart` comes with `fastapi[standard]`.

The CSV columns are `date,orderId,pieceId,saleCents,commissionBps,netCents`, one statement line per row. A JSON file is a Statement object from `data-model.md`. The server parses the file into a statement with the ID `stm_scn_` plus a number, runs B01's matcher over the month's records plus that statement, and returns a `scenario.loaded`, then every `match.made` and `flag.raised` that involves the new statement.

A file that doesn't parse returns `bad_request` with a sentence naming the first bad row.

**Fallback:** the held-back statement in `src/mock/scenario.ts`, played through the scripted events.

## B06 · the month-close workbook (`b06-workbook`)

**`POST /api/b06/workbook`** · no key needed · under 5 seconds

Request: `{ "trigger": { "...": "the scripted workbook.ready" }, "monthId": "2026-09", "records": { "orders": [], "payouts": [], "statements": [], "bankTxns": [], "ledger": [], "makerStatements": [] } }`

Builds `cindia-close-2026-09.xlsx` with openpyxl 3.1.5. Sheets: `Ledger`, `Reconciliation`, `Profit and loss`, `Makers`. Totals are Excel formulas (`=SUM(...)`), and `Makers` carries a native bar chart of each maker's earnings. The file goes to `artifacts/files/` (not committed).

Returns a `workbook.ready` with `monthId`, `fileName` and `sheets`.

**`GET /api/b06/files/{fileName}`** serves a built workbook (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), or `not_found`.

**Fallback:** the workbook the browser builds with SheetJS from `src/mock`, which has formulas but no chart.

## B07 · Ask Cindy (`b07-ask`)

**`POST /api/b07/ask`** · `ANTHROPIC_API_KEY` · `claude-sonnet-5-5`, at most 4 tool rounds, 6.5 seconds in total

Request: `{ "trigger": { "...": "an ask.asked event, scripted or from the owner" }, "questionId": "q_01", "text": "这个月哪件作品最赚钱?", "lang": "zh", "records": { "orders": [], "catalog": [], "makerStatements": [], "flags": [] } }`

Claude answers by calling strict tools that the server runs over `records`:
- `revenue_by_piece`, `revenue_by_channel`, `maker_earnings` and `find_records` return rows computed in Python, never invented.
- `answer` ends the loop. Its input is `{ answer_en, answer_zh, chart, ref_ids }`, where `chart` is a ChartSpec from `events.md` or `null`, and every ID in `ref_ids` must be in `records`.

Returns one `ask.answered` with the trigger's `questionId`. Out of rounds or out of time: `upstream_timeout`.

**Fallback:** the three canned answers in `src/mock/ask.ts`. A question with no canned answer gets the canned "In the scripted demo I can answer these three questions" reply.

## B08 · approvals on a second screen (`b08-approvals`)

No key needed. The server holds approvals in memory, so a restart clears them.

| Route | Called by | Does | Returns |
|---|---|---|---|
| `POST /api/b08/approvals` | the console's adapter, on `approval.requested` | Registers the approval as pending. Body: `{ "trigger": {...}, "approvalId": "apr_02" }` | `approval.requested` |
| `GET /api/b08/approvals?status=pending` | the owner's phone, every 2 seconds | Lists pending approvals | `approval.requested`, one per pending approval |
| `POST /api/b08/approvals/{approvalId}/decision` | the owner's phone, when the owner taps | Body: `{ "trigger": null, "decision": "granted" \| "declined", "reason": { "en": "", "zh": "" } }` | `approval.granted` or `approval.declined`, `source: "live"`, `by: "own_01"` |
| `GET /api/b08/approvals/{approvalId}?wait=6` | the console's adapter, on the scripted `approval.granted` | Waits up to `wait` seconds (at most 6) for the owner's decision | the decision event, or `[]` when there is none yet |
| `GET /api/b08/status` | the console's adapter, before it waits | Says whether an owner screen polled in the last 10 seconds | `{ "ownerConnected": boolean }` (not an events response) |

- A second decision on the same approval changes nothing and returns the first decision again, with status 200.
- The console's adapter only waits when `ownerConnected` is true. With no owner screen open it returns `[]` at once, so the scripted grant plays on time.

**Fallback:** with no decision in time, the scripted `approval.granted` plays, so the 60-second run never waits on a phone.

## B09 · the shopping concierge (`b09-concierge`)

**`POST /api/b09/concierge`** · `ANTHROPIC_API_KEY` · `claude-haiku-5-5` with a 4-second timeout, because it opens the demo

Request: `{ "trigger": { "...": "the scripted concierge.answered, or the buyer's own concierge.asked" }, "query": "a gift under $200 for my mom, she loves peonies", "lang": "en", "catalog": [] }`

`catalog` holds every piece with its title, price, maker, hours and story. Claude answers through `messages.parse()` with exactly three picks, each `{ piece_id, reason_en, reason_zh }`. The server checks that every `piece_id` is in the catalog, that there are three different ones, and that a price limit stated in the query holds.

Returns one `concierge.answered` with the query, the three `pieceIds` in Claude's order and their `reasons`.

**Fallback:** the scripted answer (`pc_01`, `pc_07`, `pc_11`).

## B10 · numbers derived from the ledger (`b10-derived`)

**`POST /api/b10/derive`** · no key needed · under 2 seconds

Request: `{ "trigger": { "...": "a scripted split.shown, receipt.updated, statement.issued or impact.updated" }, "records": { "catalog": [], "orders": [], "payouts": [], "makerPayouts": [], "ledger": [], "contracts": [] } }`

Computes the trigger's event from the records with the money rules in `data-model.md`, and returns that one event:
- `split.shown`: the fees, materials and maker share for the piece, using the channel's rules.
- `receipt.updated`: `paid_to_maker`, with `paidDate`, once the maker's payout for that order is `sent`.
- `statement.issued` and `impact.updated`: the same IDs, recomputed. Their numbers can only reach the screen once `events.md` gives these events payload fields for them.

**Fallback:** the scripted events and the hardcoded numbers in `src/mock`.

## What the server skeleton provides (S1)

- `server/requirements.txt` pins `fastapi[standard]==0.159.1` (which brings uvicorn, httpx and python-multipart), `anthropic==2.1.0`, `openpyxl==3.1.5` and `pytest`.
- `server/config.py` reads `.env` once and exposes `ANTHROPIC_API_KEY`, `NESSIE_KEY`, `MODEL_DEFAULT = "claude-sonnet-5-5"` and `MODEL_FAST = "claude-haiku-5-5"`. It never prints or returns a value.
- `tests/server/conftest.py` gives a `client` fixture (FastAPI's TestClient on `server.main:app`), registers a `live` marker, and offers `needs_key(name)`, which skips a test when that key isn't set.
- `npm run test:server` runs `pytest tests/server` with live tests included, so each one runs when its key is present and skips otherwise.

## Contract tests

Each upgrade's tests in `tests/server/test_bNN_<slug>.py` check, without a network call: the 200 response shape and every returned event against `events.md`, the error shape for a bad body, and that a missing key gives `key_missing`. One test marked `live` makes a single real call. Fixtures go in `tests/server/bNN_<name>.json`, written from the demo-critical figures in `data-model.md`.
