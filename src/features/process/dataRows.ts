// The data view's rows (T7), as pure functions of the store and src/mock/:
// - the eight SpacetimeDB tables, each with its row count and its newest rows (at most three, newest
//   first). In scripted mode they are counted from the mock data and this screen's events; in live mode,
//   while b13-live is live, they come from the newest data.synced;
// - the search index: cindia-pieces holds the searchIndex entries plus every listing whose
//   listing_publish approval is granted, cindia-drafts every listing with a listing.indexed and no
//   grant yet. In live mode, while b12-search is live, the counts come from index.synced;
// - the model: modelId, then trained (with dims) or "Not trained yet".
import { PROCESS_IDS, type DataTable, type Payloads, type ProcessId, type ProcessStatus } from "../../core/events";
import type { CindiaState } from "../../core/state";
import type { Text } from "../../core/types";
import { allApprovals, getAgent, listings, modelId as mockModelId, orders, pieces, report } from "../../mock";
import { formatCents } from "../../ui";
import { databaseLive, grantedListingIds, indexCounts, indexLive } from "./processes";
import { APPROVAL_STATUS_WORDS, DATA, LISTING_STATE_LABELS, STATUS_LABELS, SWARM, t } from "./strings";

/** The eight tables, in the data view's order. */
export const DATA_TABLES: readonly DataTable[] = ["catalog", "listings", "orders", "approvals", "runs", "steps", "processes", "screens"];

/** At most this many newest rows per table. */
export const NEWEST = 3;

export interface DataRow {
  /** The record's ID, or "" for a row named only by its label (this screen). */
  id: string;
  label: Text;
}

export interface TableRow {
  table: DataTable;
  rows: number;
  newest: DataRow[];
}

export type ListingState = "requested" | "drafted" | "indexed" | "approved";

const same = (s: string): Text => ({ en: s, zh: s });
const union = (...lists: string[][]) => [...new Set(lists.flat())];

/** A listing's state from its events: approved once its listing_publish is granted, then indexed, drafted, requested. */
export function listingState(s: CindiaState, listingId: string, granted = grantedListingIds(s)): ListingState | null {
  if (granted.has(listingId)) return "approved";
  if (s.listings.indexed[listingId]) return "indexed";
  if (s.listings.drafts[listingId]) return "drafted";
  if (s.listings.requests[listingId]) return "requested";
  return null;
}

/** The player time of a listing's newest event in the store, or -1. */
function listingAt(s: CindiaState, listingId: string): number {
  return Math.max(s.listings.requests[listingId]?.at ?? -1, s.listings.drafts[listingId]?.at ?? -1, s.listings.indexed[listingId]?.at ?? -1);
}

/** The store's listing IDs (the scripted lst_01 and each lst_user_<n>). */
function storeListingIds(s: CindiaState): string[] {
  return union(Object.keys(s.listings.requests), Object.keys(s.listings.drafts), Object.keys(s.listings.indexed));
}

const PRIORITY: Record<ProcessStatus, number> = { working: 0, attention: 1, done: 2, idle: 3 };

