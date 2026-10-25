// Which approval the view selects, and which hits came from a live scan, both read from the store's
// log by each event's place in it (M-approvals, Interfaces). Log entries carry an event's id, type
// and source but not its payload, so this module keeps an index from event id to the approval or
// hit it names: the loaded timeline's own events, plus every event emitted while the view is open
// (a person's taps, live answers, seeded events). Nothing here runs at import time.
import { useEffect, useState } from "react";
import type { CindiaEvent, EventType, Source } from "../../core/events";
import { player } from "../../core/player";
import type { CindiaState } from "../../core/state";
import { onEvent } from "../../core/store";

const APPROVAL_TYPES: ReadonlySet<EventType> = new Set<EventType>(["approval.requested", "approval.granted", "approval.declined"]);
const HIT_TYPE: EventType = "counterfeit.flagged";

/** What one indexed event names. */
export interface Indexed {
  approvalId?: string;
  cftId?: string;
}

/** A log entry the selection reads. */
export interface LogRef {
  id: string;
  type: EventType;
  source: Source;
  at: number;
}

/** A requested approval's decision, as the store holds it. */
export interface Decision {
  status: string;
  /** Player time of the first decision. */
  decidedAt?: number;
}

function indexEvent(e: Pick<CindiaEvent, "type" | "payload">): Indexed | null {
  if (APPROVAL_TYPES.has(e.type)) {
    const id = (e.payload as { approvalId?: unknown }).approvalId;
    return typeof id === "string" ? { approvalId: id } : null;
  }
  if (e.type === HIT_TYPE) {
    const id = (e.payload as { cftId?: unknown }).cftId;
    return typeof id === "string" ? { cftId: id } : null;
  }
  return null;
}

type Timeline = NonNullable<ReturnType<typeof player.getTimeline>>;
const timelineIndexes = new WeakMap<Timeline, Record<string, Indexed>>();

/** The loaded timeline's approval and hit events, by event id, built once per timeline. */
function timelineIndex(): Record<string, Indexed> {
  const tl = player.getTimeline();
  if (!tl) return {};
  let index = timelineIndexes.get(tl);
  if (!index) {
    index = {};
    for (const e of tl.events) {
      const x = indexEvent(e);
      if (x) index[e.id] = x;
    }
    timelineIndexes.set(tl, index);
  }
  return index;
}

/** The log entries the selection reads: approval decisions and requests, and hits. */
export function selectLogRefs(s: CindiaState): LogRef[] {
  const out: LogRef[] = [];
  for (const e of s.log.entries) {
    if (APPROVAL_TYPES.has(e.type) || e.type === HIT_TYPE) out.push({ id: e.id, type: e.type, source: e.source, at: e.at });
  }
  return out;
}

/**
 * Event id to what it names, for every event emitted while the view is open. The newest emission of
 * an id wins, since a person's event ids start over after a reset.
 */
export function useEventIndex(): Record<string, Indexed> {
  const [seen, setSeen] = useState<Record<string, Indexed>>({});
  useEffect(
    () =>
      onEvent((e) => {
        const x = indexEvent(e);
        if (!x) return;
        setSeen((prev) => {
          const old = prev[e.id];
          if (old && old.approvalId === x.approvalId && old.cftId === x.cftId) return prev;
          return { ...prev, [e.id]: x };
        });
      }),
    [],
  );
  return seen;
}

function resolve(seen: Record<string, Indexed>, id: string): Indexed | undefined {
  return seen[id] ?? timelineIndex()[id];
}

const DECISION_STATUS: Partial<Record<EventType, string>> = { "approval.granted": "granted", "approval.declined": "declined" };

/**
 * The approval named by the newest request, grant or decline in the log (of `types`, all three by
 * default). It never skips the newest entry for an older one. When the index can't name it (an event
 * that arrived before the view opened and isn't in the loaded timeline), a decision is matched by its
 * player time to the approval the store says was decided then, and otherwise the newest requested
 * approval stands in. An entry that names an approval never requested is passed over, since no card
 * shows it.
 */
export function newestApproval(
  refs: LogRef[],
  seen: Record<string, Indexed>,
  requested: string[],
  decisions: Record<string, Decision>,
  types: ReadonlySet<EventType> = APPROVAL_TYPES,
): string | null {
  for (let i = refs.length - 1; i >= 0; i--) {
    const r = refs[i];
    if (!types.has(r.type)) continue;
    let approvalId = resolve(seen, r.id)?.approvalId;
    const status = DECISION_STATUS[r.type];
    if (!approvalId && status) {
      const decidedThen = requested.filter((id) => decisions[id]?.status === status && decisions[id]?.decidedAt === r.at);
      approvalId = decidedThen[decidedThen.length - 1];
    }
    if (!approvalId) return requested[requested.length - 1] ?? null;
    if (requested.includes(approvalId)) return approvalId;
  }
  return null;
}

/** Only approval.requested, for the newest request. */
export const REQUEST_TYPES: ReadonlySet<EventType> = new Set<EventType>(["approval.requested"]);

/** A live answer's IDs carry the page tag: <prefix>_user_<tag>_<n> (data-model.md, IDs). */
const LIVE_HIT_ID = /^cft_user_[a-z0-9]{6}_\d+$/;

/** The hits whose counterfeit.flagged came from a live source. */
export function liveHitIds(refs: LogRef[], seen: Record<string, Indexed>): string[] {
  const out: string[] = [];
  for (const r of refs) {
    if (r.type !== HIT_TYPE || r.source !== "live") continue;
    const cftId = resolve(seen, r.id)?.cftId;
    if (cftId && !out.includes(cftId)) out.push(cftId);
  }
  return out;
}

/** Whether a hit came from a live scan: its event in the log was live, or its ID is a live one. */
export function isLiveHit(cftId: string | undefined, live: string[]): boolean {
  return Boolean(cftId && (live.includes(cftId) || LIVE_HIT_ID.test(cftId)));
}
