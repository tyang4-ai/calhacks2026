/**
 * Cindia's SpacetimeDB module: the database `cindia` (docs/plans/B13-live.md, "The module").
 *
 * Ten private tables: the eight the data view shows (catalog, listings, orders, approvals, runs,
 * steps, processes, screens), plus `changes`, the log the feed polls, and `config`, which `init`
 * writes once with the publisher's identity and the publish time.
 *
 * - Every table is private, so only reducers and the owner can read it.
 * - Every reducer but `init` throws SenderError unless the caller is the owner `init` stored,
 *   so an anonymous caller can neither read nor write.
 * - Every table has `seq` (u64, auto-increment primary key, inserted as 0n). Record IDs are plain
 *   columns. Column names are snake case, and every text column is capped at 160 characters here.
 * - Every writing reducer appends one `changes` row per row it changes, except a presence refresh.
 *   A write that changes nothing logs nothing, so a repeat is free.
 * - It stores IDs, kinds, statuses, amounts and the catalog's own titles, never a person's words.
 *
 * Only the default export (the schema) and the reducers are exported. Helpers stay local.
 */
import { schema, table, t, SenderError, type ReducerCtx } from 'spacetimedb/server';

// ---------------------------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------------------------

/** The 54 pieces, seeded from mock.json, plus each approved listing's piece. */
const catalog = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    piece_id: t.string().unique(),
    community_id: t.string(),
    maker_id: t.string(),
    title_en: t.string(),
    title_zh: t.string(),
    community_en: t.string(),
    maker_name: t.string(),
    price_cents: t.i64(),
    status: t.string(),
  },
);

/** Listings and where each one is: requested, drafted, indexed, approved or declined. */
const listings = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    listing_id: t.string().unique(),
    maker_id: t.string(),
    piece_id: t.string(),
    state: t.string(),
    updated_at: t.u64(),
  },
);

/** The scripted orders and every mirrored `order.placed`. */
const orders = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    order_id: t.string().unique(),
    piece_id: t.string(),
    channel_id: t.string(),
    gross_cents: t.i64(),
    date: t.string(),
    origin: t.string(),
  },
);

/** The scripted approvals and every mirrored request and decision. */
const approvals = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    approval_id: t.string().unique(),
    kind: t.string(),
    subject_ids: t.string(),
    amount_cents: t.i64(),
    status: t.string(),
    updated_at: t.u64(),
  },
);

/** One row per swarm run. */
const runs = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    run_id: t.string().unique(),
    thread_id: t.string(),
    side: t.string(),
    started_at: t.u64(),
    finished: t.bool(),
  },
);

/** One row per swarm step. `step_id` is a plain column, so rows are keyed by `seq` (B2-2). */
const steps = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    step_id: t.string(),
    run_id: t.string().index('btree'),
    thread_id: t.string(),
    agent_id: t.string(),
    kind: t.string(),
    summary_en: t.string(),
    summary_zh: t.string(),
    tool_name: t.string(),
    ms: t.u32(),
    model: t.string(),
  },
);

/** Each process's status on the process bar (C-4). */
const processes = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    process_id: t.string().unique(),
    status: t.string(),
    count: t.u32(),
    updated_at: t.u64(),
  },
);

/** The screens watching, refreshed by the router's polls. */
const screens = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    screen_id: t.string().unique(),
    role: t.string(),
    last_seen: t.u64(),
  },
);

/** One row per row a reducer changed. The feed polls only this table. */
const changes = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    table: t.string(),
    row_id: t.string(),
    op: t.string(),
    at: t.u64(),
  },
);

/** Written once by `init`: the owner's identity and the publish time in seconds. */
const config = table(
  { public: false },
  {
    seq: t.u64().primaryKey().autoInc(),
    key: t.string().unique(),
    owner: t.identity(),
    epoch: t.u64(),
  },
);

const spacetimedb = schema({
  catalog,
  listings,
  orders,
  approvals,
  runs,
  steps,
  processes,
  screens,
  changes,
  config,
});
export default spacetimedb;

