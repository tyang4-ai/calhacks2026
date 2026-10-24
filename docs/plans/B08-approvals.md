# B08-approvals · Approvals on a second screen (F9)

Priority: P2 · Wave: P2 · Depends on: G4 · Folder: server/routers/ · Source key: `b08-approvals` · Makes real: F-approvals · Estimate: 1 h

**SCOPE:** `server/routers/b08_approvals.py, src/sources/live/b08-approvals.ts, tests/server/test_b08_approvals.py`

## Goal

The owner approves on a real second screen, a phone or a second tab, and the console sees the decision. Cindy proposes, and the only path to `approval.granted` is the owner's tap. Hyphenate and Microsoft both judge whether the human stays in charge of the money.

## Read first

- `docs/common/api-contract.md`: Rules for every endpoint, and B08
- `docs/common/events.md`: Approvals, Sources and live replacement
- `docs/common/data-model.md`: Approval, MakerPayout, Demo-critical figure 9
- `docs/plans/F-approvals.md`
- `docs/harness/lessons.md`, and the Upgrade checklist in `docs/common/definition-of-done.md`

## Interfaces

- **Endpoints:** the five B08 routes in `api-contract.md`. No key. The server keeps approvals in memory, so a restart clears them.
- **Decisions are final:** a second decision on the same approval returns the first one again, with status 200.
- **The console's adapter** (`src/sources/live/b08-approvals.ts`, default export a `LiveAdapter`):
  - `health()`: `GET /api/health` lists `b08`.
  - On the keyed `approval.requested`: post it to `/api/b08/approvals` and return the live twin.
  - On the scripted `approval.granted`: check `GET /api/b08/status`. With no owner screen connected, return `[]` at once, so the scripted grant plays on time. With one connected, long-poll `GET /api/b08/approvals/{id}?wait=6` and return the owner's decision, or `[]` if none came.
- **The owner's phone,** a second screen on `/owner` in live mode, through the same adapter file:
  - `start(emit)`: only on the `/owner` route, poll `GET /api/b08/approvals?status=pending` every 2 seconds and emit the `approval.requested` events it returns. It returns a stop function that ends the polling. On any other route it does nothing, so the console never counts as an owner screen and its scripted grants stay on time.
  - The owner's tap: the registry hands the person's `approval.granted` or `approval.declined` to `produce()` (Requests from people in `events.md`), which posts `/api/b08/approvals/{approvalId}/decision` with the decision and the reason and returns the server's event. The server accepts `trigger` as that event or `null`, since `api-contract.md`'s rules and its B08 table differ.

## Tasks

| ID | Task | Files it owns | Depends on | Model |
|---|---|---|---|---|
| T1 | The in-memory store, the five routes, the owner-connected clock | `server/routers/b08_approvals.py` | none | opus |
| T2 | Tests: register, list pending, grant, decline, a second decision, a wait that times out with `wait=1` and returns `[]`, `ownerConnected` false then true after a poll | `tests/server/test_b08_approvals.py` | T1 | opus |
| T3 | The console's live adapter | `src/sources/live/b08-approvals.ts` | T1 | opus |

## Acceptance

- A registered approval appears in the pending list. A grant from the owner reaches the console's long-poll as `approval.granted` with `by: "own_01"`.
- With no owner screen open, the 60-second demo in live mode runs on time with the scripted grant.
- With a second tab on `/owner` in live mode, the pending approvals show there, and a tap reaches the console's long-poll as the decision.
- Nothing lets Cindy, the console or any route grant an approval except the owner's decision route.
- `npm run test:server` passes, and G4 passes in scripted and live mode.

## Out of scope

- Logins, push notifications to a real phone, persistence across restarts.
