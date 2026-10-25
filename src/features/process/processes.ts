// The process map (T1): for each of the eleven processes, its label, the source keys it watches
// (ui-contract.md, The process bar and views), the event types in its log, the count on its block
// and when it needs attention. Then the status rule, as a pure function of the store and whether the
// player plays, so a seek() gives the same status every time. Also the shared readers the views use:
// an approval's record or inline copy, the index counts, and the bar's summary.
import { useSyncExternalStore } from "react";
import { PROCESS_IDS, SOURCE_KEYS, type EventType, type ProcessId, type ProcessStatus, type SourceKey } from "../../core/events";
import { player } from "../../core/player";
import type { CindiaState, LogEntry, Stamped } from "../../core/state";
import type { Payloads } from "../../core/events";
import type { Approval, ApprovalKind, Lang, Text } from "../../core/types";
import { getById, searchIndex } from "../../mock";
import { BLOCK_LABELS, TRAINED_WORD } from "./strings";

/** A block counts as working while its newest event is this close to the store's clock, and the player plays (B1-37). */
export const WORKING_MS = 2000;

export interface ProcessDef {
  id: ProcessId;
  label: Text;
  /** The source keys the process watches. checkout has none, so it is never live. */
  keys: SourceKey[];
  /** The event types in its log. */
  types: EventType[];
  /** The count on its block, or undefined for none. A Text is picked in the slot's language. */
  count: (s: CindiaState) => number | string | Text | undefined;
  /** When the block needs attention. */
  attention: (s: CindiaState) => boolean;
}

// ---- Approvals: the record from src/mock/, or the inline copy the store kept ----

export interface ApprovalInfo {
  kind: ApprovalKind;
  subjectIds: string[];
  amountCents?: number;
  overLimit: boolean;
  summary?: Text;
}

/** An approval's kind and subjects: getById() first, then the inline approval from approval.requested. */
export function approvalInfo(s: CindiaState, approvalId: string): ApprovalInfo | undefined {
  const rec = getById<Approval>(approvalId);
  if (rec && "kind" in rec && "subjectIds" in rec) {
    return { kind: rec.kind, subjectIds: rec.subjectIds, amountCents: rec.amountCents, overLimit: rec.overLimit };
  }
  const inline = s.approvals.items[approvalId]?.approval;
  if (inline) return { kind: inline.kind, subjectIds: inline.subjectIds, amountCents: inline.amountCents, overLimit: inline.overLimit, summary: inline.summary };
  return undefined;
}

/** An approval is pending until the owner decides. One the store hasn't heard of is pending too. */
function isPending(s: CindiaState, approvalId: string): boolean {
  const item = s.approvals.items[approvalId];
  return !item || item.status === "pending";
}

/** The approvals the store holds as requested and still pending. */
export function pendingApprovalIds(s: CindiaState): string[] {
  return s.approvals.approvalIds.filter((id) => {
    const item = s.approvals.items[id];
    return item !== undefined && item.requested && item.status === "pending";
  });
}

/** Listing IDs whose listing_publish approval the owner granted. */
export function grantedListingIds(s: CindiaState): Set<string> {
  const out = new Set<string>();
  for (const id of s.approvals.approvalIds) {
    if (s.approvals.items[id]?.status !== "granted") continue;
    const info = approvalInfo(s, id);
    if (info?.kind === "listing_publish") for (const sub of info.subjectIds) out.add(sub);
  }
  return out;
}

// ---- The search index (the data view and the data block's count) ----

export interface IndexCounts {
  /** cindia-pieces: the searchIndex entries plus every listing whose listing_publish is granted. */
  pieces: number;
  /** cindia-drafts: every listing with a listing.indexed and no grant yet. */
  drafts: number;
  /** The newest listing.indexed in the store, or null. */
  newest: Stamped<Payloads["listing.indexed"]> | null;
}

export function indexCounts(s: CindiaState): IndexCounts {
  const granted = grantedListingIds(s);
  const indexed = Object.values(s.listings.indexed);
  const drafts = indexed.filter((x) => !granted.has(x.listingId)).length;
  let newest: IndexCounts["newest"] = null;
  for (const x of indexed) if (!newest || x.at >= newest.at) newest = x;
  return { pieces: searchIndex.length + granted.size, drafts, newest };
}

/** True when B12's index status is live, so the index counts come from index.synced. */
export function indexLive(s: CindiaState): boolean {
  return s.sources["b12-search"] === "live" && s.sync.index !== null;
}