type Ctx = ReducerCtx<typeof spacetimedb.schemaType>;

// ---------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------

const OWNER_KEY = 'owner';
const TEXT_MAX = 160;
const RECORD_EVENTS_MAX = 50;
const RECORD_JSON_MAX = 256 * 1024;
const SEED_JSON_MAX = 512 * 1024;
const SEED_ROWS_MAX = 500;
const SUBJECTS_MAX = 8;
const CENTS_MAX = 1_000_000_000_000;

const SIDES = ['buyer', 'seller'] as const;
const ROLES = ['buyer', 'seller', 'tour'] as const;
const STEP_KINDS = ['route', 'call', 'tool', 'result', 'check', 'handoff', 'reply'] as const;
const PROCESS_STATUSES = ['working', 'done'] as const;
const APPROVAL_STATUSES = ['pending', 'granted', 'declined'] as const;
const APPROVAL_KINDS = [
  'follow_up',
  'maker_payouts',
  'listing_publish',
  'storefront_publish',
  'report_listing',
  'milestone_release',
  'support_action',
] as const;
const CATALOG_STATUSES = ['active'] as const;
const ORIGINS = ['mock', 'person'] as const;
/** No Opus and no Fable anywhere in the platform. An empty model means a code step. */
const MODELS = ['', 'claude-haiku-5-5', 'claude-sonnet-5-5'] as const;
const THREAD_PREFIXES = ['thr', 'lst', 'sto'] as const;

/** A listing only moves forward, except that a new request starts it over. */
const LISTING_RANK: Record<string, number> = {
  requested: 1,
  drafted: 2,
  indexed: 3,
  approved: 4,
  declined: 4,
};

/** `<prefix>_<part>[_<part>...]`: pc_01, ord_user_3, stp_user_k3x9qa_1, ch_cindia. */
const RECORD_ID = /^[a-z]{2,4}_[a-z0-9]{1,24}(?:_[a-z0-9]{1,24}){0,4}$/;
const RECORD_ID_MAX = 64;
const EVENT_ID = /^evt_[a-z0-9_]{1,60}$/;
const SCREEN_ID = /^scr_[A-Za-z0-9]{6,12}$/;
const AGENT_ID = /^[a-z][a-z0-9_]{0,31}$/;
const PROCESS_ID = /^[a-z][a-z0-9_-]{0,31}$/;
const TOOL_NAME = /^[a-z0-9_.-]{0,64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL = /\p{Cc}/gu;

type Watched = 'catalog' | 'listings' | 'orders' | 'approvals' | 'runs' | 'steps' | 'processes' | 'screens';
type Op = 'insert' | 'update' | 'delete';
type Obj = Record<string, unknown>;

function fail(message: string): never {
  throw new SenderError(message);
}

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Text as stored: control characters become spaces, then it is cut to 160 characters. */
function clip(value: string): string {
  const chars = Array.from(value.replace(CONTROL, ' '));
  return chars.length > TEXT_MAX ? chars.slice(0, TEXT_MAX).join('') : chars.join('');
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string') fail(`${field}: expected text`);
  return clip(value);
}

function recordId(value: unknown, field: string, prefixes: readonly string[]): string {
  if (
    typeof value !== 'string' ||
    value.length > RECORD_ID_MAX ||
    !RECORD_ID.test(value) ||
    !prefixes.some((prefix) => value.startsWith(`${prefix}_`))
  ) {
    fail(`${field}: expected a ${prefixes.join(' or ')} ID`);
  }
  return value;
}

function anyRecordId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length > RECORD_ID_MAX || !RECORD_ID.test(value)) {
    fail(`${field}: expected a record ID`);
  }
  return value;
}

function matching(value: unknown, field: string, pattern: RegExp): string {
  if (typeof value !== 'string' || !pattern.test(value)) fail(`${field}: not in the expected form`);
  return value;
}

