# B13-live · Live shared state on SpacetimeDB

Priority: P1 · Wave: V2 · Depends on: I2-core (the `b13-live` source key, the per-key registry, the health `services`) · Folder: `server/b13_spacetime/` · Source key: `b13-live` · Makes real: the swarm view and the process blocks in live mode, on every open screen at once · Estimate: 3 h

**SCOPE:** `server/routers/b13_live.py, server/b13_spacetime/, src/sources/live/b13-live.ts, tests/server/test_b13_live.py`

## Goal

Every agent step the swarm takes is written to SpacetimeDB as it happens, and every open screen sees it stream in, so a judge watching the swarm graph sees the agents light up live. Two browsers on the same build count each other. The SpacetimeDB track asks for this: shared live state between agents and people, at the core of the app.

## Read first

- `docs/v2/contracts.md`:
  - section 1 (port 3000, `SPACETIME_URL`, `SPACETIME_DB`, the hosts),
  - section 3 (`swarm.step`, the B13 key rule),
  - section 5 (B13).
  
  After I2-core: `docs/common/api-contract.md` B13.
- `docs/plans/B14-swarm.md`: the step recorder that calls your bridge
- `docs/plans/B08-approvals.md` and `src/sources/live/b08-approvals.ts`: the `start(emit)` pattern
- SpacetimeDB's docs for the installed CLI version: TypeScript server modules (tables, reducers, `ctx.timestamp`), `spacetime start`, `spacetime publish`, the HTTP API (calling a reducer, the SQL endpoint, identities and tokens) and the WebSocket subscription protocol. Check the paths with `spacetime --help` and the docs before coding. Don't write them from memory.
- `.claude/rules/backend.md`, `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **The module** (`server/b13_spacetime/module/`):
  - Written in TypeScript if the installed CLI can create and publish a TypeScript module (`spacetime init` with the TypeScript language). Otherwise Rust, and say so in the report, because Rust needs its toolchain installed.
  - Database name `cindia` (`SPACETIME_DB`).
  - Tables, column names in snake case:
    - `swarm_run`: `run_id` (primary key), `thread_id`, `side`, `started_at` (timestamp), `finished` (bool),
    - `swarm_step`: `step_id` (primary key), `seq` (auto-increment, unique), `run_id`, `thread_id`, `agent_id`, `kind`, `summary_en`, `summary_zh`, `tool_name` (empty when none), `ms`, `model` (empty when none),
    - `process_status`: `process_id` (primary key), `status`, `count`, `updated_at`,
    - `screen`: `screen_id` (primary key), `role` (`buyer`, `seller` or `tour`), `last_seen` (timestamp).
  - Reducers, each validating its arguments and doing one thing:
    - `start_run(run_id, thread_id, side)`,
    - `add_step(step_id, run_id, thread_id, agent_id, kind, summary_en, summary_zh, tool_name, ms, model)`, which ignores a repeated `step_id`,
    - `finish_run(run_id)`,
    - `set_process(process_id, status, count)`,
    - `join_screen(screen_id, role)`, which inserts or refreshes `last_seen`,
    - `leave_screen(screen_id)`.
  - `server/b13_spacetime/README.md` gives the exact commands for the installed version: build, publish to the local server as `cindia`, clear the database, and optionally publish to Maincloud (that needs `spacetime login` in a browser, Gordon's call).
- **Bridge** (`server/b13_spacetime/bridge.py`), imported by B14 and B15:
  - `start_run(run_id, thread_id, side)`, `add_step(payload)` (a `swarm.step` payload dict), `finish_run(run_id)`, `set_process(process_id, status, count)`.
  - Each makes one HTTP reducer call to `SPACETIME_URL` (default `http://127.0.0.1:3000`) with a 0.8-second timeout. It gets an identity token once if the server requires one, and keeps it in memory.
  - When SpacetimeDB doesn't answer, every call is a no-op that logs one line, and the bridge stops trying for 30 seconds, so the swarm never waits on it.
  - `available() -> bool` says whether the last call worked.
