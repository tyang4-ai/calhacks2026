import { describe, expect, it } from "vitest";
import { EVENT_TYPES, SOURCE_KEYS, STATUS_EVENT_TYPES, type CindiaEvent, type EventType } from "./events";
import { rootReducer } from "./reducers";
import { initialState, LOG_LIMIT, type CindiaState } from "./state";
import { SAMPLE_PAYLOADS, sample } from "./testFixtures";
import { loadTimeline } from "../sources/timelines";

const P = SAMPLE_PAYLOADS;

function apply(events: CindiaEvent[], from: CindiaState = initialState()): CindiaState {
  return events.reduce(rootReducer, from);
}

/** What each event type must leave in the state after it is applied once. */
const checks: { [T in EventType]: (s: CindiaState) => void } = {
  "concierge.asked": (s) => {
    expect(s.buyer.conciergeQuery).toBe(P["concierge.asked"].query);
    expect(s.buyer.conciergeLang).toBe("en");
  },
  "concierge.answered": (s) => {
    expect(s.buyer.concierge?.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);
    expect(s.buyer.concierge?.reasons.pc_01).toEqual(P["concierge.answered"].reasons.pc_01);
  },
  "piece.opened": (s) => expect(s.buyer.openPieceId).toBe("pc_01"),
  "split.shown": (s) => {
    expect(s.buyer.splits.pc_01).toEqual(P["split.shown"]);
    expect(s.buyer.splits.pc_01.makerShareCents).toBe(13448);
    expect(s.buyer.latestSplitPieceId).toBe("pc_01");
  },
  "checkout.started": (s) => expect(s.buyer.checkout).toEqual({ pieceId: "pc_01", grossCents: 18000 }),
  "card.tokenized": (s) => expect(s.buyer.card?.token).toBe("tok_7Q2M9X4KD1PA"),
  "order.placed": (s) => {
    expect(s.buyer.orderIds).toEqual(["ord_001"]);
    expect(s.buyer.orders.ord_001.grossCents).toBe(18000);
  },
  "receipt.updated": (s) => {
    expect(s.buyer.receipts.ord_001).toEqual(P["receipt.updated"]);
    expect(s.buyer.receipts.ord_001.makerShareCents).toBe(13448);
  },
  "money.moved": (s) => {
    expect(s.money.moveIds).toEqual(["mv_0001"]);
    expect(s.money.moves.mv_0001.amountCents).toBe(18000);
    expect(s.money.moves.mv_0001.at).toBe(1000);
  },
  "account.synced": (s) => {
    expect(s.money.accounts.acct_studio.balanceCents).toBe(1215648);
    expect(s.money.latestAccountId).toBe("acct_studio");
  },
  "month.started": (s) => expect(s.month.monthId).toBe("2026-09"),
  "record.arrived": (s) => {
    expect(s.month.recordIds).toEqual(["pay_001"]);
    expect(s.month.records.pay_001.recordType).toBe("payout");
  },
  "match.made": (s) => {
    expect(s.month.matchIds).toEqual(["mat_001"]);
    expect(s.month.matches.mat_001.kind).toBe("one_to_one");
  },
  "flag.raised": (s) => {
    expect(s.month.flagIds).toEqual(["flg_01"]);
    expect(s.month.flags.flg_01.deltaCents).toBe(34000);
    expect(s.month.flags.flg_01.expectedCents).toBe(204000);
  },
  "flag.explained": (s) => {
    // Before its flag lands, the explanation waits.
    expect(s.month.pendingExplanations.flg_01.trustRecordId).toBe("ctr_gallery_01");
  },
  "ledger.posted": (s) => expect(s.month.ledgerEntryIds).toEqual(["led_0001", "led_0002"]),
  "month.closed": (s) => expect(s.month.closed).toEqual(P["month.closed"]),
  "agent.acted": (s) => {
    expect(s.agent.actIds).toEqual(["act_0001"]);
    expect(s.agent.latestActId).toBe("act_0001");
    expect(s.agent.acts.act_0001.text.en).toBe("Matched 3 orders to one payout.");
  },
  "approval.requested": (s) => {
    expect(s.approvals.items.apr_01.status).toBe("pending");
    expect(s.approvals.items.apr_01.requested).toBe(true);
  },
  "approval.granted": (s) => {
    expect(s.approvals.items.apr_01.status).toBe("granted");
    expect(s.approvals.items.apr_01.date).toBe("2026-10-01");
  },
  "approval.declined": (s) => {
    expect(s.approvals.items.apr_01.status).toBe("declined");
    expect(s.approvals.items.apr_01.reason?.en).toBe("Not yet");
  },
  "followup.drafted": (s) => {
    const f = s.approvals.followUps.fup_01;
    expect(f.to).toEqual(P["followup.drafted"].to);
    expect(f.subject).toEqual(P["followup.drafted"].subject);
    expect(f.body).toEqual(P["followup.drafted"].body);
    expect(f.sent).toBe(false);
  },
  "followup.sent": (s) => expect(s.approvals.followUps.fup_01.sent).toBe(true),
  "payout.sent": (s) => {
    expect(s.approvals.payoutIds).toEqual(["mpo_01"]);
    expect(s.approvals.payouts.mpo_01.amountCents).toBe(40000);
  },
  "workbook.ready": (s) => expect(s.close.workbook?.fileName).toBe("cindia-close-2026-09.xlsx"),
  "statement.issued": (s) => {
    const st = s.close.statements.mst_01;
    expect(st.lines).toEqual(P["statement.issued"].lines);
    expect(st.totalCents).toBe(13448);
    expect(st.heldCents).toBe(9500);
    expect(st.payoutDate).toBe("2026-10-02");
    expect(s.close.statementByMaker.mkr_01).toBe("mst_01");
  },
  "impact.updated": (s) => {
    const i = s.impact.latest!;
    expect([i.makerShareBps, i.daysCloseToPayout, i.daysCloseToPayoutBefore, i.bookkeepingHoursSaved]).toEqual([7400, 2, 30, 12]);
    expect(i.estimate).toBe(true);
  },
  "proof.scored": (s) => {
    expect(s.proof.score?.caught).toBe(4);
    expect(s.proof.score?.results).toHaveLength(4);
  },
  "ask.asked": (s) => {
    expect(s.ask.questionIds).toEqual(["ask_01"]);
    expect(s.ask.latestQuestionId).toBe("ask_01");
  },
  "ask.answered": (s) => {
    expect(s.ask.answers.ask_01.answer.en).toBe("The brown, white and grey rug.");
    expect(s.ask.answers.ask_01.chart?.type).toBe("bar");
    expect(s.ask.latestAnswerId).toBe("ask_01");
  },
  "scenario.loaded": (s) => {
    expect(s.scenario.scenarioIds).toEqual(["scn_01"]);
    expect(s.scenario.loads.scn_01.fileName).toBe("gallery-october.csv");
  },
  "beat.started": (s) => expect(s.demo).toEqual({ beatId: "d01-ask", camera: "buyer", process: null, drawer: null }),
  "search.queried": (s) => {
    expect(s.search.queries.qry_01.keywords).toEqual(P["search.queried"].keywords);
    expect(s.search.queries.qry_01.at).toBe(1000);
    expect(s.search.latestQueryId).toBe("qry_01");
  },
  "search.answered": (s) => {
    expect(s.search.answers.qry_01.results.map((r) => r.pieceId)).toEqual(["pc_01", "pc_07"]);
    expect(s.search.answers.qry_01.engine).toBe("keyword_scripted");
  },
  "search.mapped": (s) => {
    expect(s.search.maps.qry_01.points).toHaveLength(2);
    expect(s.search.maps.qry_01.query).toEqual({ x: 0.15, y: -0.38 });
  },
  "surprise.asked": (s) => {
    expect(s.surprise.asks.srp_01.seed).toBe(10);
    expect(s.surprise.latestSurpriseId).toBe("srp_01");
  },
  "surprise.drawn": (s) => {
    expect(s.surprise.draws.srp_01.pieceId).toBe("pc_38");
    expect(s.surprise.draws.srp_01.candidates).toHaveLength(9);
  },
  "support.asked": (s) => {
    const t = s.support.threads.thr_01;
    expect(t.side).toBe("buyer");
    expect(t.contextIds).toEqual(["pc_01"]);
    expect(t.messages).toHaveLength(1);
    expect(t.messages[0]).toMatchObject({ kind: "asked", text: P["support.asked"].text, at: 1000 });
    expect(s.support.threadIds).toEqual(["thr_01"]);
    expect(s.support.latestThreadId).toBe("thr_01");
  },
  "swarm.step": (s) => {
    expect(s.swarm.steps.stp_0001.agentId).toBe("intake");
    expect(s.swarm.runs.run_01).toEqual({ threadId: "thr_01", stepIds: ["stp_0001"], done: false, firstAt: 1000, lastAt: 1000 });
    expect(s.swarm.runIds).toEqual(["run_01"]);
    expect(s.swarm.latestRunId).toBe("run_01");
  },
  "support.answered": (s) => {
    expect(s.support.threads.thr_01.messages[0]).toMatchObject({ kind: "answered", agentId: "writer" });
    expect(s.swarm.runs.run_01.done).toBe(true);
  },
  "support.escalated": (s) => {
    expect(s.support.threads.thr_01.messages[0]).toMatchObject({ kind: "escalated", approvalId: "apr_user_1" });
    expect(s.swarm.runs.run_01.done).toBe(true);
  },
  "question.forwarded": (s) => {
    expect(s.support.questions.qst_01.forwarded).toMatchObject({ threadId: "thr_03", makerId: "mkr_01", at: 1000 });
    expect(s.support.questions.qst_01.answered).toBeNull();
  },
  "question.answered": (s) => {
    expect(s.support.questions.qst_01.answered).toMatchObject({ answerId: "ans_01", text: P["question.answered"].text });
    expect(s.support.questions.qst_01.forwarded).toBeNull();
  },
  "listing.requested": (s) => {
    expect(s.listings.requests.lst_01.notes).toBe(P["listing.requested"].notes);
    expect(s.listings.latestListingId).toBe("lst_01");
  },
  "listing.drafted": (s) => expect(s.listings.drafts.lst_01.checks).toEqual(P["listing.drafted"].checks),
  "listing.indexed": (s) => expect(s.listings.indexed.lst_01).toMatchObject({ pieceId: "pc_55", index: "cindia-drafts" }),
  "storefront.requested": (s) => expect(s.storefront.requests.sto_01).toEqual({ at: 1000 }),
  "storefront.drafted": (s) => expect(s.storefront.drafts.sto_01.blocks).toEqual(P["storefront.drafted"].blocks),
  "storefront.published": (s) =>
    expect(s.storefront.published.sto_01).toEqual({ slug: "dine-weavers", blocks: P["storefront.published"].blocks, at: 1000 }),
  "project.funded": (s) => {
    expect(s.projects.contributions.ctb_01.amountCents).toBe(500);
    expect(s.projects.addedCents).toEqual({ prj_01: 500 });
  },
  "wip.milestone_reached": (s) => expect(s.wip.milestones.mls_02).toEqual({ wipId: "wip_01", status: "reached", date: "2026-10-01", at: 1000 }),
  "wip.milestone_paid": (s) =>
    expect(s.wip.milestones.mls_02).toEqual({ wipId: "wip_01", status: "paid", date: "2026-10-02", amountCents: 12000, at: 1000 }),
  "model.trained": (s) => expect(s.model.trained).toEqual(P["model.trained"]),
  "proof.search_scored": (s) => expect(s.model.scored).toEqual(P["proof.search_scored"]),
  "watch.started": (s) => {
    expect(s.watch.scans.wsc_01).toEqual({ makerId: "mkr_01", queries: P["watch.started"].queries, startedAt: 1000 });
    expect(s.watch.latestScanId).toBe("wsc_01");
  },
  "watch.scanned": (s) => {
    expect(s.watch.scans.wsc_01.results).toEqual(P["watch.scanned"].results);
    expect(s.watch.scans.wsc_01).toMatchObject({ engine: "scripted", candidates: 2, scannedAt: 1000 });
  },
  "counterfeit.flagged": (s) => {
    expect(s.watch.hitIds).toEqual(["cft_01"]);
    expect(s.watch.hits.cft_01.similarity).toBe(0.91);
  },
  "data.synced": (s) => expect(s.sync.data).toEqual({ ...P["data.synced"], at: 1000 }),
  "index.synced": (s) => expect(s.sync.index).toEqual({ ...P["index.synced"], at: 1000 }),
};

