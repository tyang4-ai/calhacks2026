// The watch's plain reads over the store: which scan the screen follows, that scan's hits, the next
// wsc_user_<n>, and which hits came from a live source. No components, so unit tests run them.
// - The screen follows the newest watch.started in the store (watch.latestScanId).
// - Its hits are the counterfeit.flagged with that scanId, highest similarity first.
// - A hit is live when its counterfeit.flagged came from a live source. Log entries carry an
//   event's id and source but not its payload, so useLiveHitIds() notes each counterfeit.flagged's
//   event id while the view is open and reads its source from the log. A hit that arrived while
//   the view was closed counts as live when its ID has the live form, cft_user_<tag>_<n>.
import { useEffect, useState } from "react";
import type { CindiaEvent, Payloads } from "../../core/events";
import type { CindiaState, Stamped, WatchScanState } from "../../core/state";
import { onEvent } from "../../core/store";

export type Hit = Stamped<Payloads["counterfeit.flagged"]>;

/** The prefix of a person's scan IDs (data-model.md, the ID scheme). */
export const SCAN_PREFIX = "wsc_user_";

/** A live answer's IDs carry the page tag: cft_user_<tag>_<n> (data-model.md, IDs). */
const LIVE_HIT_ID = /^cft_user_[a-z0-9]{6}_\d+$/;

/** One more than the highest wsc_user_<n> in the store: features number IDs by counting the store. */
export function nextScanId(scanIds: Iterable<string>): string {
  let max = 0;
  for (const id of scanIds) {
    if (!id.startsWith(SCAN_PREFIX)) continue;
    const n = Number(id.slice(SCAN_PREFIX.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${SCAN_PREFIX}${max + 1}`;
}

/** The scan the screen follows: the newest watch.started, with its ID. */
export interface FollowedScan extends WatchScanState {
  scanId: string;
}

export function followedScan(s: Pick<CindiaState, "watch">): FollowedScan | null {
  const id = s.watch.latestScanId;
  const scan = id ? s.watch.scans[id] : undefined;
  return id && scan ? { ...scan, scanId: id } : null;
}

/** Whether the scan's watch.scanned has arrived. */
export function isScanned(scan: Pick<WatchScanState, "scannedAt" | "engine"> | null): boolean {
  return Boolean(scan && (scan.scannedAt !== undefined || scan.engine !== undefined));
}

/** The scan's hits, highest similarity first, then in arrival order. */
export function hitsOf(s: Pick<CindiaState, "watch">, scanId: string | null): Hit[] {
  if (!scanId) return [];
  const order = s.watch.hitIds;
  return order
    .map((id) => s.watch.hits[id])
    .filter((h): h is Hit => Boolean(h) && h.scanId === scanId)
    .toSorted((a, b) => b.similarity - a.similarity || order.indexOf(a.cftId) - order.indexOf(b.cftId));
}

/** How many possible copies the scan found: its results' verdicts, or its hits when it sent no list. */
export function possibleCopies(scan: Pick<WatchScanState, "results"> | null, hits: readonly Hit[]): number {
  if (scan?.results) return scan.results.filter((r) => r.verdict === "possible_copy").length;
  return hits.length;
}

/** How many results the scan checked: its count, or its list's length. */
export function checkedCount(scan: Pick<WatchScanState, "candidates" | "results"> | null): number {
  return scan?.candidates ?? scan?.results?.length ?? 0;
}

/** The newest counterfeit.flagged event id per hit, noted while the view is open. */
export type HitEvents = Record<string, string>;

/** Whether a hit came from a live source: its noted event is live in the log, or its ID has the live form. */
export function isLiveHit(cftId: string, noted: HitEvents, liveEventIds: ReadonlySet<string>): boolean {
  const eventId = noted[cftId];
  if (eventId !== undefined) return liveEventIds.has(eventId);
  return LIVE_HIT_ID.test(cftId);
}

/** The log's live counterfeit.flagged event ids. */
export function selectLiveHitEvents(s: Pick<CindiaState, "log">): string[] {
  const out: string[] = [];
  for (const e of s.log.entries) if (e.type === "counterfeit.flagged" && e.source === "live") out.push(e.id);
  return out;
}

/** Notes each counterfeit.flagged's event id by its cftId, from the moment the view opens. */
export function useHitEvents(): HitEvents {
  const [noted, setNoted] = useState<HitEvents>({});
  useEffect(
    () =>
      onEvent((e: CindiaEvent) => {
        if (e.type !== "counterfeit.flagged") return;
        const cftId = (e.payload as Payloads["counterfeit.flagged"]).cftId;
        setNoted((prev) => (prev[cftId] === e.id ? prev : { ...prev, [cftId]: e.id }));
      }),
    [],
  );
  return noted;
}