/** True when B13's database status is live, so the tables come from data.synced. */
export function databaseLive(s: CindiaState): boolean {
  return s.sources["b13-live"] === "live" && s.sync.data !== null;
}

/** Documents in the search index, the data block's count: 54 at the start, 55 once a listing is indexed. */
export function indexDocs(s: CindiaState): number {
  if (indexLive(s)) return s.sync.index!.indexed + s.sync.index!.drafts;
  const c = indexCounts(s);
  return c.pieces + c.drafts;
}

// ---- The eleven processes ----

const count = (o: Record<string, unknown>) => Object.keys(o).length;

export const PROCESSES: Record<ProcessId, ProcessDef> = {
  search: {
    id: "search",
    label: BLOCK_LABELS.search,
    keys: ["b12-search", "b11-embed"],
    types: ["search.queried", "search.answered", "search.mapped", "surprise.asked", "surprise.drawn"],
    count: (s) => count(s.search.answers) + count(s.surprise.draws),
    attention: () => false,
  },
  swarm: {
    id: "swarm",
    label: BLOCK_LABELS.swarm,
    keys: ["b14-swarm", "b13-live"],
    types: [
      "support.asked",
      "swarm.step",
      "support.answered",
      "support.escalated",
      "question.forwarded",
      "question.answered",
      "listing.requested",
      "listing.drafted",
      "listing.indexed",
      "storefront.requested",
      "storefront.drafted",
    ],
    count: (s) => count(s.swarm.steps),
    attention: (s) =>
      Object.values(s.support.threads).some((th) => th.messages.some((m) => m.kind === "escalated" && isPending(s, m.approvalId))),
  },
  checkout: {
    id: "checkout",
    label: BLOCK_LABELS.checkout,
    keys: [],
    types: ["piece.opened", "split.shown", "checkout.started", "card.tokenized", "order.placed", "project.funded", "receipt.updated"],
    count: (s) => s.buyer.orderIds.length,
    attention: () => false,
  },
  money: {
    id: "money",
    label: BLOCK_LABELS.money,
    keys: ["b04-bank"],
    types: ["money.moved", "account.synced", "payout.sent", "wip.milestone_paid"],
    count: (s) => s.money.moveIds.length,
    attention: () => false,
  },
  reconcile: {
    id: "reconcile",
    label: BLOCK_LABELS.reconcile,
    keys: ["b01-match", "b02-explain"],
    types: ["month.started", "record.arrived", "match.made", "flag.raised", "flag.explained", "ledger.posted"],
    count: (s) => s.month.matchIds.length,
    attention: (s) =>
      s.month.flagIds.length > 0 &&
      !Object.values(s.approvals.followUps).some((f) => f.sent && (approvalInfo(s, f.approvalId)?.kind ?? "follow_up") === "follow_up"),
  },
  approvals: {
    id: "approvals",
    label: BLOCK_LABELS.approvals,
    keys: ["b08-approvals"],
    types: ["approval.requested", "approval.granted", "approval.declined", "followup.drafted", "followup.sent"],
    count: (s) => pendingApprovalIds(s).length,
    attention: (s) => pendingApprovalIds(s).length > 0,
  },
  close: {
    id: "close",
    label: BLOCK_LABELS.close,
    keys: ["b06-workbook", "b10-derived"],
    types: ["month.closed", "workbook.ready", "statement.issued", "impact.updated"],
    count: (s) => count(s.close.statements),
    attention: () => false,
  },
  proof: {
    id: "proof",
    label: BLOCK_LABELS.proof,
    keys: ["b03-proof", "b11-embed"],
    types: ["proof.scored", "proof.search_scored"],
    count: (s) => (s.proof.score ? `${s.proof.score.caught}/${s.proof.score.total}` : undefined),
    attention: () => false,
  },
  watch: {
    id: "watch",
    label: BLOCK_LABELS.watch,
    keys: ["b15-watch"],
    types: ["watch.started", "watch.scanned", "counterfeit.flagged"],
    count: (s) => s.watch.hitIds.length,
    attention: (s) => {
      if (s.watch.hitIds.length === 0) return false;
      const hits = new Set(s.watch.hitIds);
      return pendingApprovalIds(s).some((id) => {
        const info = approvalInfo(s, id);
        return info?.kind === "report_listing" && info.subjectIds.some((sub) => hits.has(sub));
      });
    },
  },
  model: {
    id: "model",
    label: BLOCK_LABELS.model,
    keys: ["b11-embed"],
    types: ["model.trained", "proof.search_scored", "search.mapped"],
    count: (s) => (s.model.trained ? TRAINED_WORD : undefined),
    attention: () => false,
  },
  data: {
    id: "data",
    label: BLOCK_LABELS.data,
    keys: ["b13-live", "b12-search", "b11-embed"],
    types: [
      "listing.requested",
      "listing.drafted",
      "listing.indexed",
      "order.placed",
      "approval.requested",
      "approval.granted",
      "approval.declined",
      "swarm.step",
      "model.trained",
      "data.synced",
      "index.synced",
    ],
    count: (s) => indexDocs(s),
    attention: () => false,
  },
};