- **Endpoints** (`server/routers/b13_live.py`, `router = APIRouter(prefix="/api/b13")`, no key needed):
  - `GET /api/b13/stream?role=buyer|seller|tour`: server-sent events (`text/event-stream`, with `Cache-Control: no-cache` and `X-Accel-Buffering: no`).
    - On connect it calls `join_screen` with a new screen ID and the role, and on disconnect `leave_screen`.
    - It sends the steps of the latest run, then each new `swarm_step` row as it lands, one `CindiaEvent` per message's `data`: `swarm.step`, `source: "live"`, `key: "b13-live"`, ID `evt_live_` from a counter starting at 1300001, `at` 0.
    - It uses the WebSocket subscription when that works from Python. Otherwise it polls the SQL endpoint every 250 ms for rows with `seq` above the last one sent.
    - Every 10 seconds it sends a comment line as a heartbeat and refreshes `join_screen`.
    - When SpacetimeDB drops, the stream stays open, keeps the heartbeat and retries every 2 seconds.
  - `GET /api/b13/status` returns `{ "spacetime", "db", "screens" }`. `spacetime` is true when a SQL ping answers. `screens` counts rows seen in the last 30 seconds. This isn't an events response.
- **Adapter** (`src/sources/live/b13-live.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b13` and `services.spacetime` is true, then `GET /api/b13/status` says `spacetime`.
  - `start(emit)`:
    - Opens an `EventSource` on `/api/b13/stream` with the role from the route (`/shop` is buyer, `/sell` and `/maker` are seller, `/demo` is tour).
    - Emits each message that parses, passes `validateEvent()` and is a `swarm.step` with key `b13-live`.
    - Returns a stop function that closes the stream.
  - `produce()` returns `[]`, because no timeline event is keyed to `b13-live`.
  - Duplicate steps are harmless. B14's response carries the same `stepId`s, and the store's reducers are idempotent per ID.

## Tasks

One backend-builder does these in order. Each task adds its own tests to `tests/server/test_b13_live.py`.

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The module: tables, reducers, its package or crate files, and the README with the commands. A test builds it with the CLI, skipped when `spacetime` isn't on the path | `server/b13_spacetime/module/`, `server/b13_spacetime/README.md` | the CLI installed (V0) | opus |
| T2 | `bridge.py`: the reducer calls, the token, the no-op and back-off. Tests with httpx `MockTransport`: the request path and argument order per reducer, no-op on a refused connection, back-off for 30 seconds, no log line with a token | `server/b13_spacetime/__init__.py`, `server/b13_spacetime/bridge.py` | T1 | opus |
| T3 | `feed.py`: the poller (and the subscription if workable) turning rows into `swarm.step` events. Tests with a fake row source: field mapping, empty `tool_name` and `model` left out, the order by `seq`, no event sent twice | `server/b13_spacetime/feed.py` | T2 | opus |
| T4 | The two endpoints. Tests with TestClient streaming: `data:` lines that parse and validate, `join_screen` on connect and `leave_screen` on close, the heartbeat, the status shape | `server/routers/b13_live.py` | T3 | opus |
| T5 | The live adapter | `src/sources/live/b13-live.ts` | T4 | sonnet |

### Orchestrator steps (not the builder's)

- **V0:** install the SpacetimeDB CLI into the home directory and run `spacetime start` in the background on port 3000.
- **After T1:** install the module's dependencies if it's TypeScript, run the publish command from the README, and confirm `GET /api/b13/status` reports `spacetime: true`.

## Acceptance

- Given the local server and the published module, when B14's recorder calls `add_step` three times, then a connected `/api/b13/stream` sends three valid `swarm.step` events with key `b13-live`, in order, each within half a second.
- Given two browsers on the build in live mode, when one asks the support drawer a question, then both see the same steps in the swarm view, and `GET /api/b13/status` counts 2 screens.
- Given SpacetimeDB stopped, when the swarm runs, then every bridge call returns at once without an error, the swarm's answer still arrives (from B14's response), and the stream stays open.
- Given `/api/b13/status`, when it's called, then it never returns a token or a URL with credentials.
- `npm run test:server` passes, and G5 for `b13` passes: the tour in live mode with B14 live shows `b13-live` live in the swarm view.

## Out of scope

- Storing orders, money or approvals in SpacetimeDB. The books stay where v1 keeps them.
- Logins and per-user permissions.
- Maincloud as a requirement. It stays optional and needs Gordon's login.

## Contract additions needed

- The column names and reducer argument lists above.
- The `role` query parameter on `/api/b13/stream`.
- If the module ends up in Rust: `static.rust-lang.org` and `sh.rustup.rs` in the hosts list.
