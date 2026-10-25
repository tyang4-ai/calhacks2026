# B13 · the database: SpacetimeDB module `cindia`

The SpacetimeDB module behind B13 (`docs/plans/B13-live.md`). It holds the catalog, the listings, the orders, the approvals, the swarm's runs and steps, each process's status and the screens watching, plus a change log the feed polls. Everything in it is fictional demo data from `src/mock/` and the events a session makes.

- **Module:** `server/b13_spacetime/module/`, TypeScript, built and published with the SpacetimeDB CLI **2.13.0**.
- **Database:** `cindia` (`SPACETIME_DB`) on the local server `http://127.0.0.1:3000` (`SPACETIME_URL`), never Maincloud for the demo.
- **Access:** every table is private. Only reducers and the owner (the identity that published) can read them, and every reducer but `init` refuses any caller who isn't the owner. The bridge calls as the owner with `SPACETIME_TOKEN`, through `config.spacetime_headers()`.

## Packages

`server/b13_spacetime/module/package.json` pins exact versions:

| Package | Version | Why |
|---|---|---|
| `spacetimedb` | `2.13.0` | The module API (`spacetimedb/server`: `schema`, `table`, `t`, `SenderError`, `ReducerCtx`), the same version as the installed CLI and server |
| `typescript` | `5.9.3` (dev) | `spacetime build` type-checks with `node_modules/.bin/tsc` before it bundles, and stops with "tsc not found in node_modules" without it. 5.9.3 is the TypeScript the `spacetimedb` 2.13.0 package itself is built with (its `devDependencies` say `^5.9.3`) |

`spacetimedb` brings its own small runtime dependencies (`headers-polyfill` and a few more). Its peer dependencies (React, Vue, Svelte and so on) are all optional and not needed.

## Commands

Copy them as they are. Each says the folder it runs from. They work the same in Git Bash, PowerShell and `cmd.exe`.

The local server must be running first (the orchestrator starts it once, and the heartbeat restarts it):

```text
spacetime start --listen-addr 127.0.0.1:3000
```

Never a bare `spacetime start`, which listens on every interface.

### 1. Install the module's packages · from `server/b13_spacetime/module/`

```text
npm install --no-audit --no-fund
```

This writes `node_modules/` (ignored by git) and `package-lock.json` (commit it). Once the lockfile is committed, other machines run `npm ci --no-audit --no-fund` instead.

### 2. Build · from `server/b13_spacetime/module/`

```text
spacetime build
```

It type-checks `src/` with the module's own `tsc`, then bundles `src/index.ts` into `dist/bundle.js` (ignored by git). The test `tests/server/test_b13_live.py::test_module_builds_with_the_cli` runs the same command once `node_modules/` exists.

### 3. Publish to the local server · from `server/b13_spacetime/module/`

```text
spacetime publish -s local cindia --yes=skip-login
```

- `-s local` is `127.0.0.1:3000`. Never publish without it: the CLI's other server is Maincloud.
- `--yes=skip-login` keeps it non-interactive. When the CLI has no login (the cloud session and a fresh laptop), the CLI logs in directly to the local server, prints "We have logged in directly to your target server", and that server-issued identity publishes the database. `init` stores it as the owner.
- The first publish creates the database and runs `init`. A later publish of a changed module keeps the data and the owner, and `init` doesn't run again.
- If a later publish says the change breaks the schema, publish again with the data deleted (it runs `init` again, so the epoch changes and old event IDs never come back), then seed again with `POST /api/b13/seed`:

```text
spacetime publish -s local cindia --delete-data=always --yes=skip-login,delete-data
```

### 4. Save the owner's token · from the repo root

```text
.venv/bin/python server/b13_spacetime/save_token.py
```

On Windows it's `.venv\Scripts\python.exe server/b13_spacetime/save_token.py`. It reads `spacetime login show --token` inside Python and writes one line `SPACETIME_TOKEN=<token>` to `.env`, printing only "SPACETIME_TOKEN saved to .env". Then restart `npm run server` so `server/config.py` reads it.

### 5. Before every recorded demo · from anywhere

```text
spacetime call -s local cindia clear_runs
```

It deletes every run and step, so no old run shows in the swarm view.

### 6. Checks · from anywhere

The owner can read a private table:

```text
spacetime sql -s local cindia "SELECT * FROM config"
```

An anonymous caller can't. This one must fail with "no such table: `catalog`. If the table exists, it may be marked private":

```text
spacetime sql -s local --anonymous cindia "SELECT * FROM catalog"
```

The module's tests, including the build and, when the server answers, the anonymous-access check:

```text
.venv/bin/python -m pytest tests/server/test_b13_live.py -q
```

### Never

- `spacetime login` on a machine whose CLI published `cindia`: it discards the server-issued token that owns the database, and the new identity isn't the owner. If it happened, publish again under the new identity with the data deleted (step 3's second command), then step 4.
- Printing the token. Only `save_token.py` runs `spacetime login show --token`, and it never prints what it reads.
- A publish, call or SQL command without `-s local`.

