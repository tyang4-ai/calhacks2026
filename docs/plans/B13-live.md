# B13-live · The database: SpacetimeDB holds the platform's shared state

Priority: P0 · Wave: V2 · Depends on: I2-core (the `b13-live` source key, `data.synced`, the per-key registry and its `at` re-stamp for `start(emit)` events, `onEvent` from `src/core/store`, the page tag in `src/sources/ids.ts`, the health `services`, `SPACETIME_TOKEN` in `server/config.py`), S3-catalog (the data it seeds). B14 and B15 write to it when they run, and it works without them · Folder: `server/b13_spacetime/` · Source key: `b13-live` · Makes real: the data view, presence and process status on the process bar, and the swarm view's live steps on every open screen · Estimate: 3.5 h

**SCOPE:** `server/routers/b13_live.py, server/b13_spacetime/, src/sources/live/b13-live.ts, src/sources/live/b08-approvals.ts, src/sources/live/b08-approvals.test.ts, tests/server/test_b13_live.py, tests/server/b13_fixture.json`

## Goal

One database holds everything the demo is about (fix-plan 1.4, pillar 3). SpacetimeDB keeps the catalog (seeded from the mock data), the listings, the orders, the approvals, the swarm's runs and steps, each process's status and the screens that are watching. Every screen in live mode reads it: the data view shows its tables with row counts and newest rows, the process bar shows how many screens are watching and which processes are working, and the swarm view shows a run's steps as the agents take them, on every open screen at once. The SpacetimeDB track asks for shared live state at the core of the platform, and this is that.

Everything in it is fictional demo data from `src/mock/` and the events a session makes (fix-plan 1.6). It stores IDs, kinds, statuses, amounts and the catalog's own titles, never a person's free text.

## Read first

- `docs/v2/fix-plan.md` sections 1.4, 1.6 and 1.9 (short polling, private tables, `SPACETIME_TOKEN`). Where it disagrees with `docs/v2/contracts.md`, the fix plan wins until FX1 lands its contract changes.
- `docs/v2/contracts.md`:
  - section 1 (port 3000, `SPACETIME_URL`, `SPACETIME_DB`, `SPACETIME_TOKEN`, the hosts),
  - section 3 (`swarm.step`, `data.synced`, the B13 key rule),
  - section 5 (B13),
  - section 11 (`services.spacetime_reachable()`, `needs_service()`, the ID scheme).

  After I2-core: `docs/common/api-contract.md` B13.