function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    fail(`${field}: expected one of ${allowed.map((a) => (a === '' ? '(empty)' : a)).join(', ')}`);
  }
  return value as T;
}

function cents(value: unknown, field: string): bigint {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > CENTS_MAX) {
    fail(`${field}: expected whole cents`);
  }
  return BigInt(value);
}

function date(value: unknown, field: string): string {
  if (typeof value !== 'string' || !DATE.test(value)) fail(`${field}: expected YYYY-MM-DD`);
  return value;
}

function parseJson(raw: string, max: number, field: string): unknown {
  if (raw.length > max) fail(`${field}: longer than ${max} characters`);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    fail(`${field}: not valid JSON`);
  }
}

function list(value: unknown, field: string, max: number): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`${field}: expected a list`);
  if (value.length > max) fail(`${field}: more than ${max} entries`);
  return value;
}

function subjectIds(value: unknown, field: string): string {
  const ids = list(value, field, SUBJECTS_MAX).map((id, i) => anyRecordId(id, `${field}[${i}]`));
  return clip(ids.join(','));
}

function differs<T>(a: T, b: T, keys: readonly (keyof T)[]): boolean {
  return keys.some((key) => a[key] !== b[key]);
}

function nowMs(ctx: Ctx): bigint {
  return ctx.timestamp.microsSinceUnixEpoch / 1000n;
}

function requireOwner(ctx: Ctx): void {
  const row = ctx.db.config.key.find(OWNER_KEY);
  if (!row || !row.owner.isEqual(ctx.sender)) fail('not_owner: only the publisher may call this reducer');
}

function logChange(ctx: Ctx, tableName: Watched, rowId: string, op: Op): void {
  ctx.db.changes.insert({ seq: 0n, table: tableName, row_id: rowId, op, at: nowMs(ctx) });
}

// ---------------------------------------------------------------------------------------------
// Writes, each logging what it changed
// ---------------------------------------------------------------------------------------------

interface PieceIn {
  piece_id: string;
  community_id: string;
  maker_id: string;
  title_en: string;
  title_zh: string;
  community_en: string;
  maker_name: string;
  price_cents: bigint;
  status: string;
}

const PIECE_FIELDS = [
  'community_id',
  'maker_id',
  'title_en',
  'title_zh',
  'community_en',
  'maker_name',
  'price_cents',
  'status',
] as const;

function upsertPiece(ctx: Ctx, piece: PieceIn): void {
  const old = ctx.db.catalog.piece_id.find(piece.piece_id);
  if (!old) {
    ctx.db.catalog.insert({ seq: 0n, ...piece });
    logChange(ctx, 'catalog', piece.piece_id, 'insert');
    return;
  }
  const next = { ...old, ...piece, seq: old.seq };
  if (!differs(old, next, PIECE_FIELDS)) return;
  ctx.db.catalog.seq.update(next);
  logChange(ctx, 'catalog', piece.piece_id, 'update');
}

interface OrderIn {
  order_id: string;
  piece_id: string;
  channel_id: string;
  gross_cents: bigint;
  date: string;
  origin: string;
}

const ORDER_FIELDS = ['piece_id', 'channel_id', 'gross_cents', 'date', 'origin'] as const;

function upsertOrder(ctx: Ctx, order: OrderIn): void {
  const old = ctx.db.orders.order_id.find(order.order_id);
  if (!old) {
    ctx.db.orders.insert({ seq: 0n, ...order });
    logChange(ctx, 'orders', order.order_id, 'insert');
    return;
  }
  const next = { ...old, ...order, seq: old.seq };
  if (!differs(old, next, ORDER_FIELDS)) return;
  ctx.db.orders.seq.update(next);
  logChange(ctx, 'orders', order.order_id, 'update');
}

interface ApprovalDetails {
  kind: string;
  subject_ids: string;
  amount_cents: bigint;
}

const APPROVAL_FIELDS = ['kind', 'subject_ids', 'amount_cents', 'status'] as const;