### Optional: Maincloud

Not for the demo. It needs Gordon's `spacetime login` in a browser on his own machine, which also replaces the CLI's local login (see Never). Then `spacetime publish -s maincloud cindia` from `server/b13_spacetime/module/`, and the bridge would need `SPACETIME_URL=https://maincloud.spacetimedb.com` and his token as `SPACETIME_TOKEN`. The feed polls SQL the same way there.

## Tables

Every table is private and has `seq` (u64, auto-increment primary key, inserted as `0n`). Record IDs are plain columns. Text columns are cut to 160 characters (control characters become spaces). Times are milliseconds since the Unix epoch, as u64, from the reducer's own timestamp. Amounts are integer cents.

| Table | Columns after `seq` |
|---|---|
| `catalog` | `piece_id` (unique), `community_id`, `maker_id`, `title_en`, `title_zh`, `community_en`, `maker_name`, `price_cents` (i64), `status` (`active`) |
| `listings` | `listing_id` (unique), `maker_id`, `piece_id` (empty until indexed), `state` (`requested`, `drafted`, `indexed`, `approved` or `declined`), `updated_at` |
| `orders` | `order_id` (unique), `piece_id`, `channel_id`, `gross_cents` (i64), `date` (`YYYY-MM-DD`), `origin` (`mock`, or `person` for `ord_user_` IDs) |
| `approvals` | `approval_id` (unique), `kind`, `subject_ids` (comma-joined), `amount_cents` (i64, 0 when none), `status` (`pending`, `granted` or `declined`), `updated_at` |
| `runs` | `run_id` (unique), `thread_id`, `side` (`buyer` or `seller`), `started_at`, `finished` (bool) |
| `steps` | `step_id`, `run_id` (btree index), `thread_id`, `agent_id`, `kind`, `summary_en`, `summary_zh`, `tool_name` (empty when none), `ms` (u32), `model` (empty when none) |
| `processes` | `process_id` (unique), `status` (`working` or `done`), `count` (u32), `updated_at` |
| `screens` | `screen_id` (unique), `role` (`buyer`, `seller` or `tour`), `last_seen` |
| `changes` | `table` (one of the eight names above), `row_id` (the changed row's record ID: `piece_id`, `listing_id`, `order_id`, `approval_id`, `run_id`, `step_id`, `process_id` or `screen_id`), `op` (`insert`, `update` or `delete`), `at` |
| `config` | `key` (unique, the one row is `owner`), `owner` (identity), `epoch` (the publish time in seconds) |

SQL over HTTP returns each row as an array in this column order, `seq` first. The SQL has no ORDER BY and `LIMIT` doesn't order, so sort by `seq` in Python.

## Reducers

The bridge calls `POST /v1/database/cindia/call/<reducer>` with a JSON array of the arguments **in this order**. Every reducer but `init` throws `SenderError` (`not_owner: ...`) unless the caller is the owner, before it reads anything. Bad arguments throw `SenderError` too, and a reducer that throws changes nothing.

| Reducer | Arguments, in order | What it does | Logged in `changes` |
|---|---|---|---|
| `init` | (lifecycle) | Stores the publisher as the owner, and the publish time in seconds as `epoch` | no |
| `seed_catalog` | `payload_json: string` | Upserts the catalog, the scripted orders and the scripted approvals. Idempotent. Checks the whole payload before writing | one row per row inserted or changed |
| `record` | `events_json: string` | Applies up to 50 Cindia events (below). Idempotent by record ID | one row per row inserted or changed |
| `start_run` | `run_id`, `thread_id`, `side` | Inserts the run, or for a run ID it holds, deletes that run's steps and starts it over (`started_at` now, `finished` false) | the run, and each deleted step |
| `add_step` | `run_id`, `step_id`, `thread_id`, `agent_id`, `kind`, `summary_en`, `summary_zh`, `tool_name`, `ms` (u32), `model` | Inserts a step, skipping a repeat of the same `run_id` and `step_id`. `kind` is one of `route`, `call`, `tool`, `result`, `check`, `handoff`, `reply`. `model` is empty, `claude-haiku-5-5` or `claude-sonnet-5-5`, nothing else | the step |
| `finish_run` | `run_id` | Marks the run finished. A missing or finished run changes nothing | the run |
| `set_process` | `process_id`, `status`, `count` (u32) | Upserts one process row. The same status and count change nothing | the process |
| `touch_screen` | `screen_id`, `role` | Inserts a screen, or refreshes its `last_seen`. `screen_id` is `scr_` plus 6 to 12 letters or digits | an insert, or a role change. A refresh isn't logged |
| `expire_screens` | `older_than_ms` (u64, 1000 to 86400000) | Deletes the screens not seen in that long | each deleted screen |
| `clear_runs` | none | Deletes every run and step, a demo-prep step | each deleted run and step |

IDs are checked by shape (`<prefix>_<part>[_<part>...]`, at most 64 characters) and prefix: `run_`, `stp_`, `pc_`, `mkr_`, `com_`, `ord_`, `ch_`, `apr_`, `lst_`, and `thr_`, `lst_` or `sto_` for a thread. The router checks them against `data-model.md`'s ID scheme first.

### `seed_catalog` payload

One JSON object, at most 512 KB and 500 entries per list, built by `seed.py` from `artifacts/mock/mock.json`:

```json
{
  "catalog": [
    { "piece_id": "pc_01", "community_id": "com_dine", "maker_id": "mkr_01", "title_en": "...", "title_zh": "...",
      "community_en": "...", "maker_name": "...", "price_cents": 120000, "status": "active" }
  ],
  "orders": [
    { "order_id": "ord_001", "piece_id": "pc_01", "channel_id": "ch_cindia", "gross_cents": 120000, "date": "2026-09-03", "origin": "mock" }
  ],
  "approvals": [
    { "approval_id": "apr_04", "kind": "listing_publish", "subject_ids": ["lst_01"], "amount_cents": 0, "status": "pending" }
  ]
}
```

`status` (catalog) defaults to `active`, `origin` to what the order ID says, `amount_cents` to 0 and the approval `status` to `pending`. An approval already in the table keeps its status, so a second seed never undoes a decision.

### `record` events

A JSON array of at most 50 events, at most 256 KB, each `{ "id": "evt_...", "type": "...", "key"?: "...", "payload": { ... } }`. The module reads only these fields, and ignores every other type:

| Type | Payload fields it reads | What changes |
|---|---|---|
| `order.placed` | `orderId`, `pieceId`, `channelId`, `grossCents`, `date` | Upserts the order, `origin` `person` for `ord_user_` IDs |
| `approval.requested` | `approvalId`, and `approval.kind`, `approval.subjectIds`, `approval.amountCents` when the inline approval is there | Upserts the approval as `pending`, so a new request starts it over. Without an inline approval it keeps the seeded kind and subjects |
| `approval.granted`, `approval.declined` | `approvalId` | Sets `granted` or `declined` when it's still `pending` (the first decision wins, as in the store). On a `listing_publish`, each `lst_` subject moves to `approved` or `declined` |
| `listing.requested` | `listingId`, `makerId` | Starts the listing over: `requested`, no piece |
| `listing.drafted` | `listingId`, `makerId` | Moves it to `drafted` |
| `listing.indexed` | `listingId`, `pieceId`, and the event's `key` | Moves it to `indexed` and sets `piece_id`. With `key` `b12-search` (the publish), the piece joins `catalog` with its maker's community from the catalog, empty titles and price 0 |

A listing only moves forward (`requested`, `drafted`, `indexed`, then `approved` or `declined`), except that a new request starts it over. A mirrored event that is malformed is skipped and changes nothing. Notes, titles, summaries, reasons and every other text in an event are never read, so nothing a person wrote is stored.

## Files

| Path | What |
|---|---|
| `module/package.json`, `module/tsconfig.json` | The module's packages and the tsconfig SpacetimeDB's template uses |
| `module/src/index.ts` | The ten tables and the reducers |
| `bridge.py` | T2: every call to SpacetimeDB, as the owner (below) |
| `feed.py` | T3: the one poller per server process and its snapshot, which `/api/b13/changes` and `/api/b13/status` answer from |
| `seed.py` | T4: the `seed_catalog` payload from `artifacts/mock/mock.json`, or B11's committed `server/b11_embed/data/mock.json` when that's missing |
| `save_token.py` | T4: step 4 above |
| `../routers/b13_live.py` | T5: the four endpoints |
| `../../src/sources/live/b13-live.ts` | T6: the live adapter (the poll, the mirror, the background seed) |

## The bridge, for the other upgrades

Import it inside a function, so a missing B13 never breaks your router:

```python
from server.b13_spacetime import bridge

if bridge.available():
    bridge.start_run(run_id, thread_id, "buyer")   # queued
    bridge.add_step(step_payload)                  # a swarm.step payload dict, queued
    bridge.finish_run(run_id)                      # queued
bridge.set_process("swarm", "working", 1)          # queued; "done" when the request ends
```

- `start_run`, `add_step`, `finish_run`, `set_process` and `touch_screen` go through one ordered background thread and return at once (True when queued). `record(events)`, `seed_catalog(payload)`, `expire_screens(ms)` and `sql(query)` answer directly.
- Every request has a 0.8-second timeout (the seed 5 seconds). A failure starts a 30-second back-off with one log line, and every call is a no-op meanwhile. Without `SPACETIME_TOKEN` the bridge is off and says so once. It never calls anonymously.
- `available()` is true when the token is set, no back-off is running and the last call worked.
- Tests swap the HTTP transport with `monkeypatch.setattr(bridge, "_transport", httpx.MockTransport(...))` and call `bridge.reset()` between tests.