/** Types whose store records are keyed by the event's own id (support messages), so a copy under a new id is a new message. */
const KEYED_BY_EVENT_ID = new Set<EventType>(["support.asked", "support.answered", "support.escalated"]);

/** One swarm step of a run on a thread, at a player time. */
function step(stepId: string, runId: string, threadId: string, at: number): CindiaEvent {
  return sample("swarm.step", { stepId, runId, threadId }, { at });
}

/** The state without the log, which keeps one entry per event id by contract. */
function withoutLog(s: CindiaState): Omit<CindiaState, "log"> {
  const { log, ...rest } = s;
  void log;
  return rest;
}

describe("reducers", () => {
  it("has a check for every event type", () => {
    expect(Object.keys(checks).toSorted()).toEqual([...EVENT_TYPES].toSorted());
  });

  for (const type of EVENT_TYPES) {
    it(`${type}: applied once sets the state, applied twice changes nothing`, () => {
      const e = sample(type);
      const once = apply([e]);
      checks[type](once);
      const twice = rootReducer(once, e);
      expect(twice).toBe(once);
      expect(once.log.entries).toEqual([{ id: e.id, type, at: 1000, source: "scripted", ...(e.key ? { key: e.key } : {}) }]);
      // A duplicate with a new envelope ID is still the same entity. The log, keyed by event id, gains
      // its one entry, except that a status event replaces its own type's earlier entry.
      const dup = { ...e, id: "evt_9999" };
      const after = rootReducer(once, dup);
      expect(after.log.entries.map((x) => x.id)).toEqual(STATUS_EVENT_TYPES.includes(type) ? ["evt_9999"] : [e.id, "evt_9999"]);
      if (!KEYED_BY_EVENT_ID.has(type)) {
        expect(withoutLog(after)).toEqual(withoutLog(once));
        checks[type](after);
      }
    });
  }

  it("support messages are keyed by their event id: a replay never doubles one, a new event adds one", () => {
    const asked = sample("support.asked");
    const answered = sample("support.answered");
    const s = apply([asked, answered, asked, answered]);
    expect(s.support.threads.thr_01.messages.map((m) => [m.kind, m.eventId])).toEqual([
      ["asked", asked.id],
      ["answered", answered.id],
    ]);
    const again = rootReducer(s, sample("support.asked", { text: "And the price?" }, { at: 2000 }));
    expect(again.support.threads.thr_01.messages).toHaveLength(3);
    expect(again.support.latestThreadId).toBe("thr_01");
  });

  it("records sources[key] from each keyed event and ignores user events", () => {
    const live = sample("account.synced", {}, { source: "live", id: "evt_live_0001" });
    const s = apply([live]);
    expect(s.sources["b04-bank"]).toBe("live");
    for (const k of SOURCE_KEYS) if (k !== "b04-bank") expect(s.sources[k]).toBe("scripted");
    const back = rootReducer(s, sample("account.synced"));
    expect(back.sources["b04-bank"]).toBe("scripted");
    const user = sample("approval.granted", {}, { source: "user", id: "evt_user_0001", key: undefined });
    expect(rootReducer(s, user).sources).toBe(s.sources);
  });

  it("first approval decision wins", () => {
    const req = sample("approval.requested");
    const grant = sample("approval.granted");
    const decline = sample("approval.declined");
    const s1 = apply([req, grant, decline]);
    expect(s1.approvals.items.apr_01.status).toBe("granted");
    const s2 = apply([req, decline, grant]);
    expect(s2.approvals.items.apr_01.status).toBe("declined");
    // A later request never reopens it.
    expect(rootReducer(s1, req).approvals.items.apr_01.status).toBe("granted");
  });

  it("joins a flag with its explanation in either order", () => {
    const raised = sample("flag.raised");
    const explained = sample("flag.explained");
    for (const order of [
      [raised, explained],
      [explained, raised],
    ]) {
      const s = apply(order);
      expect(s.month.flags.flg_01.trustRecordId).toBe("ctr_gallery_01");
      expect(s.month.flags.flg_01.explanation?.en).toBe("The contract says 40%.");
      expect(s.month.pendingExplanations).toEqual({});
    }
  });

  it("updates a receipt from received to paid to the maker", () => {
    const s = apply([
      sample("receipt.updated"),
      sample("receipt.updated", { status: "paid_to_maker", paidDate: "2026-10-02" }),
    ]);
    expect(s.buyer.receipts.ord_001.status).toBe("paid_to_maker");
    expect(s.buyer.receipts.ord_001.paidDate).toBe("2026-10-02");
  });

  it("keeps money moves in firing order without double counting", () => {
    const a = sample("money.moved");
    const b = sample("money.moved", { moveId: "mv_0002", kind: "fee", amountCents: 552 });
    const s = apply([a, b, a, b]);
    expect(s.money.moveIds).toEqual(["mv_0001", "mv_0002"]);
  });

  it("counts a project.funded once, even when it arrives twice under new event ids", () => {
    const first = sample("project.funded");
    const s = apply([first, { ...first, id: "evt_8001" }, { ...first, id: "evt_8002", at: 5000 }]);
    expect(s.projects.addedCents).toEqual({ prj_01: 500 });
    const more = rootReducer(s, sample("project.funded", { contributionId: "ctb_user_1", amountCents: 500, buyerId: "buy_02" }));
    expect(more.projects.addedCents).toEqual({ prj_01: 1000 });
  });

  it("keeps the newer data.synced and the newer index.synced, and one log entry for each", () => {
    const d1 = sample("data.synced", {}, { at: 1000, source: "live", id: "evt_live_1001" });
    const d2 = sample("data.synced", { screens: 3 }, { at: 2000, source: "live", id: "evt_live_1002" });
    const i1 = sample("index.synced", {}, { at: 1000 });
    const i2 = sample("index.synced", { indexed: 55, drafts: 1 }, { at: 2500 });
    const s = apply([d1, i1, d2, i2]);
    expect(s.sync.data).toMatchObject({ screens: 3, at: 2000 });
    expect(s.sync.index).toMatchObject({ indexed: 55, drafts: 1, at: 2500 });
    // An older one arriving late doesn't replace the newer.
    expect(rootReducer(s, { ...d1, id: "evt_live_1003" }).sync.data).toMatchObject({ screens: 3, at: 2000 });
    expect(s.log.entries.map((x) => x.id)).toEqual([d2.id, i2.id]);
  });

  it("keeps question.forwarded and question.answered under one questionId, each with its event's id", () => {
    const fwd = sample("question.forwarded");
    const ans = sample("question.answered", {}, { at: 4000 });
    const s = apply([fwd, ans]);
    expect(s.support.questions.qst_01.forwarded).toEqual({ ...P["question.forwarded"], eventId: fwd.id, at: 1000 });
    expect(s.support.questions.qst_01.answered).toEqual({ ...P["question.answered"], eventId: ans.id, at: 4000 });
    // Their order comes from the log, through eventId.
    const place = (id: string) => s.log.entries.findIndex((x) => x.id === id);
    expect(place(s.support.questions.qst_01.forwarded!.eventId)).toBeLessThan(place(s.support.questions.qst_01.answered!.eventId));
  });

  it("keeps the newer storefront.published's slug, blocks and at", () => {
    const older = sample("storefront.published", {}, { at: 1000 });
    const blocks = [{ blockId: "blk_02", kind: "story" as const, props: { title: "Our weaving", body: "About the co-op" } }];
    const newer = sample("storefront.published", { blocks }, { at: 3000 });
    const s = apply([older, newer]);
    expect(s.storefront.published.sto_01).toEqual({ slug: "dine-weavers", blocks, at: 3000 });
    expect(rootReducer(s, { ...older, id: "evt_7001" }).storefront.published.sto_01.at).toBe(3000);
  });

  it("files cards by piece: a person's checkout of pc_13 leaves the tour's pc_01 card as it was", () => {
    const tourCheckout = sample("checkout.started", {}, { at: 1000 });
    const tourCard = sample("card.tokenized", {}, { at: 1500 }); // v1's card carries no pieceId
    const s1 = apply([tourCheckout, tourCard]);
    expect(s1.buyer.cards.pc_01).toEqual({ ...P["card.tokenized"], at: 1500 });
    const personCheckout = sample("checkout.started", { pieceId: "pc_13", grossCents: 6500 }, { at: 9000, source: "user", id: "evt_user_0001", key: undefined });
    const personCard = sample("card.tokenized", { token: "tok_PC13AAAAAAAA", pieceId: "pc_13" }, { at: 10200, key: undefined });
    const s2 = apply([personCheckout, personCard], s1);
    expect(Object.keys(s2.buyer.cards).toSorted()).toEqual(["pc_01", "pc_13"]);
    expect(s2.buyer.cards.pc_01).toEqual(s1.buyer.cards.pc_01);
    expect(s2.buyer.cards.pc_13.token).toBe("tok_PC13AAAAAAAA");
    expect(Object.keys(s2.buyer.checkouts).toSorted()).toEqual(["pc_01", "pc_13"]);
    // The latest of each stays for v1's readers.
    expect(s2.buyer.checkout?.pieceId).toBe("pc_13");
    expect(s2.buyer.card?.pieceId).toBe("pc_13");
  });

  it("marks a run done on its answer, and a listing or storefront run done through its thread", () => {
    const s = apply([
      step("stp_0001", "run_01", "thr_01", 1000),
      step("stp_0002", "run_01", "thr_01", 1300),
      step("stp_0003", "run_02", "lst_01", 2000),
      step("stp_0004", "run_03", "sto_01", 2500),
    ]);
    expect(s.swarm.runs.run_01).toMatchObject({ stepIds: ["stp_0001", "stp_0002"], firstAt: 1000, lastAt: 1300, done: false });
    expect(s.swarm.latestRunId).toBe("run_03");
    const done = apply([sample("support.answered", {}, { at: 1600 }), sample("listing.drafted", {}, { at: 2300 }), sample("storefront.drafted", {}, { at: 2800 })], s);
    expect(done.swarm.runs.run_01).toMatchObject({ done: true, lastAt: 1600 });
    expect(done.swarm.runs.run_02).toMatchObject({ done: true, lastAt: 2300 });
    expect(done.swarm.runs.run_03).toMatchObject({ done: true, lastAt: 2800 });
  });

  it("stores the inline approval as it arrives and never reopens a decided one", () => {
    const approval = {
      kind: "listing_publish" as const,
      subjectIds: ["lst_user_1"],
      overLimit: false,
      proposedBy: "cindy" as const,
      summary: { en: "Publish the listing", zh: "发布作品" },
      decisionDate: "2026-10-01",
    };
    const req = sample("approval.requested", { approvalId: "apr_user_1", approval });
    const s = apply([req]);
    expect(s.approvals.items.apr_user_1).toMatchObject({ status: "pending", requested: true, approval });
    const granted = apply([sample("approval.granted", { approvalId: "apr_user_1" }), req], s);
    expect(granted.approvals.items.apr_user_1).toMatchObject({ status: "granted", approval });
  });

  it("takes the beat's process and drawer, and clears them on a beat without", () => {
    const s = apply([sample("beat.started", { beatId: "d04-support", camera: "shop-piece", process: "swarm", drawer: "support" })]);
    expect(s.demo).toEqual({ beatId: "d04-support", camera: "shop-piece", process: "swarm", drawer: "support" });
    const next = rootReducer(s, sample("beat.started", { beatId: "d05-pay", camera: "shop-piece" }));
    expect(next.demo).toEqual({ beatId: "d05-pay", camera: "shop-piece", process: null, drawer: null });
  });

  it("keeps a scan's checked results and follows the newest scan", () => {
    const s = apply([
      sample("watch.started", {}, { at: 1000 }),
      sample("watch.scanned", {}, { at: 3000 }),
      sample("counterfeit.flagged", {}, { at: 3500 }),
      sample("watch.started", { scanId: "wsc_user_1" }, { at: 9000 }),
    ]);
    expect(s.watch.scans.wsc_01.results).toHaveLength(2);
    expect(s.watch.scans.wsc_01.results?.[1].similarity).toBeNull();
    expect(s.watch.latestScanId).toBe("wsc_user_1");
    // A late repeat of the tour's scan doesn't take over.
    expect(rootReducer(s, sample("watch.started", {}, { at: 1000 })).watch.latestScanId).toBe("wsc_user_1");
  });

  it("follows the newest query, surprise, listing and thread on the player clock", () => {
    const s = apply([
      sample("search.queried", {}, { at: 60400 }),
      sample("search.queried", { queryId: "qry_user_1", text: "blue" }, { at: 70000 }),
      sample("surprise.asked", {}, { at: 1000 }),
      sample("surprise.asked", { surpriseId: "srp_user_1" }, { at: 2000 }),
      sample("listing.requested", {}, { at: 1000 }),
      sample("listing.requested", { listingId: "lst_user_1" }, { at: 500 }),
    ]);
    expect(s.search.latestQueryId).toBe("qry_user_1");
    expect(s.surprise.latestSurpriseId).toBe("srp_user_1");
    // An older one arriving later keeps the newer as latest.
    expect(s.listings.latestListingId).toBe("lst_01");
    expect(rootReducer(s, sample("search.queried", {}, { at: 60400 })).search.latestQueryId).toBe("qry_user_1");
  });

  it("never sends a paid milestone back to reached", () => {
    const s = apply([sample("wip.milestone_reached"), sample("wip.milestone_paid"), sample("wip.milestone_reached", {}, { at: 9000 })]);
    expect(s.wip.milestones.mls_02.status).toBe("paid");
  });

  it("keeps the newest listing.indexed: the draft's entry, then cindia-pieces once published", () => {
    const s = apply([sample("listing.indexed", {}, { at: 1000 }), sample("listing.indexed", { index: "cindia-pieces" }, { at: 5000 })]);
    expect(s.listings.indexed.lst_01).toMatchObject({ index: "cindia-pieces", at: 5000 });
  });
});