/**
 * Puts an approval in the table. `status` null keeps the status of a row that exists (the seed
 * never undoes a decision); a request passes 'pending', since a new request starts it over.
 */
function upsertApproval(ctx: Ctx, approvalId: string, details: ApprovalDetails | null, status: string | null): void {
  const old = ctx.db.approvals.approval_id.find(approvalId);
  if (!old) {
    ctx.db.approvals.insert({
      seq: 0n,
      approval_id: approvalId,
      kind: details?.kind ?? '',
      subject_ids: details?.subject_ids ?? '',
      amount_cents: details?.amount_cents ?? 0n,
      status: status ?? 'pending',
      updated_at: nowMs(ctx),
    });
    logChange(ctx, 'approvals', approvalId, 'insert');
    return;
  }
  const next = { ...old, ...details, status: status ?? old.status };
  if (!differs(old, next, APPROVAL_FIELDS)) return;
  ctx.db.approvals.seq.update({ ...next, updated_at: nowMs(ctx) });
  logChange(ctx, 'approvals', approvalId, 'update');
}

/** The first decision wins, as in the store. A grant or decline of a listing_publish moves its listing. */
function decideApproval(ctx: Ctx, approvalId: string, decision: 'granted' | 'declined'): void {
  const old = ctx.db.approvals.approval_id.find(approvalId);
  if (old && old.status !== 'pending') return;
  upsertApproval(ctx, approvalId, null, decision);
  if (!old || old.kind !== 'listing_publish') return;
  for (const subjectId of old.subject_ids.split(',')) {
    if (subjectId.startsWith('lst_')) advanceListing(ctx, subjectId, decision === 'granted' ? 'approved' : 'declined');
  }
}

const LISTING_FIELDS = ['maker_id', 'piece_id', 'state'] as const;

function putListing(ctx: Ctx, listingId: string, change: (old: { maker_id: string; piece_id: string; state: string }) => {
  maker_id: string;
  piece_id: string;
  state: string;
}): void {
  const old = ctx.db.listings.listing_id.find(listingId);
  if (!old) {
    const fresh = change({ maker_id: '', piece_id: '', state: '' });
    ctx.db.listings.insert({ seq: 0n, listing_id: listingId, ...fresh, updated_at: nowMs(ctx) });
    logChange(ctx, 'listings', listingId, 'insert');
    return;
  }
  const next = { ...old, ...change(old) };
  if (!differs(old, next, LISTING_FIELDS)) return;
  ctx.db.listings.seq.update({ ...next, updated_at: nowMs(ctx) });
  logChange(ctx, 'listings', listingId, 'update');
}

/** A new request starts the listing over: no piece yet, state `requested`. */
function requestListing(ctx: Ctx, listingId: string, makerId: string): void {
  putListing(ctx, listingId, () => ({ maker_id: makerId, piece_id: '', state: 'requested' }));
}

/** Moves a listing forward only. Approved and declined are final. */
function advanceListing(ctx: Ctx, listingId: string, state: string, makerId = '', pieceId = ''): void {
  putListing(ctx, listingId, (old) => ({
    maker_id: makerId || old.maker_id,
    piece_id: pieceId || old.piece_id,
    state: (LISTING_RANK[state] ?? 0) > (LISTING_RANK[old.state] ?? 0) ? state : old.state,
  }));
}

/** B12's publish: the listing's piece joins the catalog, with its maker's community from the catalog. */
function publishPiece(ctx: Ctx, listingId: string, pieceId: string): void {
  if (ctx.db.catalog.piece_id.find(pieceId)) return;
  const makerId = ctx.db.listings.listing_id.find(listingId)?.maker_id ?? '';
  let sibling: { community_id: string; community_en: string; maker_name: string } | null = null;
  if (makerId) {
    for (const row of ctx.db.catalog.iter()) {
      if (row.maker_id === makerId) {
        sibling = row;
        break;
      }
    }
  }
  upsertPiece(ctx, {
    piece_id: pieceId,
    community_id: sibling?.community_id ?? '',
    maker_id: makerId,
    title_en: '',
    title_zh: '',
    community_en: sibling?.community_en ?? '',
    maker_name: sibling?.maker_name ?? '',
    price_cents: 0n,
    status: 'active',
  });
}

