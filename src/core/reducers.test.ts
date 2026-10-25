import { describe, expect, it } from "vitest";
import { EVENT_TYPES, SOURCE_KEYS, type CindiaEvent, type EventType } from "./events";
import { rootReducer } from "./reducers";
import { initialState, type CindiaState } from "./state";
import { SAMPLE_PAYLOADS, sample } from "./testFixtures";

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
  "beat.started": (s) => expect(s.demo).toEqual({ beatId: "d01-ask", camera: "buyer" }),
};

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
      // A duplicate with a new envelope ID is still the same entity.
      const dup = { ...e, id: "evt_9999" };
      expect(rootReducer(once, dup)).toEqual(once);
      checks[type](rootReducer(once, dup));
    });
  }

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
});
