# API contract

Read by every backend-builder, by the integrator, and by the scaffolder for the server skeleton. It fixes every endpoint, B01 to B16: path, request, the events it returns, its timeout, its scripted fallback and the key it needs, plus the agent roster B14 runs. The event shapes come from `events.md` and the entities from `data-model.md`.

## Rules for every endpoint

- **Where it runs:** FastAPI on http://localhost:8000, started by the orchestrator with `npm run server`. `scripts/server.mjs` starts uvicorn with `--reload` and `--timeout-graceful-shutdown 3` (so an open response can't hang a reload), and with `HF_HUB_OFFLINE=1` and `ANTHROPIC_BASE_URL=https://api.anthropic.com` in its environment. No server module calls out at import time. In the browser, the Vite dev server and the preview proxy `/api` to port 8000, so the site calls relative paths like `/api/b01/reconcile`. No CORS setup is needed.
- **Nothing in the browser calls an outside service:** Claude, Nessie, Elastic, Apify, Hugging Face, or SpacetimeDB on port 3000. Only `server/` does, with the keys and headers from `server/config.py`. Live adapters in `src/sources/live/` call only `/api/...`.
- **One prefix per upgrade:** every route of upgrade NN lives under `/api/bNN/` and is defined in `server/routers/bNN_<slug>.py` as `router = APIRouter(prefix="/api/bNN")`. `server/main.py` includes the `router` of every module in `server/routers/` that defines one, so an upgrade never edits it. A helper module with the upgrade's prefix and no `router`, such as `server/routers/b04_nessie.py`, is skipped. An upgrade's other files live in its own folder, `server/bNN_<slug>/`, such as `server/b11_embed/` and `server/b13_spacetime/`.
- **Requests** are JSON with `Content-Type: application/json`, except the B05 upload. Every POST body has a `trigger` field: the scripted event the adapter is replacing, the person's request event when the registry passes one on (see Requests from people in `events.md`), or `null` when nothing in the store started the call. The adapter sends the records the server needs in the body, taken from `src/mock`, because the server can't read the TypeScript dataset.
- **What the server reads:** only what the request carries, except that B11 to B15 (and their tests) also read `artifacts/mock/mock.json`, which `npm run export:mock` writes from `src/mock/`. B11 trains from its committed copy, `server/b11_embed/data/mock.json`. B12 seeds Elastic from it and from B11's `vectors.json`. B13 seeds the database from it. B14 and B15 read `contentRules` from it.
- **For B11 to B16:**
  - `side` in a request is a UI hint, not an access boundary. Buyer-side requests carry the pieces, communities, policy, index entries, the roster, the makers of the pieces on screen and only the orders in `contextIds`, and never payouts or maker statements.
  - Limits: `text` at most 1,000 characters, `notes` at most 2,000, an `image` at most 4 MB and PNG or JPEG by its magic bytes, a body at most 2 MB, or 6 MB for a listing with an image, all else `bad_request`.
  - Web text (B15's found titles and snippets) is untrusted. It is cut to 300 characters and passed to a model only inside a delimited data block that the system prompt names as untrusted, and only `http` and `https` URLs are kept.
- **A success** is status 200 with the body `{ "events": CindiaEvent[] }`. Every returned event follows the envelope in `events.md`, with:
  - `source: "live"` and `key` set to the upgrade's key (`b01-match` and so on), even when `events.md` keys that event type to another upgrade. B05's `match.made` and `flag.raised` carry `b05-scenario`, not `b01-match`.
  - `id` as `evt_live_` plus a number, unique within the server process. For B11 to B16 it never repeats across server restarts either: each router writes `evt_live_` followed by its two-digit number, the server's start time as six digits (Unix seconds modulo 1,000,000) and a four-digit count from 0001, as one number. B13's IDs come from the row instead (B13 below).
  - `at` copied from the trigger, or `0` when there is none.
  - IDs inside payloads that already exist in the dataset kept as they are. The live result replaces the scripted event for the same `matchId`, `flagId` or `approvalId`, so the screens line up. IDs made for a person follow the ID scheme in `data-model.md`.
- **An empty `events` list** means "nothing live to add". The registry then plays the scripted event, so return `[]` instead of guessing.
- **A failure** is a non-2xx status with the body `{ "error": { "code": string, "message": string } }`. `message` is one plain sentence and never contains a key, a full request or a stack trace.

| Code | Status | When |
|---|---|---|
| `bad_request` | 400 | The body doesn't match this contract |
| `not_found` | 404 | An ID in the request doesn't exist |
| `key_missing` | 503 | The upgrade needs a key (`ANTHROPIC_API_KEY`, `NESSIE_KEY`, the Elastic key, the Apify token or `HF_TOKEN`) and it isn't set. The message names the key. A missing `PUBLIC_SITE_URL` (B15) or `SPACETIME_TOKEN` (B13) is `upstream_error`, as those endpoints say |
| `busy` | 503 | The server is already running two swarm runs or one scan, so the scripted answer plays |
| `upstream_timeout` | 504 | An outside service (Claude, Nessie, Elastic, Apify, Hugging Face or SpacetimeDB) didn't answer in time |
| `upstream_error` | 502 | An outside service answered with an error |
| `invalid_model_output` | 502 | Claude's answer failed the server's checks (wrong ID, wrong number, wrong shape) |
| `internal` | 500 | Anything else |

- **Timeouts:** per key, as `events.md` gives them. The registry gives `produce()` 8 seconds by default, 20 for `b14-swarm` and 60 for `b15-watch`. The adapter aborts its fetch 0.5 seconds earlier (7.5, 19.5 and 59.5 seconds), and each endpoint finishes at least 0.5 seconds before that (under 7, 19 and 59). Every Claude call has a timeout of its own, given per endpoint below. Every Nessie call has a 5-second timeout and no retries inside a request.
- **Logging:** one line per request (route, status, milliseconds). Never log a key, a request body or Claude's raw output. `server/main.py` keeps the `httpx`, `httpx2` and `httpcore` loggers at WARNING, so no full URL (Nessie's carries `?key=`) is ever logged, and nothing calls `logging.basicConfig`. When a router fails to import, the log line names the exception's type and, for an `ImportError`, the missing module (its `name`), never the message.
- **Claude:** the `anthropic` Python SDK 2.1.0. `claude-sonnet-5-5` by default, `claude-haiku-5-5` where an endpoint says so, and no other model anywhere in the platform: `ALLOWED_MODELS` holds exactly those two, and `scripts/server_selftest.py` fails on any other model ID in `server/`, `src/` or `scripts/`. Every Claude client passes `config.CLAUDE_BASE_URL` as `base_url`. Never send `temperature`, `top_p`, `top_k`, `thinking: {"type": "enabled"}` or a prefilled assistant turn. Structured answers come from `client.messages.parse()` with a Pydantic model as `output_format`, or from strict tools (`"strict": true`, `"additionalProperties": false`). The server checks every ID and amount Claude returns against the request before using it. A failed check is `invalid_model_output`, and the scripted event plays instead.
- **Nessie:** the key goes in the query string as `?key=`. Only deposits and withdrawals move money, because purchases and transfers can't be created. A create call answers with a plain string, so the server reads the list back to find the new record. Amounts are integer cents. The base URL is the first of `https://api.nessieisreal.com`, `https://prod-api.nessieisreal.com` and `https://qa-api.nessieisreal.com` that answers `GET /accounts`, found once per server process.

