// F-watch: which scan the screen follows, its hits in order, the next scan ID, and live hits.
import { describe, expect, it } from "vitest";
import type { Payloads } from "../../core/events";
import { initialState, type CindiaState } from "../../core/state";
import { checkedCount, followedScan, hitsOf, isLiveHit, isScanned, nextScanId, possibleCopies, selectLiveHitEvents } from "./model";

function hit(cftId: string, scanId: string, similarity: number): Payloads["counterfeit.flagged"] & { at: number } {
  return { cftId, scanId, pieceId: "pc_01", url: "/market/x.html", title: cftId, snippet: "", similarity, claim: { en: "", zh: "" }, at: 0 };
}

function withWatch(watch: Partial<CindiaState["watch"]>): CindiaState {
  const s = initialState();
  return { ...s, watch: { ...s.watch, ...watch } };
}

describe("nextScanId", () => {
  it("counts the store's person-made scans", () => {
    expect(nextScanId([])).toBe("wsc_user_1");
    expect(nextScanId(["wsc_01", "wsc_user_1", "wsc_user_3"])).toBe("wsc_user_4");
  });
});

describe("followedScan and hitsOf", () => {
  const s = withWatch({
    scans: {
      wsc_01: { makerId: "mkr_01", queries: ["a"], startedAt: 0, engine: "scripted", candidates: 4, scannedAt: 10 },
      wsc_user_1: { makerId: "mkr_02", queries: ["b"], startedAt: 50 },
    },
    hits: { cft_01: hit("cft_01", "wsc_01", 0.6), cft_09: hit("cft_09", "wsc_01", 0.9), cft_user_1: hit("cft_user_1", "wsc_user_1", 0.99) },
    hitIds: ["cft_01", "cft_09", "cft_user_1"],
    latestScanId: "wsc_01",
  });

  it("follows the newest watch.started", () => {
    expect(followedScan(s)?.scanId).toBe("wsc_01");
    expect(followedScan(withWatch({}))).toBeNull();
  });

  it("lists only that scan's hits, highest similarity first", () => {
    expect(hitsOf(s, "wsc_01").map((h) => h.cftId)).toEqual(["cft_09", "cft_01"]);
    expect(hitsOf(s, null)).toEqual([]);
  });

  it("knows when the scan's watch.scanned has arrived", () => {
    expect(isScanned(s.watch.scans.wsc_01)).toBe(true);
    expect(isScanned(s.watch.scans.wsc_user_1)).toBe(false);
    expect(isScanned(null)).toBe(false);
  });

  it("counts possible copies from the results' verdicts, or the hits without a list", () => {
    const results = [
      { title: "a", url: "u", snippet: "", similarity: 0.9, verdict: "possible_copy" as const },
      { title: "b", url: "u", snippet: "", similarity: null, verdict: "claim_only" as const },
    ];
    expect(possibleCopies({ results }, [])).toBe(1);
    expect(possibleCopies({}, hitsOf(s, "wsc_01"))).toBe(2);
    expect(checkedCount({ candidates: 4, results })).toBe(4);
    expect(checkedCount({ results })).toBe(2);
  });
});

describe("isLiveHit", () => {
  it("reads the noted event's source from the log", () => {
    const s = initialState();
    s.log.entries.push({ id: "evt_live_1", type: "counterfeit.flagged", at: 0, source: "live", key: "b15-watch" });
    s.log.entries.push({ id: "evt_reply_1", type: "counterfeit.flagged", at: 0, source: "scripted", key: "b15-watch" });
    const live = new Set(selectLiveHitEvents(s));
    expect(isLiveHit("cft_user_1", { cft_user_1: "evt_live_1" }, live)).toBe(true);
    expect(isLiveHit("cft_user_2", { cft_user_2: "evt_reply_1" }, live)).toBe(false);
  });

  it("falls back on the live ID form for a hit the view didn't see arrive", () => {
    expect(isLiveHit("cft_user_ab12cd_1", {}, new Set())).toBe(true);
    expect(isLiveHit("cft_user_1", {}, new Set())).toBe(false);
    expect(isLiveHit("cft_01", {}, new Set())).toBe(false);
  });
});