// ---------------------------------------------------------------------------------------------
// Payloads: seed_catalog and record
// ---------------------------------------------------------------------------------------------

function originOf(orderId: string): 'mock' | 'person' {
  return orderId.startsWith('ord_user_') ? 'person' : 'mock';
}

function parsePiece(value: unknown, at: string): PieceIn {
  if (!isObj(value)) fail(`${at}: expected an object`);
  return {
    piece_id: recordId(value.piece_id, `${at}.piece_id`, ['pc']),
    community_id: recordId(value.community_id, `${at}.community_id`, ['com']),
    maker_id: recordId(value.maker_id, `${at}.maker_id`, ['mkr']),
    title_en: text(value.title_en, `${at}.title_en`),
    title_zh: text(value.title_zh, `${at}.title_zh`),
    community_en: text(value.community_en, `${at}.community_en`),
    maker_name: text(value.maker_name, `${at}.maker_name`),
    price_cents: cents(value.price_cents, `${at}.price_cents`),
    status: value.status === undefined ? 'active' : oneOf(value.status, `${at}.status`, CATALOG_STATUSES),
  };
}

function parseSeedOrder(value: unknown, at: string): OrderIn {
  if (!isObj(value)) fail(`${at}: expected an object`);
  const orderId = recordId(value.order_id, `${at}.order_id`, ['ord']);
  return {
    order_id: orderId,
    piece_id: recordId(value.piece_id, `${at}.piece_id`, ['pc']),
    channel_id: recordId(value.channel_id, `${at}.channel_id`, ['ch']),
    gross_cents: cents(value.gross_cents, `${at}.gross_cents`),
    date: date(value.date, `${at}.date`),
    origin: value.origin === undefined ? originOf(orderId) : oneOf(value.origin, `${at}.origin`, ORIGINS),
  };
}

interface SeedApproval {
  approval_id: string;
  details: ApprovalDetails;
  status: string;
}

function parseSeedApproval(value: unknown, at: string): SeedApproval {
  if (!isObj(value)) fail(`${at}: expected an object`);
  return {
    approval_id: recordId(value.approval_id, `${at}.approval_id`, ['apr']),
    details: {
      kind: oneOf(value.kind, `${at}.kind`, APPROVAL_KINDS),
      subject_ids: subjectIds(value.subject_ids, `${at}.subject_ids`),
      amount_cents: value.amount_cents === undefined ? 0n : cents(value.amount_cents, `${at}.amount_cents`),
    },
    status: oneOf(value.status ?? 'pending', `${at}.status`, APPROVAL_STATUSES),
  };
}

/** The mirrored event types, each reduced to the IDs and amounts the tables keep. */
type Mirrored =
  | { type: 'order.placed'; order: OrderIn }
  | { type: 'approval.requested'; approvalId: string; details: ApprovalDetails | null }
  | { type: 'approval.granted' | 'approval.declined'; approvalId: string }
  | { type: 'listing.requested' | 'listing.drafted'; listingId: string; makerId: string }
  | { type: 'listing.indexed'; listingId: string; pieceId: string; publish: boolean };

