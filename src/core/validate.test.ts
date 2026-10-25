import { describe, expect, it } from "vitest";
import { EVENT_TYPES, PROCESS_IDS, type DataTable, type DrawerKind, type EventType } from "./events";
import { TOUR_CAMERA_IDS } from "./featureTypes";
import { SAMPLE_PAYLOADS, sample } from "./testFixtures";
import { validateEvent } from "./validate";

/** The problems for a sample event of `type` with one payload field removed. */
function missing(type: EventType, field: string): string[] {
  const e = sample(type) as unknown as { payload: Record<string, unknown> };
  delete e.payload[field];
  return validateEvent(e);
}

describe("validateEvent", () => {
  it("covers every event type in events.md", () => {
    expect(Object.keys(SAMPLE_PAYLOADS).toSorted()).toEqual([...EVENT_TYPES].toSorted());
  });

  for (const type of EVENT_TYPES) {
    describe(type, () => {
      it("accepts a good event", () => {
        expect(validateEvent(sample(type))).toEqual([]);
      });

      it("rejects a bad event", () => {
        const e = sample(type as EventType) as unknown as { payload: Record<string, unknown> };
        const first = Object.keys(e.payload)[0];
        // Wrong type for the first field: a number becomes a string, anything else becomes a number.
        e.payload[first] = typeof e.payload[first] === "number" ? "oops" : 42;
        expect(validateEvent(e).length).toBeGreaterThan(0);
      });

      it("rejects a missing field and an unknown field", () => {
        const e = sample(type as EventType) as unknown as { payload: Record<string, unknown> };
        const first = Object.keys(e.payload)[0];
        delete e.payload[first];
        expect(validateEvent(e).some((p) => p.includes(`${first}: missing`))).toBe(true);
        const f = sample(type as EventType) as unknown as { payload: Record<string, unknown> };
        f.payload.notInContract = 1;
        expect(validateEvent(f).some((p) => p.includes("notInContract"))).toBe(true);
      });
    });
  }

  it("rejects an unknown type, a bad envelope and a bad key", () => {
    expect(validateEvent({ id: "evt_1", type: "nope.done", at: 0, source: "scripted", payload: {} })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), at: -1 })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), source: "robot" })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), key: "b99-nope" })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), id: "x" })).not.toEqual([]);
    expect(validateEvent({ ...sample("piece.opened"), extra: 1 })).not.toEqual([]);
    expect(validateEvent(null)).not.toEqual([]);
  });

  it("checks cents are integers, dates are dates, and the token's shape", () => {
    expect(validateEvent(sample("split.shown", { grossCents: 180.5 }))).not.toEqual([]);
    expect(validateEvent(sample("order.placed", { date: "Sep 1" }))).not.toEqual([]);
    expect(validateEvent(sample("card.tokenized", { token: "tok_short" }))).not.toEqual([]);
    expect(validateEvent(sample("concierge.answered", { pieceIds: ["pc_01"] }))).not.toEqual([]);
    expect(validateEvent(sample("beat.started", { camera: "drone" as never }))).not.toEqual([]);
  });

  it("accepts every optional field of section 3 and a null similarity", () => {
    expect(
      validateEvent(sample("split.shown", { compare: { channelId: "ch_gallery", commissionBps: 4000, makerShareCents: 8600 } })),
    ).toEqual([]);
    const answered = SAMPLE_PAYLOADS["search.answered"];
    expect(
      validateEvent(
        sample("search.answered", {
          results: answered.results.map((r) => ({ ...r, closeness: 0.83 })),
          closeMatches: true,
          modelId: "cindia-embed-v1",
          keywords: ["warm", "red"],
          filters: { maxPriceCents: 20000, communityIds: ["com_dine"] },
          keywordsBy: "finder",
        }),
      ),
    ).toEqual([]);
    expect(validateEvent(sample("listing.indexed", { point: { x: 0.1, y: -0.2 }, approx: true, index: "cindia-pieces" }))).toEqual([]);
    expect(validateEvent(sample("flag.raised", { nessieId: "6720f0a1" }))).toEqual([]);
    expect(validateEvent(sample("search.mapped", { approx: true }))).toEqual([]);
    expect(validateEvent(sample("card.tokenized", { pieceId: "pc_01" }))).toEqual([]);
    expect(validateEvent(sample("beat.started", { camera: "shop-piece", process: "swarm", drawer: "support" }))).toEqual([]);
    expect(validateEvent(sample("beat.started", { camera: "pitch" }))).toEqual([]);
    // The legacy cameras left with I2-tour: v1's eight and shop-legacy are rejected.
    for (const camera of ["shop-legacy", "buyer", "receipt", "studio-catch"]) expect(validateEvent(sample("beat.started", { camera: camera as never })), camera).not.toEqual([]);
    expect(
      validateEvent(
        sample("approval.requested", {
          approvalId: "apr_user_1",
          approval: {
            kind: "report_listing",
            subjectIds: ["cft_user_1"],
            overLimit: false,
            proposedBy: "cindy",
            summary: { en: "Report the listing", zh: "举报该商品" },
            decisionDate: "2026-10-01",
          },
        }),
      ),
    ).toEqual([]);
    expect(validateEvent(sample("money.moved", { kind: "project_fund", to: { kind: "community_fund", id: "prj_01" }, moveId: "mv_0102" }))).toEqual([]);
    expect(validateEvent(sample("money.moved", { kind: "milestone", moveId: "mv_user_1" }))).toEqual([]);
    const scanned = SAMPLE_PAYLOADS["watch.scanned"];
    expect(scanned.results.some((r) => r.similarity === null)).toBe(true);
    expect(validateEvent(sample("watch.scanned"))).toEqual([]);
    expect(validateEvent(sample("listing.drafted", { facets: { ...SAMPLE_PAYLOADS["listing.drafted"].facets, sizeCm: { w: 30, h: 40 }, oneOfAKind: true, leadTimeDays: 0 } }))).toEqual([]);
  });

  it("accepts beat.started on every tour camera, with every process and every drawer (the tour's beats)", () => {
    for (const camera of TOUR_CAMERA_IDS) expect(validateEvent(sample("beat.started", { beatId: "d01-vibe", camera })), camera).toEqual([]);
    for (const process of PROCESS_IDS) {
      expect(validateEvent(sample("beat.started", { beatId: "d15-listing", camera: "sell-listings", process })), process).toEqual([]);
    }
    const drawers: DrawerKind[] = ["support", "ask", "audit"];
    for (const drawer of drawers) {
      expect(validateEvent(sample("beat.started", { beatId: "d04-support", camera: "shop-piece", drawer })), drawer).toEqual([]);
    }
  });

  it("accepts data.synced with all eight tables, three newest rows each, and a status for every process", () => {
    const names: DataTable[] = ["catalog", "listings", "orders", "approvals", "runs", "steps", "processes", "screens"];
    const tables = names.map((table) => ({
      table,
      rows: 3,
      newest: [3, 2, 1].map((i) => ({ id: `${table}_${i}`, label: `${table} ${i}` })),
    }));
    const processes = PROCESS_IDS.map((processId) => ({ processId, status: processId === "swarm" || processId === "data" ? ("working" as const) : ("done" as const) }));
    expect(validateEvent(sample("data.synced", { tables, screens: 1, processes }))).toEqual([]);
    // d15-listing's data.synced is a scripted event keyed b13-live.
    expect(sample("data.synced").key).toBe("b13-live");
  });

  it("rejects a missing required field of section 3 and 11", () => {
    expect(missing("listing.indexed", "index")).not.toEqual([]);
    expect(missing("question.answered", "answerId")).not.toEqual([]);
    expect(missing("storefront.published", "blocks")).not.toEqual([]);
    expect(missing("storefront.published", "slug")).not.toEqual([]);
    expect(missing("watch.scanned", "results")).not.toEqual([]);
    expect(missing("data.synced", "processes")).not.toEqual([]);
    expect(missing("support.asked", "contextIds")).not.toEqual([]);
  });

  it("rejects a bad value in each new field", () => {
    const bad: [EventType, Record<string, unknown>][] = [
      ["split.shown", { compare: { channelId: "ch_site", commissionBps: 4000, makerShareCents: 8600 } }],
      ["split.shown", { compare: { channelId: "ch_gallery", commissionBps: 4000 } }],
      ["card.tokenized", { pieceId: 1 }],
      ["flag.raised", { nessieId: 7 }],
      ["approval.requested", { approval: { kind: "follow_up", subjectIds: [], overLimit: false, proposedBy: "own_01", summary: { en: "", zh: "" }, decisionDate: "2026-10-01" } }],
      ["approval.requested", { approval: { kind: "nope", subjectIds: [], overLimit: false, proposedBy: "cindy", summary: { en: "", zh: "" }, decisionDate: "2026-10-01" } }],
      ["beat.started", { process: "nowhere" }],
      ["beat.started", { drawer: "kitchen" }],
      ["money.moved", { to: { kind: "charity" } }],
      ["search.queried", { filters: { maxPriceCents: "200" } }],
      ["search.answered", { engine: "google" }],
      ["search.answered", { keywordsBy: "magic" }],
      ["search.answered", { results: [{ pieceId: "pc_01", score: 1.4, matched: [], reason: { en: "", zh: "" } }] }],
      ["search.answered", { results: [{ pieceId: "pc_01", score: 1, closeness: -0.2, matched: [], reason: { en: "", zh: "" } }] }],
      ["search.answered", { results: Array.from({ length: 13 }, (_, i) => ({ pieceId: `pc_${i}`, score: 0.5, matched: [], reason: { en: "", zh: "" } })) }],
      ["search.mapped", { method: "umap" }],
      ["search.mapped", { approx: "yes" }],
      ["surprise.asked", { method: "lucky" }],
      ["surprise.asked", { seed: 1.5 }],
      ["surprise.drawn", { candidates: [{ pieceId: "pc_38", weight: 0.5 }] }],
      ["surprise.drawn", { pieceId: "pc_99" }],
      ["support.asked", { side: "staff" }],
      ["swarm.step", { kind: "dance" }],
      ["swarm.step", { model: "any-other-model" }],
      ["swarm.step", { ms: -1 }],
      ["support.answered", { approvalIds: "apr_01" }],
      ["question.forwarded", { lang: "fr" }],
      ["listing.drafted", { checks: [{ checkId: "chk_01", kind: "vibes", ok: true, note: { en: "", zh: "" } }] }],
      ["listing.drafted", { vibe: { moods: [] } }],
      ["listing.indexed", { index: "cindia-everything" }],
      ["listing.indexed", { point: { x: 1 } }],
      ["storefront.drafted", { blocks: [{ blockId: "blk_01", kind: "banner", props: {} }] }],
      ["storefront.published", { blocks: [{ blockId: "blk_01", kind: "hero", props: { tagline: 3 } }] }],
      ["project.funded", { amountCents: 5.5 }],
      ["wip.milestone_reached", { date: "Oct 1" }],
      ["wip.milestone_paid", { amountCents: "120" }],
      ["model.trained", { dims: "384" }],
      ["proof.search_scored", { k: 10 }],
      ["proof.search_scored", { systems: [{ system: "keyword", recallAtK: 1.2, mrr: 0.3 }] }],
      ["watch.scanned", { engine: "google" }],
      ["watch.scanned", { results: [{ title: "x", url: "/market/x.html", snippet: "", similarity: "high", verdict: "neither" }] }],
      ["watch.scanned", { results: [{ title: "x", url: "/market/x.html", snippet: "", similarity: 0.2, verdict: "fake" }] }],
      ["counterfeit.flagged", { similarity: null }],
      ["data.synced", { tables: [{ table: "secrets", rows: 1, newest: [] }] }],
      ["data.synced", { tables: [{ table: "orders", rows: 9, newest: [1, 2, 3, 4].map((i) => ({ id: `ord_00${i}`, label: "Order" })) }] }],
      ["data.synced", { processes: [{ processId: "search", status: "sleeping" }] }],
      ["index.synced", { elastic: "true" }],
    ];
    for (const [type, override] of bad) {
      expect(validateEvent(sample(type, override as never)), `${type} ${JSON.stringify(override)}`).not.toEqual([]);
    }
  });

  it("accepts surprise weights rounded to 4 decimals for all 54 pieces, and rejects a sum far from 1", () => {
    // pure_random over 54 pieces: 1/54 rounded to 4 decimals is 0.0185, which sums to 0.999.
    const candidates = Array.from({ length: 54 }, (_, i) => ({ pieceId: `pc_${String(i + 1).padStart(2, "0")}`, weight: 0.0185 }));
    const rounded = candidates.reduce((sum, c) => sum + c.weight, 0);
    expect(Math.abs(rounded - 1)).toBeGreaterThan(0.001);
    expect(validateEvent(sample("surprise.drawn", { method: "pure_random", pieceId: "pc_38", candidates }))).toEqual([]);
    // Unrounded weights sum to 1 up to float error.
    const exact = candidates.map((c) => ({ ...c, weight: 1 / 54 }));
    expect(validateEvent(sample("surprise.drawn", { method: "pure_random", pieceId: "pc_38", candidates: exact }))).toEqual([]);
    // Off by more than rounding allows.
    const short = candidates.map((c, i) => (i === 0 ? { ...c, weight: 0.0135 } : c));
    expect(validateEvent(sample("surprise.drawn", { method: "pure_random", pieceId: "pc_38", candidates: short }))).not.toEqual([]);
  });

  it("checks the ID prefix for live and user events", () => {
    expect(validateEvent(sample("account.synced", {}, { source: "live", id: "evt_live_0001" }))).toEqual([]);
    expect(validateEvent(sample("account.synced", {}, { source: "live", id: "evt_0001" }))).not.toEqual([]);
    expect(validateEvent(sample("ask.asked", {}, { source: "user", id: "evt_user_0001" }))).toEqual([]);
    expect(validateEvent(sample("ask.asked", {}, { source: "user", id: "evt_0001" }))).not.toEqual([]);
  });
});