## `GET /api/health` (server skeleton)

Response 200:

```json
{ "ok": true, "version": "0.1.0",
  "keys": { "anthropic": true, "nessie": false, "elastic": false, "apify": false, "hf": false },
  "services": { "spacetime": false, "model": false },
  "routers": ["b01", "b04", "b11"] }
```

- `keys` says only whether each key is set, never its value, each a boolean. A key counts as set when its variable is set or its `*_AUTH=proxy` flag is: `anthropic` with `CINDIA_ANTHROPIC_API_KEY` or `ANTHROPIC_API_KEY`, `elastic` with `ELASTIC_API_KEY` or `ELASTIC_AUTH=proxy` and only when `ELASTIC_URL` is set too, `apify` with `APIFY_TOKEN` or `APIFY_AUTH=proxy`, `hf` with `HF_TOKEN`.
- `services` says whether SpacetimeDB answers (`spacetime_reachable()`) and whether the trained model is on disk (`model_present()`).
- `routers` lists the upgrade prefixes `main.py` loaded, `b01` to `b16` as they load.
- Whether `PUBLIC_SITE_URL` is set comes from `GET /api/b15/status`.
- Every adapter's `health()` calls this first and checks that its own prefix is listed and, if it needs one, that its key or service is set.

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

Returns a `flag.explained` with the same `flagId`, plus a `followup.drafted` for `followUpId`. The server rejects an answer whose `trusted_record_id` or `delta_cents` doesn't match the request (`invalid_model_output`).

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

## B04 · Nessie, the co-op's bank account (`b04-bank`)

Needs `NESSIE_KEY`. The server keeps the Nessie customer and account IDs in memory once found or created.