describe("the log", () => {
  it("keeps one entry per event id, newest last, at most 400", () => {
    let s = initialState();
    for (let i = 0; i < LOG_LIMIT + 50; i += 1) s = rootReducer(s, sample("agent.acted", { actId: `act_${i}` }, { id: `evt_log_${i}`, at: i }));
    expect(s.log.entries).toHaveLength(LOG_LIMIT);
    expect(s.log.entries[0].id).toBe("evt_log_50");
    expect(s.log.entries.at(-1)?.id).toBe(`evt_log_${LOG_LIMIT + 49}`);
  });

  it("lets a status event replace its own earlier entry, so polling never pushes the tour out", () => {
    const tour = sample("piece.opened", {}, { at: 1000 });
    let s = apply([tour]);
    for (let i = 0; i < LOG_LIMIT + 10; i += 1) s = rootReducer(s, sample("data.synced", { screens: i }, { id: `evt_live_${i}`, at: 2000 + i, source: "live" }));
    expect(s.log.entries.map((x) => x.id)).toEqual([tour.id, `evt_live_${LOG_LIMIT + 9}`]);
  });

  it("holds the same entries in the same order when the demo timeline plays twice, at most 400", () => {
    const t = loadTimeline("demo");
    expect(t.events.length).toBeGreaterThan(0);
    expect(t.events.length).toBeLessThanOrEqual(LOG_LIMIT);
    const once = apply(t.events);
    const fresh = apply(t.events);
    expect(fresh.log).toEqual(once.log);
    // Replayed into the same store: the same log, the same counts and the same records.
    const twice = apply(t.events, once);
    expect(twice.log).toBe(once.log);
    expect(twice).toEqual(once);
    expect(once.log.entries.map((x) => x.id)).toEqual(t.events.map((e) => e.id));
  });
});
