# Events

Read by every feature, the integrator and the backend. The UI never fetches data or runs timers of its own. It renders a store that is built from a stream of events. In Phase 1 the scripted player emits every event. In Phase 2 a live adapter replaces the events for its own key, and the screens don't change.

## The envelope

```ts
type Source = "scripted" | "live" | "user";

interface CindiaEvent<T extends EventType = EventType> {
  id: string;          // "evt_0001" scripted, "evt_live_0001" live, "evt_user_0001" user
  type: T;             // one of the types below
  at: number;          // ms on the player clock when it fires
  source: Source;
  key?: SourceKey;     // set on events a live adapter can replace
  payload: Payloads[T];
}
```

- IDs inside payloads point at the entities in `data-model.md`. Components look the entity up with `getById()` from `src/mock`. Payloads don't copy entity data.
- `Text` is `{ en: string; zh: string }`. Amounts are integer cents.

## Event types

### Buyer (F-buyer)

| Type | Payload | Key |
|---|---|---|
| `concierge.asked` | `query: string`, `lang` | |
| `concierge.answered` | `query`, `pieceIds: string[]` (three), `reasons: Record<pieceId, Text>` | `b09-concierge` |
| `piece.opened` | `pieceId` | |
| `split.shown` | `pieceId`, `grossCents`, `cardFeeCents`, `platformFeeCents`, `materialsCents`, `makerShareCents` | `b10-derived` |
| `checkout.started` | `pieceId`, `grossCents` | |
| `card.tokenized` | `token` (`tok_` and 12 letters or digits), `brand: "visa"`, `last4` | |
| `order.placed` | `orderId`, `pieceId`, `channelId`, `buyerId`, `grossCents`, `date` | `b04-bank` |
| `receipt.updated` | `orderId`, `status: "received" \| "paid_to_maker"`, `makerId`, `makerShareCents`, `paidDate?` | `b10-derived` |

### Money (F-money-map)

| Type | Payload | Key |
|---|---|---|
| `money.moved` | `moveId`, `kind: "sale" \| "fee" \| "settlement" \| "payout_in" \| "materials" \| "maker_pay" \| "refund"`, `from: Party`, `to: Party`, `amountCents`, `refId`, `date` | `b04-bank` |
| `account.synced` | `accountId`, `balanceCents`, `asOf` (a date) | `b04-bank` |

`Party` is `{ kind: "buyer" \| "cindia" \| "card_network" \| "studio" \| "maker" \| "gallery" \| "processor" \| "supplier"; id?: string }`.

### The month (F-reconcile)

| Type | Payload | Key |
|---|---|---|
| `month.started` | `monthId` | |
| `record.arrived` | `recordId`, `recordType: "order" \| "payout" \| "refund" \| "statement" \| "bank_txn"`, `date` | |
| `match.made` | `matchId`, `kind` (from Match), `recordIds` | `b01-match` |
| `flag.raised` | `flagId`, `kind`, `recordIds`, `expectedCents`, `actualCents`, `deltaCents` | `b01-match` |
| `flag.explained` | `flagId`, `trustRecordId`, `explanation: Text` | `b02-explain` |
| `ledger.posted` | `entryIds: string[]` | |
| `month.closed` | `monthId`, `salesCents`, `feesCents`, `makerPayCents`, `heldCents` | |

### Cindy (every feature that shows the agent)

| Type | Payload | Key |
|---|---|---|
| `agent.acted` | `actId`, `kind: "match" \| "flag" \| "explain" \| "draft" \| "propose" \| "close" \| "answer" \| "score"`, `text: Text`, `refId?` | |

`agent.acted` is Cindy's running log: one short line per thing she does, in first person ("Matched 3 orders to one payout."). Panels may show the latest lines. It never carries numbers that aren't also in another event.

### Approvals (F-approvals)

| Type | Payload | Key |
|---|---|---|
| `approval.requested` | `approvalId` | `b08-approvals` |
| `approval.granted` | `approvalId`, `by: "own_01"`, `date` | `b08-approvals` |
| `approval.declined` | `approvalId`, `by: "own_01"`, `reason: Text` | `b08-approvals` |
| `followup.sent` | `followUpId`, `approvalId` | `b02-explain` |
| `payout.sent` | `makerPayoutId`, `makerId`, `amountCents`, `date` | `b04-bank` |