**`GET /api/b04/status`** · returns `{ "seeded": boolean, "accountId": string | null, "balanceCents": number | null }` (this is not an events response, the adapter's `health()` reads it). `seeded` is true once the opening-balance deposit has landed on the account. The seed posts it last, so it marks a finished seed.

**`POST /api/b04/seed`** · up to 30 seconds, called once by the adapter's `health()` in live mode, never during the demo's 8-second window

Request: `{ "trigger": null, "studio": { "id": "std_dine", "name": "...", "openingBalanceCents": 0 }, "history": { "deposits": [], "withdrawals": [] } }`, where `history` is September's bank transactions from `src/mock`, except the buyer's sale (`pay_001`) and the maker payouts. Each history line is `{ "id", "date", "amountCents", "memo", "refId" }`. `studio.openingBalanceCents` (a non-negative integer, default 0) is posted as one deposit dated 2026-08-31, so Nessie's balance reproduces `src/mock`'s `balanceAsOf()`.

Idempotent. Each line carries a unique description, and a line already on the account isn't posted again. When the opening deposit is already there, it does nothing; a seed cut short finishes on the next call. Otherwise it finds or creates the customer (a fictional US mailing address) and a Checking account nicknamed "Dine co-op operating", then posts one deposit or withdrawal per history line and the opening deposit last. Returns `{ "events": [account.synced] }`.

When live mode is switched on, the adapter's `health()` starts the seed in the background: about 30 POSTs to Nessie, up to 30 seconds. `health()` answers false until the seed is done, so `b04-bank` stays scripted until then.

**`POST /api/b04/sale`** · under 4 seconds

Request: `{ "trigger": { "...": "the scripted order.placed or money.moved for the sale" }, "orderId": "ord_001", "payoutId": "pay_001", "netCents": 15648, "date": "2026-09-01", "description": "Cindia sale ord_001, Small grey, red and black wool weaving, net of fees", "pieceId": "...", "channelId": "...", "buyerId": "...", "grossCents": 18000, "moveId": "mv_0003" }`

`pieceId`, `channelId`, `buyerId`, `grossCents` and `moveId` are optional. They let the server build the `order.placed` and the settlement's `moveId` when the trigger is the other of the two sale events. Without them, `order.placed` comes from an `order.placed` trigger, and `moveId` from a `money.moved` trigger or `mv_0003`.

Creates one deposit of `netCents` (or reuses the one with the same description), reads the deposits back, then the account. Returns the `order.placed` (when it can be built) and the settlement `money.moved` (same `moveId` as the scripted one), and an `account.synced` with Nessie's balance as of `date`.

**`POST /api/b04/payouts`** · under 6 seconds

Request: `{ "trigger": { "...": "a scripted payout.sent" }, "makerPayouts": [ { "makerPayoutId": "mpo_01", "makerId": "mkr_01", "amountCents": 0, "date": "2026-10-02", "moveId": "mv_0004" } ] }`

`moveId` is optional on each line. Without it, the Nth line gets `mv_0004` onward.

Creates one withdrawal per maker payout, described "Maker payout mpo_01" (or reuses it), then reads the account. Returns a `payout.sent` and a `maker_pay` `money.moved` per payout, and one `account.synced`.

**Fallback:** the scripted money events and balances. Without the key, `health()` is false and the money map stays scripted with its `Simulated` badge.

## B05 · the judge's scenario (`b05-scenario`)

**`POST /api/b05/scenario`** · multipart form · no key needed · under 3 seconds · builds on B01

Form fields: `trigger` (the event as a JSON string), `file` (a CSV or a JSON statement, at most 1 MB), `monthId`, and `records` (the month's records as a JSON string, same shape as B01). `python-multipart` comes with `fastapi[standard]`.

The CSV columns are `date,orderId,pieceId,saleCents,commissionBps,netCents`, one statement line per row. A JSON file is a Statement object from `data-model.md`. The server parses the file into a statement, runs B01's matcher over the month's records plus that statement, and returns a `scenario.loaded`, then every `match.made` and `flag.raised` that involves the new statement. Every one of them carries `key: "b05-scenario"`, including the `match.made` and `flag.raised` that `events.md` keys to `b01-match`.

IDs: a person's own file gets the statement ID `stm_scn_` plus a number, with `scn_mat_live_N` matches and `scn_flg_live_N` flags. The held-back sample (a trigger carrying its `scn_stm_` statement ID and no `content`) keeps its scripted IDs, `scn_stm_01`, `scn_mat_01` and `scn_flg_01`, so the screens line up with the scripted answer. Every ID contains `scn_`, the marker the scenario panel filters on.

The endpoint returns no `record.arrived` events. The adapter (`src/sources/live/b05-scenario.ts`) adds one `record.arrived` per `scn_` record the answer involves (the statement's orders, the statement, the bank record), keyed `b05-scenario`, with dates from `src/mock` or from the file it sent, as the scripted answer does.

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

Request: `{ "trigger": { "...": "an ask.asked event, scripted or from the owner" }, "questionId": "ask_01", "text": "这个月哪件作品最赚钱?", "lang": "zh", "records": { "orders": [], "catalog": [], "makerStatements": [], "flags": [] } }`

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
| `GET /api/b08/approvals?status=pending` | the owner screen, every 2 seconds | Lists pending approvals | `approval.requested`, one per pending approval |
| `POST /api/b08/approvals/{approvalId}/decision` | the owner screen, when the owner taps | Body: `{ "trigger": { "...": "the approval.granted or approval.declined event from the owner" }, "decision": "granted" \| "declined", "reason": { "en": "", "zh": "" } }` | `approval.granted` or `approval.declined`, `source: "live"`, `by: "own_01"` |
| `GET /api/b08/approvals/{approvalId}?wait=6` | the console's adapter, on the scripted `approval.granted` | Waits up to `wait` seconds (at most 6) for the owner's decision | the decision event, or `[]` when there is none yet |
| `GET /api/b08/status` | the console's adapter, before it waits | Says whether an owner screen polled in the last 10 seconds | `{ "ownerConnected": boolean }` (not an events response) |

- A second decision on the same approval changes nothing and returns the first decision again, with status 200.
- The console's adapter only waits when `ownerConnected` is true. With no owner screen open it returns `[]` at once, so the scripted grant plays on time.
- **The owner screen** is `/sell/approvals?screen=owner`, and only it polls, so the Sell site on the console machine doesn't count as the owner. After the adapter forwards a person's decision, it returns `[]`, so the scripted answer to that decision (a milestone's payment, for one) plays. `B13-live.md` owns this change. Moving the approval queue onto SpacetimeDB is in the brief's "Backend if time".

**Fallback:** with no decision in time, the scripted `approval.granted` plays, so the demo never waits on a second screen.

## B09 · the shopping concierge (`b09-concierge`)

**`POST /api/b09/concierge`** · `ANTHROPIC_API_KEY` · `claude-haiku-5-5` with a 5-second timeout, because it opens the demo

Request: `{ "trigger": { "...": "the scripted concierge.answered, or the buyer's own concierge.asked" }, "query": "a gift under $200 for my mom, she loves red wool", "lang": "en", "catalog": [] }`

`catalog` holds every piece with its title, price, maker, hours and story. Claude answers through `messages.parse()` with exactly three picks, each `{ piece_id, reason_en, reason_zh }`. The server checks that every `piece_id` is in the catalog, that there are three different ones, and that a price limit stated in the query holds.

Returns one `concierge.answered` with the query, the three `pieceIds` in Claude's order and their `reasons`.

**Fallback:** the scripted answer (`pc_01`, `pc_07`, `pc_11`).

## B10 · numbers derived from the ledger (`b10-derived`)

**`POST /api/b10/derive`** · no key needed · under 2 seconds

Request: `{ "trigger": { "...": "a scripted split.shown, receipt.updated, statement.issued or impact.updated" }, "records": { "catalog": [], "orders": [], "payouts": [], "makerPayouts": [], "ledger": [], "contracts": [] } }`

Computes the trigger's event from the records with the money rules in `data-model.md`, and returns that one event:
- `split.shown`: the fees, materials and maker share for the piece, using the channel's rules.
- `receipt.updated`: `paid_to_maker`, with `paidDate`, once the maker's payout for that order is `sent`.
- `statement.issued` and `impact.updated`: the same IDs, with every payload figure recomputed from the ledger.

A person's `piece.opened` gets nothing from the B10 adapter, so its scripted `split.shown` from `splits` plays in both modes.

**Fallback:** the scripted events and the hardcoded numbers in `src/mock`.

## B11 · the embedding model (`b11-embed`)

- **Training is a script, not an endpoint:** `python server/b11_embed/train.py` (the `.venv` Python). It reads `server/b11_embed/data/mock.json`, writes training pairs to `server/b11_embed/pairs.jsonl` (committed), fine-tunes the base model, scores it on `searchEval` against keyword search, the base model and hybrid, and writes:
  - the model to `CINDIA_MODEL_DIR` (not committed),
  - `server/b11_embed/report.json` (committed), with the model's sha256, a hash of the 54 passages and their fingerprint,
  - `server/b11_embed/vectors.json` (committed: the fingerprint, the PCA, and per piece the vector and its 2D coordinates).
- **Where it trains:** the cloud VM by default (B11's settings make it fit 2 vCPUs, 15 to 30 minutes), or Gordon's lab GPU machine with `scripts/train-akbari.sh`.
- **The hand-off is the Hugging Face repo.** With `HF_TOKEN` and `CINDIA_HF_REPO` set, `publish.py` publishes the model, its card and `report.json` to the private repo. `python server/b11_embed/fetch_model.py` pulls the newest onto the cloud VM and the demo laptop. It is the only way a model arrives: uvicorn never calls the Hub. A model, `vectors.json` and an Elastic index that don't share one fingerprint are refused: `trained` is false, and B12 reseeds an index whose fingerprint differs.
- **Base model:** `intfloat/multilingual-e5-small` (384 dimensions), so Chinese and English queries share one space. The builder may pick another open model if this one won't train in the cloud, and records why in its report.
- **Training pairs:** a build-time prompt to `claude-sonnet-5-5` writes 20 buyer-style queries per piece about the fictional catalog, in mixed voices, about a fifth in Chinese, plus filtered hard negatives. A query that hits `contentRules` is dropped and counted. Every pair is kept in `pairs.jsonl` for audit. Eval queries never enter training. The model card says the data is synthetic queries about fictional pieces and names what the model is not for: classifying, ranking or verifying real makers or their work.
- Every passage and query follows the embedded passage rule in `data-model.md`.

**`GET /api/b11/model`** · no key · under 200 ms · returns `{ "trained": boolean, "warm": boolean, "modelId": string | null, "baseModel": string | null, "dims": number | null, "fingerprint": string | null, "problem": string | null }` (not an events response). The first call starts loading the model in a background thread. The B11 and B12 adapters' `health()` need `trained` and `warm`. B15's doesn't wait on B11.

**`POST /api/b11/report`** · no key · under 1 second · `{ "trigger": ... }` → `model.trained` and `proof.search_scored` from `report.json`.

**`POST /api/b11/map`** · no key · under 2 seconds once warm · `{ "trigger": ..., "queryId": ..., "text": ..., "keywords": [] }` → `search.mapped` (all pieces' PCA points plus the query's), or `[]` while the model isn't trained or warm. Called by the B12 adapter for a person's search.

**Adapter:** `src/sources/live/b11-embed.ts`. Its `produce()` answers every event with `[]` at once, with no call, so the tour's `search.mapped`, `model.trained` and `proof.search_scored` stay scripted.

**Fallback:** the scripted `model.trained`, `proof.search_scored` and `search.mapped` from `src/mock/model.ts`, or nothing when the report is null.

## B12 · search (`b12-search`)

**`POST /api/b12/seed`** · Elastic key or `ELASTIC_AUTH=proxy` · answers at once and seeds in a server thread for up to 60 seconds, started by the adapter's `health()` in live mode, single flight · `{ "trigger": null, "passagesHash": string }` → `{ "events": [] }`
- It seeds from the server's own `mock.json` and B11's `vectors.json`, never from the body, which carries only the hash to compare. It answers 400 `bad_request` when there are no vectors with B11's current fingerprint, or when the hash differs from the server's.
- It creates `cindia-pieces-v1` behind alias `cindia-pieces` and `cindia-drafts-v1` behind alias `cindia-drafts`, and writes one document per piece: the facet fields, the community fields, `embedText`, `vector` (`dense_vector`, 384 dimensions, cosine, `index_options.type: int8_hnsw`) and the fingerprint. `resource_already_exists_exception` counts as success.
- It then creates or updates the Agent Builder agent `cindia-finder` and runs one test conversation, inside the same 60 seconds.

**`GET /api/b12/status`** · no key · under 1 second, always from a cache a background thread refreshes every 30 seconds in live mode · `{ "elastic": boolean, "indexed": number, "drafts": number, "fingerprint": string | null, "agentBuilder": boolean, "seeding": boolean, "seedError": string | null }` (not an events response). `seeding` is true until a seed finishes, and `seedError` is null or one plain sentence. It never runs a conversation. The adapter's `health()` reads it and emits `index.synced` when it changes.

**`POST /api/b12/publish`** · Elastic key or proxy flag · under 3 seconds · `{ "trigger", "listingId", "pieceId", "approvalId" }` → one `listing.indexed` (`index: "cindia-pieces"`, keyed `b12-search`). When the owner has granted a person's listing, it copies the draft from `cindia-drafts` into `cindia-pieces` and deletes the draft. A missing draft is 404 `not_found`.

**`POST /api/b12/search`** · no key needed, Elastic optional · under 4 seconds · `{ "trigger", "queryId", "text", "keywords", "lang", "filters" }` → `search.answered`:
- It embeds the query with the B11 model (the passage rule in `data-model.md`).
- It runs a hybrid query in Elastic: a kNN retriever on `vector` and a `standard` retriever with a `multi_match` over the facet fields, `embedText` and the titles, fused with RRF, with the filters applied. Engine `elastic_hybrid`. The whole Elastic path has one 2.5-second budget.
- Otherwise it runs the same fusion locally over `vectors.json` with a BM25 scorer. Engine `local_hybrid`. Both fusions take only pieces the keyword side matched.
- Each result's `matched` lists the query keywords found in its facets, `reason` is one short sentence built from those facets (no model call), and `closeness` is the cosine nearness.

**`POST /api/b12/surprise`** · no key · under 2 seconds · `{ "trigger", "surpriseId", "keyword", "method", "seed" }` → `surprise.drawn`, drawn exactly as `src/sources/surprise.ts` draws (`data-model.md`'s surprise draw).

- **Drafts:** the Indexer writes a drafted listing to `cindia-drafts` (B12's `index_draft`), and `publish` moves it to `cindia-pieces` once the owner grants its `listing_publish` approval. Before that, no search and no Agent Builder answer returns it. B12's module functions are `search`, `surprise`, `converse`, `index_draft` and `publish`.
- **Elastic Agent Builder:** `cindia-finder` has an `index_search` tool over `cindia-pieces` (tool ID `cindia.search_pieces`). B14 routes find questions to it in code, never by the model's choice, and keeps only the piece IDs it returns. The swarm view labels that step "Elastic Agent Builder". A token-limit error counts as `agentBuilder: false`.
- **Adapter:** `src/sources/live/b12-search.ts`. It answers the Indexer's `listing.indexed` (keyed `b14-swarm`) with `[]`, and posts `/api/b12/publish` from `start(emit)` after a grant (`events.md`).

**Fallback:** the scripted answers in `events.md`'s Requests table.

## B13 · the database (`b13-live`)

SpacetimeDB is the platform's system of record. Elastic is the search index built from it.

- **The module** in `server/b13_spacetime/module/` (TypeScript), database `cindia`, holds the eight tables the data view shows, `catalog` (the 54 pieces, seeded from `mock.json`, plus each published listing's piece), `listings`, `orders`, `approvals`, `runs`, `steps`, `processes` and `screens`, plus `changes` (one row per change, which the feed polls) and `config`. Every row is keyed by an auto-increment `seq`, with the record ID as a plain column. The tables are private, and the writing reducers accept only the publisher's identity (`SPACETIME_TOKEN`). Columns and reducers are as `docs/plans/B13-live.md` writes them, including `clear_runs`, a demo-prep step that deletes every run and step.
- **Running it:** the orchestrator installs the CLI, starts `spacetime start --listen-addr 127.0.0.1:3000` in the background, publishes with `spacetime publish -s local cindia`, and runs `server/b13_spacetime/save_token.py`, which writes `SPACETIME_TOKEN` to `.env` without printing it. Maincloud stays off for the demo. A Rust module would need the hosts `static.rust-lang.org`, `index.crates.io` and `static.crates.io`.
- **`server/b13_spacetime/bridge.py`** gives the other upgrades their writes (runs, steps, process status, recorded events, the seed), each with a 0.8-second timeout and a 30-second back-off after a failure, sent through one ordered background thread. When SpacetimeDB is unreachable, or `SPACETIME_TOKEN` is unset, each call is a no-op that logs one line.
- **The feed** (`feed.py`): one poller per server process reads `changes` every 500 ms and keeps a snapshot: each table's row count and newest three rows, the process rows, the screens seen in the last 15 seconds, and the newest 500 steps. The endpoints answer from it.

**`GET /api/b13/changes?after=<seq>&screen=<screenId>&role=<role>`** · no key · under 300 ms · polled every 500 ms by the B13 adapter in live mode · returns `{ "events": CindiaEvent[], "seq": number }`:
- a `swarm.step` (key `b13-live`) for each step whose change `seq` is above `after`, then one `data.synced` when anything changed above `after`,
- with `after=0`, a screen's first poll, steps only for runs still going or finished in the last 60 seconds, so a fresh screen never replays an old run, and always one `data.synced`,
- `seq`, the newest change the answer covers, for the next poll,
- `screen` is `scr_` plus 6 to 12 letters or digits and `role` is `buyer`, `seller` or `tour`, or the answer is 400 `bad_request`. The call refreshes that screen's row at most every 5 seconds.
- Event IDs are `evt_live_` plus `131` for a step or `132` for a `data.synced`, the database's epoch modulo 1,000,000 (six digits) and the change's `seq` (nine digits), so a resent row keeps its ID and `log` holds it once.

**`GET /api/b13/status`** · no key · under 300 ms · `{ "spacetime": boolean, "db": string, "seeded": boolean, "screens": number, "tables": { "table": string, "rows": number }[], "seq": number }` (not an events response). `seeded` is true once `catalog` holds the 54 pieces.

**`POST /api/b13/seed`** · no key · up to 10 seconds, single flight · `{ "trigger": null }` → `{ "events": [] }`. Builds the catalog, the scripted orders and the scripted approvals from the server's own `artifacts/mock/mock.json`, never from the request.

**`POST /api/b13/record`** · no key · under 1 second · `{ "trigger": null, "events": CindiaEvent[] }` (at most 50 events and 256 KB) → `{ "events": [] }`. Mirrors orders, approvals and listing states into the database. It checks every ID against `data-model.md`'s ID scheme, keeps no text but the catalog's own titles, and ignores every other event type.

- `seed` and `record` answer 503 `upstream_error` without the token or with SpacetimeDB down. `changes` and `status` always answer from the snapshot.

**Adapter:** `src/sources/live/b13-live.ts`:
- `health()`: `/api/health` lists `b13` with `services.spacetime` true, then `/api/b13/status` says `spacetime`. While `seeded` is false it starts the seed in the background and answers false.
- `produce()`: `[]` at once for the tour's `data.synced` in `d15-listing`, the one tour event keyed `b13-live`, so the scripted one plays.
- `start(emit)` polls `/changes` with the screen ID `scr_` plus the page tag and the role from the route (`/shop` buyer, `/sell` and `/maker` seller, `/demo` tour), from the moment live mode turns on until it turns off. The registry stamps each event's `at` on arrival.
- Steps of a run another page started (its `runId` carries another page's tag) reach the swarm view with that page's tag added to their `threadId`, so they never land on this page's own threads.

**Fallback:** without B13, swarm steps arrive in B14's response or from the scripted runs, and the data view shows the mock data.

## B14 · the agent swarm (`b14-swarm`)

**`POST /api/b14/support`** · `CINDIA_ANTHROPIC_API_KEY` (read through `config.ANTHROPIC_API_KEY`) · under 19 seconds · `{ "trigger", "threadId", "runId", "idTag", "idStart", "side", "text", "lang", "contextIds", "records" }`, where `records` carries what the request's side may see (the rules at the top). Returns every `swarm.step` in order, then one of:
- `support.answered`,
- `support.escalated` with an `approval.requested` (kind `support_action`, inline approval), when a person must take over,
- for a meaning or authenticity question the records can't answer, `support.answered` with L14 and a `question.forwarded` to the piece's maker.

**A maker's answer** (`question.answered`, a person's request keyed `b14-swarm`) has no live endpoint yet. The live loop is in the brief's "Backend if time". Until it lands, the B14 adapter answers it with `[]`, so the scripted relay (`run_09`) plays in both modes.

**`POST /api/b14/listing`** · `CINDIA_ANTHROPIC_API_KEY` (read through `config.ANTHROPIC_API_KEY`) · under 19 seconds · `{ "trigger", "listingId", "runId", "idTag", "idStart", "makerId", "notes", "lang", "community", "maker", "vibeVocabulary", "image"? }` runs the Lister, then the Describer (only with an image), the Tagger, the Checker and the Indexer. Returns the steps, `listing.drafted`, `listing.indexed` (`cindia-drafts`, once B12 is live) and an `approval.requested` `apr_user_<tag>_<n>` whose inline approval is a `listing_publish` for the person's listing.

**`POST /api/b14/storefront`** · `CINDIA_ANTHROPIC_API_KEY` (read through `config.ANTHROPIC_API_KEY`) · under 19 seconds · `{ "trigger", "storefrontId", "runId", "idTag", "idStart", "community", "pieces" }` runs the Designer. Returns the steps and `storefront.drafted`, with block IDs `blk_user_<tag>_<n>` and props as single strings or string lists (`data-model.md`'s storefront blocks).

**How a run works:**
1. Cindy (the orchestrator) reads Intake's result and picks the specialists from the roster.
2. Each specialist gets only its own tools and the records it needs, and answers through `messages.parse()` with its own small Pydantic model. Calls use `max_retries=0`, a `max_tokens` per agent, and a timeout no longer than the run's time left minus a reserve for the Writer.
3. The Writer turns the specialists' facts into the reply. Amounts and dates are filled in by code from the facts, and a quote appears word for word with its source named.
4. `content_check()` runs on what the Lister, Tagger, Writer, Curator, Designer and Describer write, against `contentRules`.
5. Every step goes to the bridge (so B13 holds it) and into the response.
6. A specialist that can't answer from its records returns `unknown` with a reason, and the Writer says so plainly.
7. Anything that would move money, publish or report becomes an `approval.requested` (kinds `support_action`, `listing_publish`, `storefront_publish`), never an action. No run emits `approval.granted`, `payout.sent` or `money.moved`.

- **IDs:** `idTag` is the page tag, and `idStart` the first number the browser reserved with `liveIdStart()`. A live run's person-scoped IDs are `<prefix>_user_<tag>_<n>` for `run`, `stp`, `chk`, `apr`, `pc`, `blk` and `qst`.
- **The tour stays scripted.** Live mode answers people's own requests only, so B14 replaces no tour run and prefetches nothing.

**Fallback:** the scripted runs in `src/mock/swarm.ts`.

## B15 · the copy watch (`b15-watch`)

**`POST /api/b15/watch`** · `APIFY_TOKEN` or `APIFY_AUTH=proxy`, and `PUBLIC_SITE_URL` · answers at once · `{ "trigger", "runId", "idTag", "idStart", "scanId", "makerId", "queries" }` → status 202 with `{ "scanId", "status": "running" }` (not an events response). It starts the scan in a server thread, or joins the one already running for the same `idTag` and `scanId` (single flight). Scans are cached by maker for 30 minutes, with fresh IDs. A maker outside `com_dine` gets 400 `bad_request`, and without `PUBLIC_SITE_URL` it answers 503 `upstream_error`.

**`GET /api/b15/watch/{scanId}?idTag=<tag>`** · no key · under 200 ms · `{ "status": "running" | "done" | "failed", "events": CindiaEvent[], "error": { "code", "message" } | null }`, or 404 `not_found` for a scan the server doesn't know under that `idTag`. `events` is empty until `done`. The adapter's `produce()` polls it every second until `done` or `failed`, inside its 59.5-second abort, and a failed scan throws, so the scripted scan plays.

**`GET /api/b15/status`** · no key · under 200 ms · `{ "market": boolean, "threshold": number, "measured": boolean, "model": boolean }` (not an events response). `market` is true when `PUBLIC_SITE_URL` is set. The adapter's `health()` needs `/api/health` to list `b15` with `keys.apify` true, then `market`. It doesn't wait on B11.

**The scan:**
- Scout runs Apify's Cheerio Scraper (`apify/cheerio-scraper`, called as `apify~cheerio-scraper` through `run-sync-get-dataset-items` with `clean=true`) over the sandbox market at `<PUBLIC_SITE_URL>/market/`, with a 45-second budget. Its start URL is the market's index, and it follows only links inside `/market/`. It never fetches any other site, and it never contacts anyone. `docs/tech/apify/cheerio-scraper.md` has the input and output.
- Comparer scores each result's title and snippet against the co-op's pieces as a normalized similarity, `(c - b) / (1 - b)`, with the B11 model, or the base model or B11's BM25 when B11 has no model. B15 measures its threshold on a fixture of look-alike and unrelated titles (the lowest with precision at least 0.9) into `server/b15_watch/threshold.json`, with its precision in its report. Until then it uses 0.75, marked "not measured".
- A possible copy names the co-op or one of its makers, repeats an 8-word run of a piece's story, or claims a Cindia verification it lacks. A bare craft or origin claim is never a possible copy: it's `claim_only`, shown with L22 and no report button.
- Claims (`claude-haiku-5-5`) reads what each look-alike claims, only at or above the threshold, in parallel, 5 seconds each.
- The events: `watch.scanned` with every checked result, then per possible copy a `counterfeit.flagged`, the Reporter's `followup.drafted` (a template, the model only choosing which claim words to quote), and an `approval.requested` (kind `report_listing`, inline approval). Approving a live report asks the owner to confirm they checked the listing themselves.
- A scan's `threadId` is its `scanId`. There is no background tour scan and no `tourIds`, and a live hit never takes `cft_01`.
- **The tour's `d14-watch` always plays the scripted scan.** Live scans run only from Scan now.

**Fallback:** the scripted scan in `src/mock/watch.ts`. The server's tests use a fixture of fictional listings on `example.com` and `example.org`.

## B16 · the bank books (`b16-bank-books`)

In live mode B16 checks the books against Nessie: B01's matcher finds the $340 catch against Nessie's own bank records, the community fund move posts as a Nessie deposit, and a milestone release posts as a Nessie withdrawal. It uses B04's Nessie module and the co-op's operating account, and adds two accounts on the same fictional customer: a community fund account, and `Commissions held by Cindia`, where Cindia holds a commission's money until each milestone is approved. It never writes B04's operating account and never emits `account.synced`, so the money map's balance stays the operating account's.

**`GET /api/b16/status`** · `NESSIE_KEY` · under 300 ms, from a cache a background thread refreshes every 30 seconds in live mode · `{ "operating": boolean, "seeded": boolean, "fundAccountId": string | null, "heldAccountId": string | null, "fundBalanceCents": number | null, "heldBalanceCents": number | null }` (not an events response).

**`POST /api/b16/seed`** · `NESSIE_KEY` · up to 20 seconds, called once by the adapter's `health()` in live mode, after B04's seed, single flight · `{ "trigger": null, "commission": { "wipId": "wip_01", "priceCents": 0 } }` → `{ "events": [] }`. Finds or creates the two accounts and posts the held account's opening deposit once. Without B04's account, 404 `not_found`.

**`POST /api/b16/reconcile`** · `NESSIE_KEY` · under 5 seconds · B01's body (`records.bankTxns` is ignored) → every `flag.raised` the matcher finds against Nessie's bank side, keyed `b16-bank-books`, each with `nessieId`. A flag of the trigger's kind on the trigger's statement keeps the trigger's `flagId`.

**`POST /api/b16/moves`** · `NESSIE_KEY` · under 6 seconds · `{ "trigger": { "...": "the money.moved to post" } }` → the trigger's `money.moved` with the same payload plus `nessieId`, keyed `b16-bank-books`. A `project_fund` move to a `community_fund` posts as a deposit on the fund account, and a `milestone` move as a withdrawal from the held account, whose `from` stays Cindia. Any other move is 400 `bad_request`.

- One request at a time writes to Nessie. When the bank's answer disagrees with the event, the endpoint returns `{ "events": [] }`, so the scripted figure and its Simulated badge stay.
- **Events:** `flag.raised` carries `nessieId?`, set only by B16. `money.moved`'s `nessieId?` is set by B04 and by B16. B16 sends only these live twins.
- **B16's keyed tour events: none.** No timeline event and no Requests row is keyed `b16-bank-books`, so it needs no `ALLOWED_EMPTY_FALLBACKS` entry.

**Adapter:** `src/sources/live/b16-bank-books.ts`. `health()` needs `/api/health` to list `b16` with `keys.nessie` true, then `/api/b16/status` with `operating` true, and starts the seed in the background while `seeded` is false. `start(emit)` posts the month's `short_payment` flag to `/api/b16/reconcile` once per `flagId`, and each fund or milestone move to `/api/b16/moves` once per `moveId`.

**Fallback:** the scripted flag and moves, with their Simulated badge.

## The agent roster (`src/mock/agents.ts`, used by B14 and the swarm view)

21 roles. Fifteen run on Claude, only `claude-haiku-5-5` and `claude-sonnet-5-5`. No Opus and no Fable anywhere in the platform. Six are plain code.

| agentId | kind | model | tools | Job |
|---|---|---|---|---|
| `cindy` | claude | `claude-haiku-5-5` | `route` | Picks which agents run and in what order, then merges their results. No facts of her own |
| `intake` | claude | `claude-haiku-5-5` | none | Reads the request: intent, budget, recipient, language, the IDs it mentions |
| `finder` | claude | `claude-haiku-5-5` | `cindia_search`, `elastic_agent` | Turns the request into keywords and filters, runs the search, returns candidates and scores. Find questions go to `elastic_agent` (Elastic Agent Builder), chosen in code |
| `curator` | claude | `claude-sonnet-5-5` | none | Puts the final few in order. Each reason is B12's code-built one |
| `steward` | claude | `claude-sonnet-5-5` | `community_page`, `verification_record` | Answers authenticity and meaning only from the community's page, the verification record and the piece's own story and heritage line, quoting its source, and says "I'll ask the maker" otherwise |
| `clerk` | claude | `claude-haiku-5-5` | `order_lookup`, `policy` | Order status, shipping, returns. Read-only. Arrival dates come from `arrival_window`, which the run calls as code, so no model does date arithmetic. On the buyer side it looks up only the orders on screen (L17) |
| `writer` | claude | `claude-sonnet-5-5` | none | Writes the reply in the person's language from the facts the others returned, and relays a maker's answer in her own words |
| `lister` | claude | `claude-sonnet-5-5` | none | Drafts a listing in English and Chinese from the maker's notes, and marks the version the maker didn't write (L27) |
| `describer` | claude | `claude-sonnet-5-5` | `image` | Describes what's visible in a picture, in plain shape and color words |
| `tagger` | claude | `claude-haiku-5-5` | `community_page` | Proposes vibe keywords for the maker to approve |
| `checker` | claude | `claude-sonnet-5-5` | `community_page` | Checks a draft against the community's protocols and the maker's facts. `content_check()` backs it in code (L26) |
| `indexer` | code | | `embed`, `index_write` | Builds the index entry and its vector, writes it to `cindia-drafts` |
| `matcher` | code | | `b01` | Matches payouts to orders |
| `explainer` | claude | `claude-sonnet-5-5` | `b02` | Explains the catch |
| `bookkeeper` | code | | `b06`, `b10` | Derives the books and the workbook |
| `scorer` | code | | `b03` | Scores the planted errors |
| `scout` | code | | `apify_crawl` | Crawls the sandbox market through Apify |
| `comparer` | code | | `embed` | Scores look-alikes |
| `claims` | claude | `claude-haiku-5-5` | none | Checks what a found listing claims |
| `reporter` | claude | `claude-sonnet-5-5` | none | Picks the claim words for the report template, for the owner |
| `designer` | claude | `claude-sonnet-5-5` | `community_page` | Drafts a storefront |

The swarm view labels `code` agents "rule-based". The `never` field on each spec is the "Never does" column of `docs/v2/brief.md`.

## What the server skeleton provides

- **`server/requirements.txt`** pins `fastapi[standard]==0.159.1` (which brings uvicorn, httpx and python-multipart), `anthropic==2.1.0`, `openpyxl==3.1.5`, `httpx==0.28.1`, `python-dotenv==1.2.4`, `pytest==9.1.1`, `numpy==2.5.4`, `torch==2.14.1` (the CPU build), `transformers==5.20.2`, `sentence-transformers==6.2.0` and `huggingface_hub==2.3.0`. It carries `--extra-index-url https://download.pytorch.org/whl/cpu`, so Linux gets the CPU build of torch (`torch.__version__` ends in `+cpu`). It has no `elasticsearch` package, because B12 talks to Elastic with httpx, and `websockets` only if B13-live names it.
- **`server/config.py`** reads the process environment first, then `.env` with `override=False`, and never prints, logs or returns a value. It exposes:
  - `ANTHROPIC_API_KEY` (from `CINDIA_ANTHROPIC_API_KEY`, falling back to `ANTHROPIC_API_KEY`) and `NESSIE_KEY`,
  - `ELASTIC_URL`, `KIBANA_URL`, `ELASTIC_API_KEY`, `ELASTIC_AUTH`, `APIFY_TOKEN`, `APIFY_AUTH`, `HF_TOKEN`, and `HF_REPO` (from `CINDIA_HF_REPO`, not secret, default unset),
  - `SPACETIME_URL` (default `http://127.0.0.1:3000`), `SPACETIME_DB` (default `cindia`) and `SPACETIME_TOKEN` (the publisher's token),
  - `PUBLIC_SITE_URL` (not secret, default unset) and `MODEL_DIR` (from `CINDIA_MODEL_DIR`, default `models/cindia-embed-v1` under the repo root),
  - `MODEL_DEFAULT = "claude-sonnet-5-5"`, `MODEL_FAST = "claude-haiku-5-5"` and `ALLOWED_MODELS`, which holds exactly those two. There is no `MODEL_TOP`,
  - `CLAUDE_BASE_URL = "https://api.anthropic.com"`, a constant that never comes from the environment,
  - `has_key(name)`, which reads this module's resolved attributes at call time, never `os.environ`, so a test that sets `config.ANTHROPIC_API_KEY = None` sees `false`. `ELASTIC_API_KEY` counts as set with a key, or with `ELASTIC_AUTH=proxy`, and only when `ELASTIC_URL` is set too. `APIFY_TOKEN` counts as set with a token or with `APIFY_AUTH=proxy`. `ANTHROPIC_API_KEY` counts as set when either name is set,
  - `elastic_headers()`, `apify_headers()` and `spacetime_headers()`, each returning its auth header, or an empty dict in proxy mode or with no token. Upgrades use these instead of reading keys themselves.
- **`server/services.py`:** `spacetime_reachable()` (any HTTP answer from `SPACETIME_URL` within 300 ms, cached for 10 seconds) and `model_present()` (`MODEL_DIR` exists and holds `modules.json`).
- **`server/main.py`** loads every router, answers `GET /api/health`, and keeps the logging rules above.
- **`tests/server/conftest.py`** gives a `client` fixture (FastAPI's TestClient on `server.main:app`), registers a `live` marker, and offers `needs_key(name)`, which skips a test when that key isn't set, and `needs_service(name)` for `spacetime` and `model`. An autouse fixture swaps every key attribute in `config` for a fake value and clears `ELASTIC_AUTH` and `APIFY_AUTH`, for every test not marked `live`. A test that needs a missing key sets it to `None` itself. Live tests keep the real values, and never assert on headers or print a request.
- **`npm run test:server`** runs `pytest tests/server` with live tests included, so each one runs when its key is present and skips otherwise, then `scripts/server_selftest.py`. The self-test checks that `/api/health`'s `keys` holds exactly the five names and `services` exactly the two, all booleans, and scans `server/`, `src/` and `scripts/` (test files left out) for strings shaped like a Claude model ID (`claude-<name>-<n>`), failing on any that isn't in `config.ALLOWED_MODELS` and naming the file.

## Contract tests

Each upgrade's tests in `tests/server/test_bNN_<slug>.py` check, without a network call: the 200 response shape and every returned event against `events.md`, the error shape for a bad body, and that a missing key gives `key_missing`. One test marked `live` makes a single real call. Fixtures go in `tests/server/bNN_<name>.json`, written from the demo-critical figures in `data-model.md`. B11 to B16 also have a live feature spec in `tests/features/` that answers a person's own request end to end, which G5 names by path (`definition-of-done.md`).