/** Null for a type the database doesn't mirror. Throws SenderError for a malformed mirrored event. */
function parseEvent(value: unknown, at: string): Mirrored | null {
  if (!isObj(value)) fail(`${at}: expected an event object`);
  matching(value.id, `${at}.id`, EVENT_ID);
  const payload = value.payload;
  if (!isObj(payload)) fail(`${at}.payload: expected an object`);
  const p = `${at}.payload`;
  const type = value.type;
  switch (type) {
    case 'order.placed': {
      const orderId = recordId(payload.orderId, `${p}.orderId`, ['ord']);
      return {
        type: 'order.placed',
        order: {
          order_id: orderId,
          piece_id: recordId(payload.pieceId, `${p}.pieceId`, ['pc']),
          channel_id: recordId(payload.channelId, `${p}.channelId`, ['ch']),
          gross_cents: cents(payload.grossCents, `${p}.grossCents`),
          date: date(payload.date, `${p}.date`),
          origin: originOf(orderId),
        },
      };
    }
    case 'approval.requested': {
      const approvalId = recordId(payload.approvalId, `${p}.approvalId`, ['apr']);
      const inline = payload.approval;
      if (inline === undefined) return { type: 'approval.requested', approvalId, details: null };
      if (!isObj(inline)) fail(`${p}.approval: expected an object`);
      return {
        type: 'approval.requested',
        approvalId,
        details: {
          kind: oneOf(inline.kind, `${p}.approval.kind`, APPROVAL_KINDS),
          subject_ids: subjectIds(inline.subjectIds, `${p}.approval.subjectIds`),
          amount_cents:
            inline.amountCents === undefined ? 0n : cents(inline.amountCents, `${p}.approval.amountCents`),
        },
      };
    }
    case 'approval.granted':
    case 'approval.declined':
      return { type, approvalId: recordId(payload.approvalId, `${p}.approvalId`, ['apr']) };
    case 'listing.requested':
    case 'listing.drafted':
      return {
        type,
        listingId: recordId(payload.listingId, `${p}.listingId`, ['lst']),
        makerId: recordId(payload.makerId, `${p}.makerId`, ['mkr']),
      };
    case 'listing.indexed':
      return {
        type: 'listing.indexed',
        listingId: recordId(payload.listingId, `${p}.listingId`, ['lst']),
        pieceId: recordId(payload.pieceId, `${p}.pieceId`, ['pc']),
        publish: value.key === 'b12-search',
      };
    default:
      return null;
  }
}

function applyEvent(ctx: Ctx, event: Mirrored): void {
  switch (event.type) {
    case 'order.placed':
      upsertOrder(ctx, event.order);
      return;
    case 'approval.requested':
      upsertApproval(ctx, event.approvalId, event.details, 'pending');
      return;
    case 'approval.granted':
      decideApproval(ctx, event.approvalId, 'granted');
      return;
    case 'approval.declined':
      decideApproval(ctx, event.approvalId, 'declined');
      return;
    case 'listing.requested':
      requestListing(ctx, event.listingId, event.makerId);
      return;
    case 'listing.drafted':
      advanceListing(ctx, event.listingId, 'drafted', event.makerId);
      return;
    case 'listing.indexed':
      advanceListing(ctx, event.listingId, 'indexed', '', event.pieceId);
      if (event.publish) publishPiece(ctx, event.listingId, event.pieceId);
      return;
  }
}

// ---------------------------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------------------------

/** Lifecycle: on the first publish (and on a publish that deletes the data), the publisher is the owner. */
export const init = spacetimedb.init((ctx) => {
  if (ctx.db.config.key.find(OWNER_KEY)) return;
  ctx.db.config.insert({
    seq: 0n,
    key: OWNER_KEY,
    owner: ctx.sender,
    epoch: ctx.timestamp.microsSinceUnixEpoch / 1_000_000n,
  });
});

/**
 * Upserts the catalog, the scripted orders and the scripted approvals from one JSON payload:
 * `{ catalog: [...], orders: [...], approvals: [...] }` (README). Idempotent. The whole payload is
 * checked before anything is written, so a bad entry changes nothing.
 */