Only the owner's surface emits `approval.granted` or `approval.declined` with `source: "user"`. The demo timeline also carries a scripted `approval.granted`, so the 60-second run plays by itself. The store ignores a second grant for the same approval, so a person tapping first is fine.

### The close (F-close, F-maker-statement, F-impact)

| Type | Payload | Key |
|---|---|---|
| `workbook.ready` | `monthId`, `fileName`, `sheets: string[]` | `b06-workbook` |
| `statement.issued` | `makerStatementId`, `makerId` | `b10-derived` |
| `impact.updated` | `impactId` | `b10-derived` |

### Proof, Ask Cindy, the scenario

| Type | Payload | Key |
|---|---|---|
| `proof.scored` | `caught`, `total`, `results: { errorId; caught: boolean }[]` | `b03-proof` |
| `ask.asked` | `questionId`, `text`, `lang` | |
| `ask.answered` | `questionId`, `answer: Text`, `chart?: ChartSpec`, `refIds: string[]` | `b07-ask` |
| `scenario.loaded` | `scenarioId`, `fileName`, `recordIds` | `b05-scenario` |

`ChartSpec` is `{ type: "bar" \| "line"; title: Text; labels: string[]; series: { name: Text; valuesCents: number[] }[] }`. Recharts draws it with the kit's `chartTheme`.

### The demo stage (I1)

| Type | Payload | Key |
|---|---|---|
| `beat.started` | `beatId` (from `demo-script.md`), `camera: CameraId` (from `ui-contract.md`) | |

## The player (`src/core/player.ts`)

```ts
interface Timeline { id: string; durationMs: number; events: CindiaEvent[] } // events sorted by `at`

interface Player {
  load(timeline: Timeline): void;
  play(): void;
  pause(): void;
  reset(): void;                    // clock to 0, store cleared
  seek(ms: number): void;           // replays every event up to ms at once, without animation
  setSpeed(x: 1 | 2 | 4 | 8): void;
  now(): number;                    // the player clock, the only clock motion may use
  isPlaying(): boolean;
}
```

- The player uses `requestAnimationFrame` and its own clock. Tests can drive it with `seek()`.
- Timelines live in `src/mock/timelines/`. `demo` is the 60-second run, `month` is the fast-forward month the demo plays inside its beats.

## The store (`src/core/store.ts`)

- `emit(event)` adds an event. The player, live adapters and user actions all go through it.
- `useCindia(selector)` reads state in components, built on `useSyncExternalStore`. No other state library.
- Every reducer is idempotent per entity ID, so replaying or duplicating an event never double-counts.
- The state holds IDs and statuses only, under these keys: `clock`, `mode` (`"scripted" \| "live"`), `lang` (`"en" \| "zh"`), `buyer`, `money`, `month`, `agent`, `approvals`, `close`, `proof`, `ask`, `impact`, `demo`, `scenario`, and `sources` (`Record<SourceKey, "scripted" \| "live">`, the last source that delivered each key).
- The scaffolder writes a reducer for every event type in this file in S1, with unit tests. Features add none.

## Sources and live replacement (`src/sources/`)

```ts
type SourceKey = "b01-match" | "b02-explain" | "b03-proof" | "b04-bank" | "b05-scenario"
  | "b06-workbook" | "b07-ask" | "b08-approvals" | "b09-concierge" | "b10-derived";

interface LiveAdapter {
  key: SourceKey;
  health(): Promise<boolean>;                                   // GET /api/health and its own check
  produce(event: CindiaEvent, state: CindiaState): Promise<CindiaEvent[]>;
}
```

- The registry finds adapters in `src/sources/live/` with `import.meta.glob`. Adding an adapter never edits the registry.
- **Scripted mode:** every event comes from the player as written.
- **Live mode:** when the player reaches an event whose `key` has a healthy adapter, the registry calls `produce()` with an 8-second timeout. On success it emits the returned events with `source: "live"`. On an error, a timeout or an empty result, it emits the scripted event instead and logs why. The demo never stalls on a network call.
- A panel shows the `Simulated` badge while `sources[key]` for any key it renders is `"scripted"`.
- Live adapters call only `/api/...` on localhost. Keys stay on the server.

## Validation

- `src/core/validate.ts` checks an event's type and payload against this file, without a new dependency.
- `npm run check` validates every scripted timeline, and G2 fails on any invalid event.
- An event type or field that isn't in this file is a contract change: it goes to the integrator under `needs:`.