/** The process's log entries, in the store's order (newest last). */
export function logFor(s: CindiaState, id: ProcessId): LogEntry[] {
  const types = new Set<EventType>(PROCESSES[id].types);
  return s.log.entries.filter((e) => types.has(e.type));
}

/** True when every key the process watches is live. checkout has none, so never. */
export function allLive(s: CindiaState, keys: readonly SourceKey[]): boolean {
  return keys.length > 0 && keys.every((k) => s.sources[k] === "live");
}

/** In live mode, B13's process status row for this process says working (C-4). */
function databaseSaysWorking(s: CindiaState, id: ProcessId): boolean {
  if (s.mode !== "live" || !databaseLive(s)) return false;
  return s.sync.data!.processes.some((p) => p.processId === id && p.status === "working");
}

/**
 * The block's status, checked in this order: attention when its rule holds; working while the player
 * plays and its newest event is within WORKING_MS of the store's clock (or, in live mode, while B13
 * says so); done once it has an event; idle otherwise.
 */
export function processStatus(s: CindiaState, id: ProcessId, playing: boolean): ProcessStatus {
  const def = PROCESSES[id];
  if (def.attention(s)) return "attention";
  const entries = logFor(s, id);
  if (playing && entries.length > 0) {
    let newest = -Infinity;
    for (const e of entries) if (e.at > newest) newest = e.at;
    if (s.clock - newest <= WORKING_MS) return "working";
  }
  if (databaseSaysWorking(s, id)) return "working";
  return entries.length > 0 ? "done" : "idle";
}

/** The count a block shows, in the slot's language, or undefined while the block is idle or has none. */
export function blockCount(s: CindiaState, id: ProcessId, status: ProcessStatus, lang: Lang): string | number | undefined {
  if (status === "idle") return undefined;
  const c = PROCESSES[id].count(s);
  if (c === undefined) return undefined;
  return typeof c === "object" ? c[lang] : c;
}

export interface BlockView {
  id: ProcessId;
  status: ProcessStatus;
  count?: string | number;
  live: boolean;
}

export interface BarView {
  blocks: BlockView[];
  /** How many processes have all their keys live. */
  liveCount: number;
  /** True while any source key is scripted: the bar shows one Simulated badge. */
  anyScripted: boolean;
  /** Screens watching, from B13, in live mode while b13-live is live. Null otherwise. */
  screens: number | null;
}

/** Everything the bar draws, as plain data, so useCindia() keeps it while nothing changed. */
export function barView(s: CindiaState, playing: boolean, lang: Lang): BarView {
  const blocks = PROCESS_IDS.map((id) => {
    const status = processStatus(s, id, playing);
    const c = blockCount(s, id, status, lang);
    const b: BlockView = { id, status, live: allLive(s, PROCESSES[id].keys) };
    if (c !== undefined) b.count = c;
    return b;
  });
  return {
    blocks,
    liveCount: blocks.filter((b) => b.live).length,
    anyScripted: SOURCE_KEYS.some((k) => s.sources[k] === "scripted"),
    screens: screensWatching(s),
  };
}

/** Presence (C-4): B13's screen count, only in live mode while b13-live is live. */
export function screensWatching(s: CindiaState): number | null {
  return s.mode === "live" && databaseLive(s) ? s.sync.data!.screens : null;
}

/** Whether the player plays, re-read on every player change (play, pause, seek and each frame). */
export function usePlaying(): boolean {
  return useSyncExternalStore(player.subscribe, player.isPlaying, player.isPlaying);
}

/** Whether a string is a ProcessId. */
export function isProcessId(v: unknown): v is ProcessId {
  return typeof v === "string" && (PROCESS_IDS as readonly string[]).includes(v);
}