export const seed_catalog = spacetimedb.reducer({ payload_json: t.string() }, (ctx, { payload_json }) => {
  requireOwner(ctx);
  const payload = parseJson(payload_json, SEED_JSON_MAX, 'payload_json');
  if (!isObj(payload)) fail('payload_json: expected an object');
  const pieces = list(payload.catalog, 'catalog', SEED_ROWS_MAX).map((v, i) => parsePiece(v, `catalog[${i}]`));
  const seedOrders = list(payload.orders, 'orders', SEED_ROWS_MAX).map((v, i) => parseSeedOrder(v, `orders[${i}]`));
  const seedApprovals = list(payload.approvals, 'approvals', SEED_ROWS_MAX).map((v, i) =>
    parseSeedApproval(v, `approvals[${i}]`),
  );
  for (const piece of pieces) upsertPiece(ctx, piece);
  for (const order of seedOrders) upsertOrder(ctx, order);
  for (const a of seedApprovals) {
    const exists = ctx.db.approvals.approval_id.find(a.approval_id) !== null;
    upsertApproval(ctx, a.approval_id, a.details, exists ? null : a.status);
  }
});

/**
 * Applies up to 50 Cindia events, idempotent by record ID. Only order.placed, approval.requested,
 * approval.granted, approval.declined, listing.requested, listing.drafted and listing.indexed change
 * anything. Every other type is ignored, and so is a mirrored event that is malformed.
 */
export const record = spacetimedb.reducer({ events_json: t.string() }, (ctx, { events_json }) => {
  requireOwner(ctx);
  const events = list(parseJson(events_json, RECORD_JSON_MAX, 'events_json'), 'events_json', RECORD_EVENTS_MAX);
  events.forEach((raw, i) => {
    let event: Mirrored | null;
    try {
      event = parseEvent(raw, `events[${i}]`);
    } catch (err) {
      if (err instanceof SenderError) return;
      throw err;
    }
    if (event) applyEvent(ctx, event);
  });
});

/** Inserts the run, or, for a run ID it already holds, deletes that run's old steps and starts it over (D1-20). */
export const start_run = spacetimedb.reducer(
  { run_id: t.string(), thread_id: t.string(), side: t.string() },
  (ctx, args) => {
    requireOwner(ctx);
    const runId = recordId(args.run_id, 'run_id', ['run']);
    const threadId = recordId(args.thread_id, 'thread_id', THREAD_PREFIXES);
    const side = oneOf(args.side, 'side', SIDES);
    const old = ctx.db.runs.run_id.find(runId);
    if (!old) {
      ctx.db.runs.insert({ seq: 0n, run_id: runId, thread_id: threadId, side, started_at: nowMs(ctx), finished: false });
      logChange(ctx, 'runs', runId, 'insert');
      return;
    }
    // Copied first, since the loop deletes from the table it reads.
    for (const step of Array.from(ctx.db.steps.run_id.filter(runId))) {
      ctx.db.steps.seq.delete(step.seq);
      logChange(ctx, 'steps', step.step_id, 'delete');
    }
    ctx.db.runs.seq.update({ ...old, thread_id: threadId, side, started_at: nowMs(ctx), finished: false });
    logChange(ctx, 'runs', runId, 'update');
  },
);

/** Inserts a step, skipping a repeat of the same run_id and step_id. */
export const add_step = spacetimedb.reducer(
  {
    run_id: t.string(),
    step_id: t.string(),
    thread_id: t.string(),
    agent_id: t.string(),
    kind: t.string(),
    summary_en: t.string(),
    summary_zh: t.string(),
    tool_name: t.string(),
    ms: t.u32(),
    model: t.string(),
  },
  (ctx, args) => {
    requireOwner(ctx);
    const runId = recordId(args.run_id, 'run_id', ['run']);
    const stepId = recordId(args.step_id, 'step_id', ['stp']);
    const threadId = recordId(args.thread_id, 'thread_id', THREAD_PREFIXES);
    const agentId = matching(args.agent_id, 'agent_id', AGENT_ID);
    const kind = oneOf(args.kind, 'kind', STEP_KINDS);
    const toolName = matching(args.tool_name, 'tool_name', TOOL_NAME);
    const model = oneOf(args.model, 'model', MODELS);
    for (const step of ctx.db.steps.run_id.filter(runId)) {
      if (step.step_id === stepId) return;
    }
    ctx.db.steps.insert({
      seq: 0n,
      step_id: stepId,
      run_id: runId,
      thread_id: threadId,
      agent_id: agentId,
      kind,
      summary_en: clip(args.summary_en),
      summary_zh: clip(args.summary_zh),
      tool_name: toolName,
      ms: args.ms,
      model,
    });
    logChange(ctx, 'steps', stepId, 'insert');
  },
);