/** The eight tables in scripted mode, from src/mock/ and the store. `statusOf` is the bar's status rule. */
export function scriptedTables(s: CindiaState, statusOf: (id: ProcessId) => ProcessStatus): TableRow[] {
  const granted = grantedListingIds(s);

  // catalog: the 54 pieces, the last three by ID.
  const catalogIds = pieces.map((p) => p.id).toSorted();
  const catalog: TableRow = {
    table: "catalog",
    rows: pieces.length,
    newest: catalogIds
      .slice(-NEWEST)
      .toReversed()
      // A short label: the piece's object word, as the design's chips keep each row to one ID and one word.
      .map((id) => ({ id, label: pieces.find((p) => p.id === id)!.facets.object })),
  };

  // listings: lst_01 plus each lst_user_<n> in the store; the newest in the log, with their states.
  const listingIds = union(
    listings.map((l) => l.id),
    storeListingIds(s),
  );
  const listingNewest = storeListingIds(s)
    .map((id) => ({ id, at: listingAt(s, id), state: listingState(s, id, granted) }))
    .filter((x) => x.state !== null)
    .toSorted((a, b) => b.at - a.at)
    .slice(0, NEWEST)
    .map((x) => ({ id: x.id, label: LISTING_STATE_LABELS[x.state!] }));

  // orders: the 30 orders plus each ord_user_<n>; the newest order.placed.
  const orderIds = union(
    orders.map((o) => o.id),
    s.buyer.orderIds,
  );
  const orderNewest = s.buyer.orderIds
    .toReversed()
    .slice(0, NEWEST)
    .map((id) => {
      const o = s.buyer.orders[id];
      return { id, label: same(o ? formatCents(o.grossCents) : id) };
    });

  // approvals: apr_01 to apr_05 plus each apr_user_<n>; the newest approval.requested, with its status.
  const approvalIds = union(
    allApprovals.map((a) => a.id),
    s.approvals.approvalIds,
  );
  const approvalNewest = s.approvals.approvalIds
    .filter((id) => s.approvals.items[id]?.requested)
    .toReversed()
    .slice(0, NEWEST)
    .map((id) => {
      return { id, label: APPROVAL_STATUS_WORDS[s.approvals.items[id].status] };
    });

  // runs and steps: the store's swarm key.
  const runNewest = s.swarm.runIds
    .map((id, i) => ({ id, i, run: s.swarm.runs[id] }))
    .toSorted((a, b) => b.run.firstAt - a.run.firstAt || b.i - a.i)
    .slice(0, NEWEST)
    .map(({ id, run }) => ({
      id,
      label: run.done ? SWARM.finished : SWARM.running,
    }));
  const order = new Map<string, number>();
  let n = 0;
  for (const runId of s.swarm.runIds) for (const stepId of s.swarm.runs[runId].stepIds) order.set(stepId, n++);
  const stepNewest = Object.values(s.swarm.steps)
    .toSorted((a, b) => b.at - a.at || (order.get(b.stepId) ?? 0) - (order.get(a.stepId) ?? 0))
    .slice(0, NEWEST)
    .map((st) => {
      const agent = getAgent(st.agentId);
      return { id: st.stepId, label: agent ? agent.name : same(st.agentId) };
    });

  // processes: one per process, each with the bar's status, the busiest first.
  const statuses = PROCESS_IDS.map((id, i) => ({ id, i, status: statusOf(id) }));
  const processNewest = statuses
    .toSorted((a, b) => PRIORITY[a.status] - PRIORITY[b.status] || a.i - b.i)
    .slice(0, NEWEST)
    .map((p) => ({ id: p.id, label: STATUS_LABELS[p.status] }));

  return [
    catalog,
    { table: "listings", rows: listingIds.length, newest: listingNewest },
    { table: "orders", rows: orderIds.length, newest: orderNewest },
    { table: "approvals", rows: approvalIds.length, newest: approvalNewest },
    { table: "runs", rows: s.swarm.runIds.length, newest: runNewest },
    { table: "steps", rows: Object.keys(s.swarm.steps).length, newest: stepNewest },
    { table: "processes", rows: PROCESS_IDS.length, newest: processNewest },
    { table: "screens", rows: 1, newest: [{ id: "", label: DATA.thisScreen }] },
  ];
}

/** The eight tables from B13's data.synced, in the view's order. A table it doesn't carry keeps its scripted row. */
export function liveTables(data: Payloads["data.synced"], scripted: TableRow[]): TableRow[] {
  return DATA_TABLES.map((table) => {
    const row = data.tables.find((x) => x.table === table);
    if (!row) return scripted.find((x) => x.table === table) ?? { table, rows: 0, newest: [] };
    return { table, rows: row.rows, newest: row.newest.slice(0, NEWEST).map((r) => ({ id: r.id, label: same(r.label) })) };
  });
}

/** The tables the view shows, and whether they're live. */
export function dataTables(s: CindiaState, statusOf: (id: ProcessId) => ProcessStatus): { live: boolean; tables: TableRow[] } {
  const scripted = scriptedTables(s, statusOf);
  if (!databaseLive(s)) return { live: false, tables: scripted };
  return { live: true, tables: liveTables(s.sync.data!, scripted) };
}

export interface IndexGroup {
  live: boolean;
  pieces: number;
  drafts: number;
  /** The newest listing.indexed: its piece, its model and the index it went into. */
  newest: { listingId: string; pieceId: string; modelId: string; index: string } | null;
  /** From index.synced in live mode. */
  elastic?: boolean;
  agentBuilder?: boolean;
}

export function indexGroup(s: CindiaState): IndexGroup {
  const c = indexCounts(s);
  const newest = c.newest ? { listingId: c.newest.listingId, pieceId: c.newest.pieceId, modelId: c.newest.modelId, index: c.newest.index } : null;
  if (indexLive(s)) {
    const x = s.sync.index!;
    return { live: true, pieces: x.indexed, drafts: x.drafts, newest, elastic: x.elastic, agentBuilder: x.agentBuilder };
  }
  return { live: false, pieces: c.pieces, drafts: c.drafts, newest };
}

export interface ModelGroup {
  live: boolean;
  modelId: string;
  trained: boolean;
  dims?: number;
}

/** modelId, then trained (with dims) from the store's model key or the report, or not trained yet. */
export function modelGroup(s: CindiaState): ModelGroup {
  const live = s.sources["b11-embed"] === "live";
  const trained = s.model.trained ?? report?.trained ?? null;
  if (!trained) return { live, modelId: mockModelId, trained: false };
  return { live, modelId: trained.modelId, trained: true, dims: trained.dims };
}

/** A data row as one line of text, for a title attribute. */
export function rowText(r: DataRow, lang: "en" | "zh"): string {
  return r.id ? `${r.id} · ${t(r.label, lang)}` : t(r.label, lang);
}
