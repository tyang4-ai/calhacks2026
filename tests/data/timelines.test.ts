// Both timelines and the scenario replies: every event validates, IDs are unique, `at` never goes
// backwards, payload IDs resolve, keys match events.md, beats match demo-script.md, and derived
// payloads equal their records.
import { describe, expect, it } from "vitest";
import { validateEvents } from "../../src/core/validate";
import type { CindiaEvent } from "../../src/core/events";
import {
  curatedSet,
  demoTimeline,
  followUp,
  getById,
  impact,
  makerPayouts,
  makerStatements,
  monthTimeline,
  scenarioReplies,
  sampleRecordIds,
  cannedAnswers,
} from "../../src/mock/index";
import type { Order } from "../../src/core/types";

const docs = import.meta.glob<string>(["../../docs/common/events.md", "../../docs/common/demo-script.md"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const eventsMd = docs["../../docs/common/events.md"];
const demoMd = docs["../../docs/common/demo-script.md"];

/** The Key column of every event table in events.md. */
function keysFromDoc(): Map<string, string | undefined> {
  const out = new Map<string, string | undefined>();
  for (const line of eventsMd.split(/\r?\n/)) {
    const m = /^\|\s*`([a-z]+\.[a-z_]+)`\s*\|/.exec(line);
    if (!m) continue;
    const cells = line.replace(/\\\|/g, "").split("|").map((c) => c.trim());
    const keyCell = cells[cells.length - 2];
    const k = /`(b\d\d-[a-z]+)`/.exec(keyCell);
    if (!out.has(m[1])) out.set(m[1], k ? k[1] : undefined);
  }
  return out;
}

/** Beat ID, start ms and camera from the Beats table in demo-script.md. */
function beatsFromDoc(): [string, number, string][] {
  const out: [string, number, string][] = [];
  for (const line of demoMd.split(/\r?\n/)) {
    const m = /^\|\s*`(d\d\d-[a-z-]+)`\s*\|\s*([\d.]+) to [\d.]+\s*\|\s*`([a-z-]+)`\s*\|/.exec(line);
    if (m) out.push([m[1], Math.round(Number(m[2]) * 1000), m[3]]);
  }
  return out;
}

const DOC_KEYS = keysFromDoc();
const SETS: [string, CindiaEvent[]][] = [
  ["demo", demoTimeline.events],
  ["month", monthTimeline.events],
  ["scenarioReplies", scenarioReplies],
];

// IDs that data-model.md says live only in events, plus non-entity fields.
const EVENT_ONLY = /^(mv_|acct_|act_|ask_|scn_|evt_|d\d\d-)/;
const SKIP_FIELDS = new Set(["moveId", "actId", "accountId", "questionId", "beatId", "monthId", "intoMonthId", "scenarioId"]);

function entityIds(v: unknown, field = "", out: string[] = []): string[] {
  if (Array.isArray(v)) {
    for (const x of v) entityIds(x, field, out);
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      if (field === "reasons") out.push(k);
      entityIds(x, k, out);
    }
  } else if (typeof v === "string" && !SKIP_FIELDS.has(field) && (/Ids?$/.test(field) || field === "refId" || field === "by" || field === "id")) {
    out.push(v);
  }
  return out;
}

describe("events", () => {
  it("events.md was parsed", () => {
    expect(DOC_KEYS.size).toBe(59);
    expect(DOC_KEYS.get("match.made")).toBe("b01-match");
    expect(DOC_KEYS.get("concierge.asked")).toBeUndefined();
  });

  for (const [name, events] of SETS) {
    describe(name, () => {
      it("every event passes validateEvent()", () => {
        expect(events.length).toBeGreaterThan(0);
        expect(validateEvents(events)).toEqual([]);
        expect(events.every((e) => e.source === "scripted")).toBe(true);
      });

      it("IDs are unique and at never goes backwards", () => {
        expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
        for (let i = 1; i < events.length; i++) expect(events[i].at, events[i].id).toBeGreaterThanOrEqual(events[i - 1].at);
      });

      it("every entity ID in a payload resolves with getById()", () => {
        for (const e of events) {
          for (const id of entityIds(e.payload)) {
            if (EVENT_ONLY.test(id)) continue;
            expect(getById(id), `${e.id} ${e.type} ${id}`).toBeDefined();
          }
        }
      });

      if (name !== "scenarioReplies") {
        it("every key matches its type's key in events.md", () => {
          for (const e of events) expect(e.key, `${e.id} ${e.type}`).toBe(DOC_KEYS.get(e.type));
        });
      }
    });
  }

  it("scenario replies: record.arrived carries no key, matches and flags carry b05-scenario, and every scn_ ID resolves", () => {
    for (const e of scenarioReplies) expect(e.key).toBe(e.type === "record.arrived" ? undefined : "b05-scenario");
    for (const e of scenarioReplies) expect(e.at).toBeGreaterThanOrEqual(0);
    for (const id of sampleRecordIds) expect(id.startsWith("scn_")).toBe(true);
    for (const id of sampleRecordIds) expect(getById(id), id).toBeDefined();
    const arrived = scenarioReplies.filter((e) => e.type === "record.arrived").map((e) => (e.payload as { recordId: string }).recordId);
    expect(arrived.every((id) => sampleRecordIds.includes(id))).toBe(true);
    expect(scenarioReplies.filter((e) => e.type === "flag.raised")).toHaveLength(1);
  });

  it("canned answers cite records that exist", () => {
    expect(cannedAnswers.map((a) => a.questionId)).toEqual(["ask_01", "ask_02", "ask_03"]);
    expect(cannedAnswers[0].questions.zh).toBe("这个月哪件作品最赚钱?");
    expect(cannedAnswers[1].questions.en).toBe("Why did you flag the gallery payment?");
    expect(cannedAnswers[1].refIds).toEqual(["ctr_gallery_01", "stm_gallery_2026_09", "txn_026"]);
    for (const a of cannedAnswers) for (const id of a.refIds) expect(getById(id), `${a.questionId} ${id}`).toBeDefined();
    const chart = cannedAnswers[0].chart;
    expect(chart?.labels.length).toBe(chart?.series[0].valuesCents.length);
  });
});

const key = (e: CindiaEvent, shift: number) => `${e.type}|${e.at + shift}|${JSON.stringify(e.payload)}`;
const at = (type: string, pred: (p: Record<string, unknown>) => boolean = () => true) =>
  demoTimeline.events.filter((e) => e.type === type && pred(e.payload as Record<string, unknown>)).map((e) => e.at);

describe("the demo timeline", () => {
  const ev = demoTimeline.events;
  const of = (type: string) => ev.filter((e) => e.type === type);

  it("runs 60 seconds and numbers its events evt_0001 onward", () => {
    expect(demoTimeline.id).toBe("demo");
    expect(demoTimeline.durationMs).toBe(60000);
    expect(ev.map((e) => e.id)).toEqual(ev.map((_, i) => `evt_${String(i + 1).padStart(4, "0")}`));
    expect(ev.every((e) => e.at <= 60000)).toBe(true);
  });

  it("every beat in demo-script.md has its beat.started at its start time with its camera", () => {
    const beats = beatsFromDoc();
    expect(beats).toHaveLength(11);
    const started = of("beat.started").map((e) => {
      const p = e.payload as { beatId: string; camera: string };
      return [p.beatId, e.at, p.camera];
    });
    expect(started).toEqual(beats);
  });

  it("each beat's own events fire at the times the beat sheet gives", () => {
    const month = new Set(monthTimeline.events.map((e) => `${e.type}|${e.at + 20200}|${JSON.stringify(e.payload)}`));
    const own = ev.filter((e) => e.type !== "beat.started" && !month.has(`${e.type}|${e.at}|${JSON.stringify(e.payload)}`)).map((e) => `${e.at / 1000} ${e.type}`);
    expect(own).toEqual([
      "0.3 concierge.asked",
      "1.8 concierge.answered",
      "4.2 piece.opened",
      "8.3 split.shown",
      "11.3 checkout.started",
      "12.5 card.tokenized",
      "13.5 order.placed",
      "14 receipt.updated",
      "15.5 money.moved",
      "16.5 money.moved",
      "17.5 money.moved",
      "18.5 account.synced",
      "35.5 agent.acted",
      "35.7 followup.drafted",
      "36 approval.requested",
      "38.3 agent.acted",
      "38.6 approval.requested",
      "39.8 approval.granted",
      "40.3 followup.sent",
      "41 approval.granted",
      "41.6 payout.sent",
      "41.6 payout.sent",
      "41.6 payout.sent",
      "41.8 money.moved",
      "41.8 money.moved",
      "41.8 money.moved",
      "43.3 ledger.posted",
      "43.8 month.closed",
      "44.6 workbook.ready",
      "45.5 impact.updated",
      "47.4 statement.issued",
      "51 receipt.updated",
      "59 proof.scored",
    ]);
  });

  it("includes the whole month timeline shifted by 20200 ms", () => {
    expect(of("month.started").map((e) => e.at)).toEqual([20200]);
    const demoKeys = new Set(ev.map((e) => key(e, 0)));
    for (const e of monthTimeline.events) expect(demoKeys.has(key(e, 20200)), e.id).toBe(true);
  });

  it("September's records play from 20.4 to 29.6, with the three planted matches on screen by 29.6", () => {
    const records = of("record.arrived").filter((e) => e.at < 30000);
    expect(Math.min(...records.map((e) => e.at))).toBe(20400);
    const inMonth = ev.filter((e) => e.at > 20200 && e.at < 30000 && e.type !== "beat.started");
    expect(Math.max(...inMonth.map((e) => e.at))).toBeLessThanOrEqual(29600);
    const kinds = of("match.made").filter((e) => e.at <= 29600).map((e) => (e.payload as { kind: string }).kind);
    for (const k of ["bundled", "refund_netted", "carried_over"]) expect(kinds).toContain(k);
    expect(of("match.made").every((e) => e.at <= 29600)).toBe(true);
    // Dates arrive in order, the gallery's statement and deposit wait for the catch.
    const dates = records.map((e) => (e.payload as { date: string }).date);
    expect(dates).toEqual(dates.toSorted());
    const recIds = records.map((e) => (e.payload as { recordId: string }).recordId);
    expect(recIds).not.toContain("stm_gallery_2026_09");
    expect(recIds).not.toContain("txn_026");
  });

  it("the catch fires at its beat-sheet times", () => {
    expect(at("record.arrived", (p) => p.recordId === "stm_gallery_2026_09")).toEqual([30300]);
    expect(at("record.arrived", (p) => p.recordId === "txn_026")).toEqual([30800]);
    expect(at("flag.raised")).toEqual([31500]);
    expect(at("flag.explained")).toEqual([33000]);
    expect(of("flag.explained")[0].payload).toMatchObject({ flagId: "flg_01", trustRecordId: "ctr_gallery_01" });
  });

  it("money moves are mv_0001 to mv_0006 in firing order, with the beat sheet's amounts", () => {
    const moves = of("money.moved").map((e) => e.payload as { moveId: string; kind: string; amountCents: number; refId: string; date: string });
    expect(moves.map((m) => m.moveId)).toEqual(["mv_0001", "mv_0002", "mv_0003", "mv_0004", "mv_0005", "mv_0006"]);
    expect(moves.slice(0, 3).map((m) => [m.kind, m.amountCents, m.refId])).toEqual([
      ["sale", 18000, "ord_001"],
      ["fee", 552, "ord_001"],
      ["settlement", 15648, "pay_001"],
    ]);
    expect(moves.slice(3).map((m) => [m.kind, m.amountCents, m.refId, m.date])).toEqual(
      makerPayouts.map((mp) => ["maker_pay", mp.amountCents, mp.id, "2026-10-02"]),
    );
  });

  it("act_ IDs count up in firing order across both timelines", () => {
    const acts = of("agent.acted").map((e) => (e.payload as { actId: string }).actId);
    expect(acts).toEqual(acts.map((_, i) => `act_${String(i + 1).padStart(4, "0")}`));
    const monthActs = monthTimeline.events.filter((e) => e.type === "agent.acted").map((e) => (e.payload as { actId: string }).actId);
    expect(acts.slice(0, monthActs.length)).toEqual(monthActs);
  });

  it("the buyer's beats carry the query, the token and the receipts", () => {
    expect(of("concierge.asked")[0].payload).toEqual({ query: "a gift under $200 for my mom, she loves red wool", lang: "en" });
    expect(of("concierge.answered")[0].payload).toEqual({ query: "a gift under $200 for my mom, she loves red wool", pieceIds: curatedSet.pieceIds, reasons: curatedSet.reasons });
    expect(of("card.tokenized")[0].payload).toEqual({ token: "tok_7Q2M9X4KD1PA", brand: "visa", last4: "4242" });
    expect(of("order.placed")[0].payload).toEqual({ orderId: "ord_001", pieceId: "pc_01", channelId: "ch_cindia", buyerId: "buy_01", grossCents: 18000, date: "2026-09-01" });
    expect(of("approval.granted").map((e) => [e.at, e.payload])).toEqual([
      [39800, { approvalId: "apr_01", by: "own_01", date: "2026-10-01" }],
      [41000, { approvalId: "apr_02", by: "own_01", date: "2026-10-01" }],
    ]);
    expect(of("workbook.ready")[0].payload).toEqual({ monthId: "2026-09", fileName: "cindia-close-2026-09.xlsx", sheets: ["Ledger", "Reconciliation", "Profit and loss", "Makers"] });
  });

  it("each derived event's payload equals the record it comes from", () => {
    const o = getById<Order>("ord_001") as Order;
    expect(of("split.shown")[0].payload).toEqual({
      pieceId: o.pieceId,
      grossCents: o.grossCents,
      cardFeeCents: o.cardFeeCents,
      platformFeeCents: o.platformFeeCents,
      materialsCents: o.materialsCents,
      makerShareCents: o.makerShareCents,
    });
    expect(of("receipt.updated").map((e) => e.payload)).toEqual([
      { orderId: "ord_001", status: "received", makerId: "mkr_01", makerShareCents: o.makerShareCents },
      { orderId: "ord_001", status: "paid_to_maker", makerId: "mkr_01", makerShareCents: 13448, paidDate: "2026-10-02" },
    ]);
    const mst = makerStatements[0];
    expect(of("statement.issued")[0].payload).toEqual({
      makerStatementId: "mst_01",
      makerId: mst.makerId,
      lines: mst.lines,
      totalCents: mst.totalCents,
      heldCents: mst.heldCents,
      payoutDate: mst.payoutDate,
    });
    expect(of("statement.issued")[0].payload).toMatchObject({ heldCents: 9500, payoutDate: "2026-10-02" });
    expect(of("impact.updated")[0].payload).toEqual({
      impactId: impact.id,
      makerShareBps: impact.makerShareBps,
      daysCloseToPayout: 2,
      daysCloseToPayoutBefore: impact.daysCloseToPayoutBefore,
      bookkeepingHoursSaved: impact.bookkeepingHoursSaved,
      estimate: true,
    });
    expect(of("followup.drafted")[0].payload).toEqual({ followUpId: "fup_01", approvalId: "apr_01", to: followUp.to, subject: followUp.subject, body: followUp.body });
    expect(of("followup.drafted")[0].at).toBe(35700);
  });

  it("the follow-up names 40%, 50% and $340.00 in both languages", () => {
    for (const t of [followUp.body.en, followUp.body.zh]) {
      expect(t).toContain("40%");
      expect(t).toContain("50%");
      expect(t).toContain("$340.00");
    }
  });
});

describe("the month timeline", () => {
  it("starts with month.started at 0 and carries no money moves", () => {
    expect(monthTimeline.id).toBe("month");
    expect(monthTimeline.events[0]).toMatchObject({ type: "month.started", at: 0, payload: { monthId: "2026-09" } });
    expect(monthTimeline.events.some((e) => e.type === "money.moved")).toBe(false);
    expect(monthTimeline.events.every((e) => e.at <= monthTimeline.durationMs)).toBe(true);
  });
});