- `docs/plans/F-process.md`, "The data view": the eight rows this database feeds
- `docs/plans/B14-swarm.md`: the step recorder that calls your bridge. `docs/plans/M-approvals.md`: the owner screen's live spec, for T7
- `docs/plans/B08-approvals.md` and `src/sources/live/b08-approvals.ts`: the `start(emit)` pattern
- `docs/tech/spacetimedb/`: `install-and-run-locally.md` (`--listen-addr`, the server-issued identity), `typescript-quickstart.md`, `tables.md`, `indexes-and-access.md` (private tables), `reducers.md` (the `init` reducer stores the owner, `ctx.sender`, `SenderError`), `http-api.md` (bearer tokens, reducer calls, `/sql`), `sql-reference.md` (no ORDER BY, `LIMIT` doesn't order), `publish-local-and-maincloud.md`, `cli-reference.md`. Check every path against these pages and `spacetime --help`. Don't write them from memory.
- `docs/v2/apis-and-accounts.md`, the SpacetimeDB section and Differences items 1 and 9
- `.claude/rules/backend.md`, `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Access** (B2-20, decided in fix-plan 1.9):
  - The local server starts with `spacetime start --listen-addr 127.0.0.1:3000` on every machine, so nothing on venue Wi-Fi can reach it.
  - Every table is private (the default). Only reducers and the database's owner can read them.
  - The bridge calls as the owner, with the publisher's token as `SPACETIME_TOKEN`, read only through `server/config.py` and sent through `config.spacetime_headers()` (`Authorization: Bearer <token>`), never built by the bridge itself, and never printed, logged or returned. `save_token.py` (below) puts it in `.env` without printing it.
  - The module's `init` reducer stores `ctx.sender` (the owner) in `config`. Every writing reducer throws `SenderError` unless `ctx.sender` is that owner, so an anonymous caller can neither read nor write.
  - Maincloud stays off for the demo. The README may document publishing there (it needs Gordon's `spacetime login` in a browser), and against Maincloud the feed would poll SQL the same way.
- **The module** (`server/b13_spacetime/module/`):
  - TypeScript (the 2.13.0 CLI supports TypeScript modules). If the installed CLI can't build one, Rust, and say so in the report, because Rust also needs `index.crates.io` and `static.crates.io`.
  - Database name `cindia` (`SPACETIME_DB`).
  - The eight tables F-process's data view shows, plus two of its own. Every table has `seq` (u64, auto-increment primary key, insert `0n`). Column names are snake case. Every text column is capped at 160 characters by the reducers.
    - `catalog`: `piece_id` (unique), `community_id`, `maker_id`, `title_en`, `title_zh`, `community_en`, `maker_name`, `price_cents`, `status` (`active`). The 54 pieces, plus each approved listing's piece.
    - `listings`: `listing_id` (unique), `maker_id`, `piece_id` (empty until indexed), `state` (`requested`, `drafted`, `indexed`, `approved` or `declined`), `updated_at`.
    - `orders`: `order_id` (unique), `piece_id`, `channel_id`, `gross_cents`, `date`, `origin` (`mock` or `person`).
    - `approvals`: `approval_id` (unique), `kind`, `subject_ids` (comma-joined), `amount_cents` (0 when none), `status` (`pending`, `granted` or `declined`), `updated_at`.
    - `runs`: `run_id` (unique), `thread_id`, `side`, `started_at`, `finished`.
    - `steps`: `step_id`, `run_id`, `thread_id`, `agent_id`, `kind`, `summary_en`, `summary_zh`, `tool_name` (empty when none), `ms`, `model` (empty when none). `step_id` is a plain column, so rows are keyed by `seq` (B2-2).
    - `processes`: `process_id` (unique), `status` (`working` or `done`), `count`, `updated_at`.
    - `screens`: `screen_id` (unique), `role` (`buyer`, `seller` or `tour`), `last_seen`.
    - `changes`: `table`, `row_id`, `op` (`insert`, `update` or `delete`), `at`. Every writing reducer appends one row per row it changes, except a presence refresh. The feed polls only this table.
    - `config`: `key` (unique), `owner` (identity), `epoch` (the publish time in seconds). Written once by `init`.
  - Reducers, each validating its arguments and doing one thing:
    - `init` (lifecycle): stores the owner and the epoch.
    - `seed_catalog(payload_json)`: upserts the catalog, the scripted orders and the scripted approvals from one JSON payload. Idempotent.
    - `record(events_json)`: applies up to 50 Cindia events, idempotent by record ID: `order.placed` upserts `orders` (origin `person` for `ord_user_` IDs), `approval.requested`, `approval.granted` and `approval.declined` upsert `approvals`, a grant of a `listing_publish` approval marks its listing `approved`, a decline marks it `declined`, `listing.requested`, `listing.drafted` and `listing.indexed` move a listing's `state`, and a `listing.indexed` keyed `b12-search` (the publish) adds its piece to `catalog`. Every other type is ignored. It keeps no text but the catalog's own titles.
    - `start_run(run_id, thread_id, side)`: inserts the run, or, for a run ID it already holds, deletes that run's old steps and starts it over (D1-20).
    - `add_step(run_id, step_id, thread_id, agent_id, kind, summary_en, summary_zh, tool_name, ms, model)`: inserts a step, skipping an exact repeat of the same `run_id` and `step_id`.
    - `finish_run(run_id)`.
    - `set_process(process_id, status, count)`: upserts one process row (C-4).
    - `touch_screen(screen_id, role)`: inserts a screen (logged as a change) or refreshes its `last_seen` (not logged).
    - `expire_screens(older_than_ms)`: deletes screens not seen in that long (logged).
    - `clear_runs()`: deletes every run and step, a demo-prep step (B2-2).
  - `server/b13_spacetime/README.md` gives the exact commands for the installed version, each with the folder it runs from: install the module's packages and build in `server/b13_spacetime/module/`, `spacetime publish -s local cindia` from `server/b13_spacetime/module/` (never the CLI's Maincloud default), `python server/b13_spacetime/save_token.py` from the repo root, clear runs before a demo (`spacetime call -s local cindia clear_runs`, from anywhere), and, optionally, Maincloud.
- **Bridge** (`server/b13_spacetime/bridge.py`), imported inside functions by B12, B14, B15 and B16:
  - `start_run(run_id, thread_id, side)`, `add_step(payload)` (a `swarm.step` payload dict), `finish_run(run_id)`, `set_process(process_id, status, count)`, `record(events)`, `seed_catalog(payload)`, `touch_screen(screen_id, role)`, `expire_screens(ms)`, `sql(query) -> list[dict]`.
  - Each is one HTTP call to `SPACETIME_URL` (default `http://127.0.0.1:3000`): `POST /v1/database/<db>/call/<reducer>` with a JSON array of the arguments in order, or `POST /v1/database/<db>/sql` with the query text, with the headers from `config.spacetime_headers()` and a 0.8-second timeout.
  - Calls from a swarm run or a scan go through one ordered background thread, so a run never waits on SpacetimeDB and its steps land in order (B2-12).
  - When SpacetimeDB doesn't answer, every call is a no-op that logs one line without the token, and the bridge stops trying for 30 seconds.
  - Without `SPACETIME_TOKEN`, the bridge is unavailable and says so once. It never falls back to an anonymous identity, which couldn't read the private tables (D2-36, decided as fix-plan 1.9).
  - `available() -> bool` says whether the last call worked.
- **Feed** (`server/b13_spacetime/feed.py`): one background poller per server process, started on the router's first request, not one per screen:
  - Every 500 ms it runs `SELECT * FROM changes WHERE seq > <last>` and sorts the rows by `seq` in Python, since the SQL has no ORDER BY.
  - When there are changes, it re-reads only the tables they touch (all small) and updates an in-memory snapshot: each table's row count and its newest three rows by `seq`, the process rows, the count of screens seen in the last 15 seconds, and a ring of the newest 500 steps.
  - Every 10 seconds it calls `expire_screens(15000)`.
  - When SpacetimeDB is down, it keeps the last snapshot, marks `spacetime: false`, and retries every 2 seconds.
- **Events this database sends** (key `b13-live`, `source: "live"`, `at` 0):
  - `swarm.step`, one per new `steps` row, mapped field for field, with empty `tool_name` and `model` left out.
  - `data.synced`, the shape decided with F-process: `{ tables: { table, rows, newest: { id, label }[] }[], screens, processes: { processId, status }[] }`. `table` is one of the eight names above, `newest` holds at most three rows newest first, `id` is the row's record ID and `label` is a short label built by code from the row's kind, state, status, amount or catalog title (never a person's words). `screens` is the count of screens seen in the last 15 seconds.
  - IDs are `evt_live_` plus `131` for a step or `132` for a `data.synced`, then the database's `epoch` modulo 1,000,000 (six digits), then the change's `seq` (nine digits). A resent row gets the same ID, so the store's `log` keeps it once, and a republished database never reuses an old ID (B2-15, D1-52).
  - The registry re-stamps the `at` of every `start(emit)` event with the player clock on arrival (I2-core, B2-14), so live steps light up on the swarm graph as they land. The adapter doesn't re-stamp.
- **Endpoints** (`server/routers/b13_live.py`, `router = APIRouter(prefix="/api/b13")`, no key needed from the browser):
  - `GET /api/b13/changes?after=<seq>&screen=<screenId>&role=<role>` returns `{ "events": CindiaEvent[], "seq": number }` in under 300 ms, answered from the feed's snapshot. No stream, so nothing holds a connection or blocks a reload (B2-1, decided in fix-plan 1.9).
    - `events` holds a `swarm.step` for each step whose change `seq` is above `after`, then one `data.synced` when anything changed above `after`.
    - With `after=0` (a screen's first poll), it sends steps only for runs still going or finished in the last 60 seconds, so a fresh screen never replays an old run, and always one `data.synced` (B2-15).
    - `seq` is the newest change `seq` the answer covers. The next poll asks after it.
    - It refreshes the caller's `screens` row through `touch_screen` at most every 5 seconds. `screen` must match `scr_` plus 6 to 12 letters or digits, and `role` one of the three roles, or it answers 400 `bad_request`.
  - `GET /api/b13/status` returns `{ "spacetime", "db", "seeded", "screens", "tables": { "table", "rows" }[], "seq" }` from the snapshot, in under 300 ms. `spacetime` agrees with `services.spacetime_reachable()` and the bridge's `available()`. `seeded` is true when `catalog` holds at least 54 rows. It never returns a token or a URL with credentials. This isn't an events response.
  - `POST /api/b13/seed` `{ "trigger": null }`, up to 10 seconds: builds the catalog, the scripted orders and the scripted approvals from the server's own `artifacts/mock/mock.json` (never from the request) and calls `seed_catalog` once. Idempotent, single flight. Returns `{ "events": [] }`.
  - `POST /api/b13/record` `{ "trigger": null, "events": CindiaEvent[] }`, at most 50 events and 256 KB, under 1 second: keeps only the mirrored types above, checks each event's ID and record IDs against the contract's ID patterns, drops every text field the module doesn't store, and calls `record` once through the bridge. Returns `{ "events": [] }`.
  - Errors: 503 `upstream_error` when the bridge has no token or SpacetimeDB is down for `seed` and `record`. `changes` and `status` always answer from the snapshot.
- **Saving the token** (`server/b13_spacetime/save_token.py`, run by the orchestrator once per machine after publishing): runs `spacetime login show --token`, reads the token from its output inside Python, and writes or replaces one line `SPACETIME_TOKEN=<token>` in the repo's `.env`, printing only "SPACETIME_TOKEN saved to .env". It never echoes, logs or returns the value. uvicorn picks it up on its next restart.
- **Adapter** (`src/sources/live/b13-live.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b13` and `services.spacetime` is true, then `GET /api/b13/status` says `spacetime`. When `seeded` is false, start `POST /api/b13/seed` in the background and answer false until it's done (B04's pattern, retried after 20 seconds on a failure).
  - `start(emit)`:
    - Makes the screen ID `scr_` plus `pageTag()` from `src/sources/ids.ts`, and the role from the route: `/shop` is `buyer`, `/sell` and `/maker` are `seller`, `/demo` is `tour`.
    - **Poll:** every 500 ms, one request at a time (a tick is skipped while one is in flight), `GET /api/b13/changes` with the last `seq`, aborting at 2 seconds. It emits each returned event that passes `validateEvent()` and is a `swarm.step` or `data.synced` with key `b13-live`, then keeps the new `seq`.
    - **Mirror:** it listens with `onEvent` from `src/core/store`, queues every `order.placed`, `approval.requested`, `approval.granted`, `approval.declined`, `listing.requested`, `listing.drafted` and `listing.indexed`, scripted, live or a person's, and once a second posts the queue to `POST /api/b13/record`, each event ID once per page load. So in live mode the database fills as the tour plays and as people use the platform, and every other screen sees it.
    - Returns a stop function that stops the poll and the mirror and keeps the sent-ID set for the page load.
  - `produce()` returns `[]`, because no timeline event is keyed `b13-live`.
  - Duplicate steps are harmless. B14's response carries the same `stepId`s, and the store's reducers are idempotent per ID.
  - Nothing runs in scripted mode, because the registry starts adapters only in live mode. The data view then shows its scripted rows from `src/mock/`.
- **Process status** (C-4): B12, B14, B15 and B16 call `bridge.set_process(<processId>, "working", n)` when a person's request starts and `"done"` when it ends, through the ordered queue. The process bar reads these rows from `data.synced` in live mode (F-process).

## Tasks

One backend-builder does T1 to T7 in order. Each task adds its own tests to `tests/server/test_b13_live.py` (T7 to its own test file). No test opens a stream, so none can hang the gate.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The module: the ten tables, the reducers with the owner check, its package files, and the README with the commands. A test builds it with the CLI, skipped when `spacetime` isn't on the path | `server/b13_spacetime/module/`, `server/b13_spacetime/README.md` | the CLI installed (V0) | opus |
| T2 | `bridge.py`: the reducer and SQL calls with the owner token from config, the ordered background queue, the no-op and back-off, no anonymous fallback. Tests with httpx `MockTransport`: the request path and argument order per reducer, the queue keeps order, no-op on a refused connection, back-off for 30 seconds, no log line or error carrying the token | `server/b13_spacetime/__init__.py`, `server/b13_spacetime/bridge.py` | T1 | opus |
| T3 | `feed.py`: the one poller, the snapshot, the step ring, presence and expiry, and the mapping to `swarm.step` and `data.synced` with IDs from the epoch and `seq`. Tests with a fake row source: field mapping, labels built from fields only, the order by `seq`, no event sent twice, the 60-second replay rule on a first poll, a SpacetimeDB outage keeps the last snapshot | `server/b13_spacetime/feed.py`, `tests/server/b13_fixture.json` | T2 | opus |
| T4 | `seed.py` and `save_token.py`: the catalog, orders and approvals payload from `mock.json`, and the token saver. Tests: the payload holds 54 catalog rows and the scripted approvals from the fixture, `save_token.py` replaces only its own line and prints no token (with a fake CLI) | `server/b13_spacetime/seed.py`, `server/b13_spacetime/save_token.py` | T2 | sonnet |
| T5 | The four endpoints. Tests with TestClient: the `changes` shape, `seq` and the screen check, `record` keeps only the mirrored types and strips text, `status` has no token or credentialed URL, `seed` is idempotent and single flight. One `live` test, under `needs_service("spacetime")`, writes three steps and one order through the bridge and reads them back through `/api/b13/changes` | `server/routers/b13_live.py` | T3, T4 | opus |
| T6 | The live adapter: the poll, the mirror, `health()` with the background seed | `src/sources/live/b13-live.ts` | T5 | sonnet |
| T7 | B08's owner screen moves to `/sell/approvals?screen=owner` (D1-19, D2-8, decided with M-approvals). `start(emit)` polls the pending list only while the path is `/sell/approvals` and the query has `screen=owner`, so the Sell site on the console doesn't count as an owner screen. After forwarding a person's decision, `produce()` returns `[]`, so the scripted answer plays (a milestone grant's `wip.milestone_paid` and its move). A vitest covers the route check and the empty answer | `src/sources/live/b08-approvals.ts`, `src/sources/live/b08-approvals.test.ts` | none | sonnet |
| T8 | **If time** (fix-plan 1.5): B08's approval queue moves onto SpacetimeDB, so the seal crosses two screens through it. The owner screen's pending list and the console's wait read `approvals` through `/api/b13/changes` instead of B08's in-memory queue. Needs a contract line from the orchestrator first | `src/sources/live/b08-approvals.ts`, `server/b13_spacetime/feed.py` | T6, T7 | opus |

### Orchestrator steps (not the builder's)

- **V0:** install the SpacetimeDB CLI into the home directory (on a 403 from a GitHub release download, fetch the asset from `release-assets.githubusercontent.com` with curl, D2-27), run `spacetime server set-default local`, and start `spacetime start --listen-addr 127.0.0.1:3000` in the background. The heartbeat restarts it when port 3000 stops answering.
- **After T1:** install the module's packages and run `spacetime publish -s local cindia` from `server/b13_spacetime/module/`, as the README says.
- **After T4:** run `python server/b13_spacetime/save_token.py` (T4 writes it), then restart `npm run server` so `config.py` reads `SPACETIME_TOKEN`.
- **After T5:** confirm `GET /api/b13/status` reports `spacetime: true`, then `POST /api/b13/seed` once, or let the adapter do it.
- **Before every recorded demo:** `spacetime call -s local cindia clear_runs`, so no old run shows.

## Acceptance

- Given the local server and the published module, when B14's recorder calls `add_step` three times, then a screen polling `/api/b13/changes` gets three valid `swarm.step` events with key `b13-live`, in order, each within a second of the write.
- Given two browsers on the build in live mode, when one asks the support drawer a question, then both see the same steps in the swarm view, and both get a `data.synced` whose `screens` is 2 and whose `steps` and `runs` rows went up.
- Given a person's checkout in live mode on one screen, then the other screen's `data.synced` shows one more `orders` row with origin `person`. This works with B14 down.
- Given an anonymous request to SpacetimeDB's SQL endpoint, then it can't read any table, and an anonymous reducer call is refused.
- Given SpacetimeDB stopped, when the swarm runs, then every bridge call returns at once without an error, the swarm's answer still arrives from B14's response, and `/api/b13/changes` keeps answering from its last snapshot.
- Given `/api/b13/status` or any log line, then neither holds a token or a URL with credentials.
- Given a server file edited while two screens poll, then uvicorn reloads without waiting on any open connection.
- Given B08 in live mode, when `/sell/approvals?screen=owner` is open on a second screen, then `/api/b08/status` says `ownerConnected`, the console waits for its decision, and a person's grant of `apr_05` still brings the scripted `wip.milestone_paid`. M-approvals' `approvals-live.spec.ts` passes.
- `npm run test:server` passes. **G5 for v2** (fix-plan 1.4) passes as `npm run gate -- G5 b13-live process-live-data`: `npm run test:server`, then the live feature spec `tests/features/process-live-data.spec.ts` (F-process's feature-lead writes it), where two pages in live mode open, a person's own request on one (a support question, or a checkout when B14 is blocked) reaches the other through `/api/b13/changes` as `swarm.step` or `data.synced` events with every event valid, and `process-presence` reads two screens, and the scripted tour still passing with `b13-live` in live mode.

## Out of scope

- Moving money in SpacetimeDB. It records orders and approvals, and the books stay where v1 keeps them.
- Logins and per-user permissions. One owner identity writes, nobody else reads.
- Maincloud as a requirement.
- A WebSocket subscription from Python. The feed polls SQL, which is enough for one poller on localhost.

## Contract additions needed

FX1 writes these into `docs/v2/contracts.md`. I2-core merges them.
- Section 1: `SPACETIME_TOKEN`, the publisher's token, written to `.env` by `server/b13_spacetime/save_token.py`, read only through `server/config.py`. The local server always starts with `spacetime start --listen-addr 127.0.0.1:3000`. A Rust module also needs `index.crates.io` and `static.crates.io`, and not `sh.rustup.rs`.
- Section 3: `data.synced` keyed `b13-live`, `{ tables: { table, rows, newest: { id, label }[] }[], screens, processes: { processId, status }[] }`, as decided with F-process, with table names `catalog`, `listings`, `orders`, `approvals`, `runs`, `steps`, `processes` and `screens`.
- Section 5, B13 (replacing the stream): the ten tables and reducers above, private, written only by the owner. `GET /api/b13/changes?after=<seq>&screen=<screenId>&role=<role>` returns `{ events, seq }`. `GET /api/b13/status` returns `{ spacetime, db, seeded, screens, tables, seq }`. `POST /api/b13/seed` `{ trigger }` and `POST /api/b13/record` `{ trigger, events }` each return `{ events: [] }`. Event IDs come from the database's epoch and the change `seq`. Screen IDs are `scr_` plus the page tag. `/api/b13/stream` and its `role` parameter are gone.
- Section 4: the owner screen for B08 is `/sell/approvals?screen=owner`.
- `tests/demo/beats.ts` (I2-tour T6): `REQUIRED_SERVICES` has `b13-live: spacetime`.
- F-process's feature-lead writes `tests/features/process-live-data.spec.ts` for this G5.
- I2-core already gives B13 `SPACETIME_TOKEN` and `config.spacetime_headers()`, `pageTag()`, `onEvent`, the `data.synced` type and reducer, and the registry's `at` re-stamp.