/** Marks a run finished. A run it doesn't hold, or one already finished, changes nothing. */
export const finish_run = spacetimedb.reducer({ run_id: t.string() }, (ctx, args) => {
  requireOwner(ctx);
  const runId = recordId(args.run_id, 'run_id', ['run']);
  const old = ctx.db.runs.run_id.find(runId);
  if (!old || old.finished) return;
  ctx.db.runs.seq.update({ ...old, finished: true });
  logChange(ctx, 'runs', runId, 'update');
});

/** Upserts one process row (C-4). */
export const set_process = spacetimedb.reducer(
  { process_id: t.string(), status: t.string(), count: t.u32() },
  (ctx, args) => {
    requireOwner(ctx);
    const processId = matching(args.process_id, 'process_id', PROCESS_ID);
    const status = oneOf(args.status, 'status', PROCESS_STATUSES);
    const old = ctx.db.processes.process_id.find(processId);
    if (!old) {
      ctx.db.processes.insert({ seq: 0n, process_id: processId, status, count: args.count, updated_at: nowMs(ctx) });
      logChange(ctx, 'processes', processId, 'insert');
      return;
    }
    if (old.status === status && old.count === args.count) return;
    ctx.db.processes.seq.update({ ...old, status, count: args.count, updated_at: nowMs(ctx) });
    logChange(ctx, 'processes', processId, 'update');
  },
);

/** Inserts a screen (logged), or refreshes its last_seen (not logged). A new role is logged. */
export const touch_screen = spacetimedb.reducer({ screen_id: t.string(), role: t.string() }, (ctx, args) => {
  requireOwner(ctx);
  const screenId = matching(args.screen_id, 'screen_id', SCREEN_ID);
  const role = oneOf(args.role, 'role', ROLES);
  const old = ctx.db.screens.screen_id.find(screenId);
  if (!old) {
    ctx.db.screens.insert({ seq: 0n, screen_id: screenId, role, last_seen: nowMs(ctx) });
    logChange(ctx, 'screens', screenId, 'insert');
    return;
  }
  ctx.db.screens.seq.update({ ...old, role, last_seen: nowMs(ctx) });
  if (old.role !== role) logChange(ctx, 'screens', screenId, 'update');
});

/** Deletes the screens not seen in the last `older_than_ms` (logged). */
export const expire_screens = spacetimedb.reducer({ older_than_ms: t.u64() }, (ctx, { older_than_ms }) => {
  requireOwner(ctx);
  if (older_than_ms < 1000n || older_than_ms > 86_400_000n) fail('older_than_ms: expected 1000 to 86400000');
  const cutoff = nowMs(ctx) - older_than_ms;
  // Copied first, since the loop deletes from the table it reads.
  for (const screen of Array.from(ctx.db.screens.iter())) {
    if (screen.last_seen < cutoff) {
      ctx.db.screens.seq.delete(screen.seq);
      logChange(ctx, 'screens', screen.screen_id, 'delete');
    }
  }
});

/** Deletes every run and step (logged), a demo-prep step (B2-2). */
export const clear_runs = spacetimedb.reducer((ctx) => {
  requireOwner(ctx);
  // Copied first, since each loop deletes from the table it reads.
  for (const step of Array.from(ctx.db.steps.iter())) {
    ctx.db.steps.seq.delete(step.seq);
    logChange(ctx, 'steps', step.step_id, 'delete');
  }
  for (const run of Array.from(ctx.db.runs.iter())) {
    ctx.db.runs.seq.delete(run.seq);
    logChange(ctx, 'runs', run.run_id, 'delete');
  }
});
