// The tour's timeline (I2-tour T1) against docs/common/demo-script.md's `## Beats`: every event
// validates, the beat.started events match the beat table (each beat's first one at its start with
// its first camera, then each camera, process and drawer change at its time), the tour's own events
// land at the events table's times, v1's events keep their v1 payloads at their tour times, figures
// 11 to 14 and 16 come from S3's exports, the model's events play only with a report, the runs play
// inside their windows, and every key is events.md's but fup_02's.
import { describe, expect, it } from "vitest";
import type { CindiaEvent, EventType, Payloads } from "../../src/core/events";
import type { Order, ScriptedRun } from "../../src/core/types";
import { validateEvents } from "../../src/core/validate";
import {
  allApprovals,
  allFollowUps,
  answerKey,
  BEATS,
  counterfeitCandidates,
  demoContribution,
  demoDataSync,
  demoFundMoves,
  demoQuestions,
  demoSearch,
  demoSurprise,
  demoTimeline,
  followUp,
  gallerySplits,
  getById,
  impact,
  listings,
  MONTH_ACT_COUNT,
  MONTH_SHIFT_MS,
  makerPayouts,
  makerQuestions,
  makerStatements,
  monthTimeline,
  openingBalanceCents,
  report,
  scriptedScan,
  splits,
  swarmRuns,
} from "../../src/mock/index";
import { normalizeQuestion } from "../../src/sources/requests";

const docs = import.meta.glob<string>(["../../docs/common/events.md", "../../docs/common/demo-script.md"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const eventsMd = docs["../../docs/common/events.md"];
const demoMd = docs["../../docs/common/demo-script.md"];

const ms = (seconds: number | string) => Math.round(Number(seconds) * 1000);

// ---------------------------------------------------------------------------------------------
// demo-script.md's beat table.

interface DocBeat {
  beatId: string;
  start: number;
  end: number;
}
/** One beat.started as the beat table implies it. */
type Cue = [beatId: string, at: number, camera: string, process: string | null, drawer: string | null];

/** The lines of the `## Beats` section, up to the next `## ` heading, so `## v1 beats` stays out. */
function beatsSection(): string[] {
  const lines = demoMd.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === "## Beats");
  if (start === -1) throw new Error("demo-script.md has no ## Beats section");
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

/**
 * The beat table's rows, and every beat.started they imply: one at each beat's start with the first
 * camera in its Camera cell (and its drawer), then one at each camera, process or drawer change,
 * each carrying the whole state for its stretch (the camera and drawer of the latest Camera segment,
 * and the latest process).
 */
function beatTable(): { beats: DocBeat[]; cues: Cue[] } {
  const beats: DocBeat[] = [];
  const cues: Cue[] = [];
  for (const line of beatsSection()) {
    const cells = line.split("|").map((c) => c.trim());
    const id = /^`([pd]\d\d-[a-z-]+)`$/.exec(cells[1] ?? "");
    const time = /^([\d.]+) to ([\d.]+)$/.exec(cells[2] ?? "");
    if (!id || !time) continue;
    const beatId = id[1];
    const start = ms(time[1]);
    beats.push({ beatId, start, end: ms(time[2]) });
    const segments = cells[3].split(/,\s*then\s+/).map((seg) => {
      const m = /^`([a-z-]+)`(?:,\s*drawer `([a-z]+)`)?(?:\s+at ([\d.]+))?$/.exec(seg.trim());
      if (!m) throw new Error(`can't read ${beatId}'s Camera cell: ${seg}`);
      return { at: m[3] ? ms(m[3]) : start, camera: m[1], drawer: m[2] ?? null };
    });
    const processes = [...cells[4].matchAll(/`([a-z]+)` from ([\d.]+)/g)].map((m) => ({ at: ms(m[2]), process: m[1] }));
    const times = [...new Set([start, ...segments.map((s) => s.at), ...processes.map((p) => p.at)])].toSorted((a, b) => a - b);
    for (const t of times) {
      const seg = segments.filter((s) => s.at <= t).at(-1);
      const proc = processes.filter((p) => p.at <= t).at(-1);
      if (!seg) throw new Error(`${beatId} has a change before its first camera`);
      cues.push([beatId, t, seg.camera, proc?.process ?? null, seg.drawer]);
    }
  }
  return { beats, cues };
}

/** The Key column of every event table in events.md (as timelines.test.ts reads it). */
function keysFromDoc(): Map<string, string | undefined> {
  const out = new Map<string, string | undefined>();
  for (const line of eventsMd.split(/\r?\n/)) {
    const m = /^\|\s*`([a-z]+\.[a-z_]+)`\s*\|/.exec(line);
    if (!m) continue;
    const cells = line.replace(/\\\|/g, "").split("|").map((c) => c.trim());
    const k = /`(b\d\d-[a-z-]+)`/.exec(cells[cells.length - 2]);
    if (!out.has(m[1])) out.set(m[1], k ? k[1] : undefined);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The timeline.

const ev = demoTimeline.events;
const of = <T extends EventType>(type: T) => ev.filter((e) => e.type === type) as CindiaEvent<T>[];
const payloadsAt = (type: EventType, sec: number) => ev.filter((e) => e.type === type && e.at === ms(sec)).map((e) => e.payload);
const run = (runId: string) => swarmRuns.find((r) => r.runId === runId) as ScriptedRun;
const finalOf = <T extends EventType>(r: ScriptedRun, type: T, n = 0) => r.final.filter((f) => f.type === type)[n]?.payload as Payloads[T];

/** The ID an event's payload is about, for the events table's checks. */
function idOf(p: Record<string, unknown>): string | null {
  for (const f of ["queryId", "surpriseId", "contributionId", "moveId", "cftId", "followUpId", "approvalId", "questionId", "listingId", "scanId", "threadId"]) {
    if (typeof p[f] === "string") return p[f] as string;
  }
  return null;
}

/** A run's steps in the timeline, in order. */
const stepsOf = (runId: string) => of("swarm.step").filter((e) => e.payload.runId === runId);
/** Their agents, consecutive repeats collapsed, as the events table names them. */
const agents = (es: CindiaEvent<"swarm.step">[]) => es.map((e) => e.payload.agentId).filter((a, i, all) => a !== all[i - 1]);
/** A piece's point on the model's map. */
const pointOf = (id: string) => report?.points.find((p) => p.pieceId === id) ?? { x: 0, y: 0 };

describe("the tour: envelope", () => {
  it("validates, numbers its events evt_0001 onward, never goes backwards, ends by 220000 and stays under the log cap", () => {
    expect(demoTimeline.id).toBe("demo");
    expect(demoTimeline.durationMs).toBe(220000);
    expect(validateEvents(ev)).toEqual([]);
    expect(ev.every((e) => e.source === "scripted")).toBe(true);
    expect(ev.map((e) => e.id)).toEqual(ev.map((_, i) => `evt_${String(i + 1).padStart(4, "0")}`));
    for (let i = 1; i < ev.length; i++) expect(ev[i].at, ev[i].id).toBeGreaterThanOrEqual(ev[i - 1].at);
    expect(Math.max(...ev.map((e) => e.at))).toBeLessThanOrEqual(220000);
    expect(ev.length).toBeLessThan(400);
  });

  it("every key is its type's key in events.md, except fup_02's b15-watch, and only data.synced is keyed b13-live", () => {
    const keys = keysFromDoc();
    expect(keys.get("followup.drafted")).toBe("b02-explain");
    for (const e of ev) {
      const fup02 = e.type === "followup.drafted" && (e.payload as Payloads["followup.drafted"]).followUpId === "fup_02";
      expect(e.key, `${e.id} ${e.type}`).toBe(fup02 ? "b15-watch" : keys.get(e.type));
    }
    expect(ev.filter((e) => e.key === "b13-live").map((e) => e.type)).toEqual(["data.synced"]);
    expect(ev.filter((e) => e.key === "b16-bank-books")).toEqual([]);
  });
});

describe("the tour: beats", () => {
  const { beats, cues } = beatTable();

  it("demo-script.md's beat table has the 20 beats, back to back from 0 to durationMs", () => {
    expect(beats.map((b) => b.beatId)).toEqual([
      "p01-what",
      "p02-why",
      "p03-how",
      "d01-vibe",
      "d03-piece",
      "d04-support",
      "d05-pay",
      "d15-listing",
      "d06-money",
      "d07-month",
      "d08-catch",
      "d09-approve",
      "d10-close",
      "d11-maker",
      "d12-receipt",
      "d02-surprise",
      "d13-proof",
      "d14-watch",
      "d16-store",
      "d17-ask-maker",
    ]);
    expect(beats[0].start).toBe(0);
    for (let i = 1; i < beats.length; i++) expect(beats[i].start, beats[i].beatId).toBe(beats[i - 1].end);
    expect(beats.at(-1)?.end).toBe(demoTimeline.durationMs);
  });

  it("every beat.started matches the beat table: camera, process and drawer at each change", () => {
    const started: Cue[] = of("beat.started").map((e) => [e.payload.beatId, e.at, e.payload.camera, e.payload.process ?? null, e.payload.drawer ?? null]);
    expect(started).toEqual(cues);
  });

  it("each beat's first beat.started is at its start with its first camera, and BEATS lists them", () => {
    const first = of("beat.started").filter((e, i, all) => all.findIndex((x) => x.payload.beatId === e.payload.beatId) === i);
    expect(first.map((e) => [e.payload.beatId, e.at])).toEqual(beats.map((b) => [b.beatId, b.start]));
    expect(BEATS).toEqual(first.map((e) => [e.payload.beatId, e.at, e.payload.camera]));
  });

  it("no beat.started carries an empty process or drawer, and the pitch beats carry nothing else", () => {
    for (const e of of("beat.started")) {
      expect("process" in e.payload ? e.payload.process : "none", e.id).toBeTruthy();
      expect("drawer" in e.payload ? e.payload.drawer : "none", e.id).toBeTruthy();
    }
    expect(ev.filter((e) => e.at < 60000).map((e) => e.type)).toEqual(["beat.started", "beat.started", "beat.started"]);
    expect(ev.filter((e) => e.at >= 200000 && e.at < 205000).map((e) => e.type)).toEqual(["beat.started"]);
  });
});

describe("the tour: its own events at the events table's times", () => {
  type Row = [number, EventType, string | null];
  /** The model's events, only with a report. */
  const MODEL: Row[] = report
    ? [
        [60.2, "model.trained", null],
        [60.2, "proof.search_scored", null],
      ]
    : [];
  const MAP: Row[] = report ? [[66.0, "search.mapped", "qry_01"]] : [];
  /** Seconds, type and the ID the payload is about. */
  const TOUR: Row[] = [
    ...MODEL,
    [60.4, "search.queried", "qry_01"],
    [62.6, "search.answered", "qry_01"],
    ...MAP,
    [86.4, "support.asked", "thr_01"],
    [96.0, "support.answered", "thr_01"],
    [106.0, "project.funded", "ctb_01"],
    [120.3, "listing.requested", "lst_01"],
    [126.5, "listing.drafted", "lst_01"],
    [127.0, "listing.indexed", "lst_01"],
    [127.0, "data.synced", null],
    [128.0, "approval.requested", "apr_04"],
    [134.2, "money.moved", "mv_0101"],
    [134.8, "money.moved", "mv_0102"],
    [180.4, "surprise.asked", "srp_01"],
    [181.6, "surprise.drawn", "srp_01"],
    [192.3, "watch.started", "wsc_01"],
    [194.5, "watch.scanned", "wsc_01"],
    [195.0, "counterfeit.flagged", "cft_01"],
    [195.5, "followup.drafted", "fup_02"],
    [196.5, "approval.requested", "apr_03"],
    [205.4, "support.asked", "thr_03"],
    [211.6, "support.answered", "thr_03"],
    [211.9, "question.forwarded", "qst_01"],
    [213.5, "question.answered", "qst_01"],
    [216.7, "support.answered", "thr_03"],
  ];

  it("each lands at its time, and only there", () => {
    const groups = new Map<string, number[]>();
    for (const [s, type, id] of TOUR) {
      const k = `${type}|${id}`;
      groups.set(k, [...(groups.get(k) ?? []), ms(s)]);
    }
    for (const [k, times] of groups) {
      const [type, id] = k.split("|");
      const found = ev.filter((e) => e.type === type && (id === "null" || idOf(e.payload as Record<string, unknown>) === id)).map((e) => e.at);
      expect(found, k).toEqual(times);
    }
  });

  it("the model's events play exactly when model.ts holds a report", () => {
    const types = ["model.trained", "proof.search_scored", "search.mapped"] as const;
    if (report) {
      expect(payloadsAt("model.trained", 60.2)).toEqual([report.trained]);
      expect(payloadsAt("proof.search_scored", 60.2)).toEqual([report.scored]);
      for (const t of types) expect(of(t), t).toHaveLength(1);
      const mapped = of("search.mapped")[0].payload;
      expect(mapped).toMatchObject({ queryId: "qry_01", modelId: report.trained.modelId, method: "pca", approx: true });
      expect(mapped.points).toEqual(report.points.map((p) => ({ pieceId: p.pieceId, x: p.x, y: p.y })));
      // The query's dot: the score-weighted center of the top three results, as the responder places it.
      const top = demoSearch.answer.results.slice(0, 3);
      const w = top.reduce((a, r) => a + r.score, 0);
      expect(mapped.query.x).toBeCloseTo(top.reduce((a, r) => a + r.score * pointOf(r.pieceId).x, 0) / w, 10);
      expect(mapped.query.y).toBeCloseTo(top.reduce((a, r) => a + r.score * pointOf(r.pieceId).y, 0) / w, 10);
    } else {
      for (const t of types) expect(of(t), t).toEqual([]);
    }
  });

  it("the d04 question is the drawer's first, on pc_01, and run_01's trigger matches it", () => {
    const asked = payloadsAt("support.asked", 86.4)[0] as Payloads["support.asked"];
    expect(asked).toEqual({ threadId: "thr_01", side: "buyer", text: demoQuestions[0].text.en, lang: "en", contextIds: ["pc_01"] });
    expect(asked.text).toBe("Did the maker weave this herself? Can it arrive by October 10?");
    const r = run("run_01");
    expect(r.trigger.kind === "support" && r.trigger.matches.includes(normalizeQuestion(asked.text))).toBe(true);
    expect(payloadsAt("support.answered", 96.0)).toEqual([finalOf(r, "support.answered")]);
  });

  it("the listing beat plays lst_01, run_02's draft and index entry, the data snapshot and apr_04", () => {
    const lst = listings[0];
    expect(payloadsAt("listing.requested", 120.3)).toEqual([{ listingId: "lst_01", makerId: lst.makerId, notes: lst.notes, lang: lst.lang }]);
    const r = run("run_02");
    expect(payloadsAt("listing.drafted", 126.5)).toEqual([finalOf(r, "listing.drafted")]);
    const indexed = payloadsAt("listing.indexed", 127.0) as Payloads["listing.indexed"][];
    expect(indexed).toEqual([finalOf(r, "listing.indexed")]);
    expect(indexed[0]).toMatchObject({ listingId: "lst_01", pieceId: "pc_55", index: "cindia-drafts" });
    expect(payloadsAt("data.synced", 127.0)).toEqual([demoDataSync]);
    expect(payloadsAt("approval.requested", 128.0)).toEqual([{ approvalId: "apr_04" }]);
    expect(allApprovals.find((a) => a.id === "apr_04")).toMatchObject({ kind: "listing_publish", subjectIds: ["lst_01"] });
    // pc_55 is event-only until apr_04 is granted.
    expect(getById("pc_55")).toBeUndefined();
  });

  it("the watch beat plays the scan of Grace N., cft_01, fup_02 keyed b15-watch and apr_03", () => {
    expect(payloadsAt("watch.started", 192.3)).toEqual([{ scanId: "wsc_01", makerId: scriptedScan.makerId, queries: scriptedScan.queries }]);
    expect(payloadsAt("watch.scanned", 194.5)).toEqual([
      {
        scanId: "wsc_01",
        engine: "scripted",
        candidates: counterfeitCandidates.length,
        results: counterfeitCandidates.map((c) => ({ title: c.title, url: c.url, snippet: c.snippet, similarity: c.similarity, verdict: c.verdict })),
      },
    ]);
    expect(scriptedScan.cftIds).toEqual(["cft_01"]);
    const fup = allFollowUps.find((f) => f.id === "fup_02");
    expect(fup).toBeDefined();
    const drafted = ev.filter((e) => e.type === "followup.drafted" && e.at === ms(195.5));
    expect(drafted.map((e) => [e.key, e.payload])).toEqual([["b15-watch", { followUpId: "fup_02", approvalId: "apr_03", to: fup?.to, subject: fup?.subject, body: fup?.body }]]);
    expect(payloadsAt("approval.requested", 196.5)).toEqual([{ approvalId: "apr_03" }]);
    expect(allApprovals.find((a) => a.id === "apr_03")).toMatchObject({ kind: "report_listing", subjectIds: ["cft_01"] });
  });

  it("the ask-the-maker beat plays the meaning question, run_07's reply and forward, Grace N.'s answer and run_09's relay", () => {
    const asked = payloadsAt("support.asked", 205.4)[0] as Payloads["support.asked"];
    expect(asked).toEqual({ threadId: "thr_03", side: "buyer", text: demoQuestions[1].text.en, lang: "en", contextIds: ["pc_01"] });
    expect(asked.text).toBe("What does the pattern on this weaving mean?");
    const r07 = run("run_07");
    expect(r07.trigger.kind === "support" && r07.trigger.matches.includes(normalizeQuestion(asked.text))).toBe(true);
    expect(payloadsAt("support.answered", 211.6)).toEqual([finalOf(r07, "support.answered")]);
    const forwarded = payloadsAt("question.forwarded", 211.9) as Payloads["question.forwarded"][];
    expect(forwarded).toEqual([finalOf(r07, "question.forwarded")]);
    expect(forwarded[0]).toMatchObject({ questionId: "qst_01", threadId: "thr_03", makerId: "mkr_01", pieceId: "pc_01", text: asked.text });
    const answer = makerQuestions[0].answer;
    expect(payloadsAt("question.answered", 213.5)).toEqual([answer]);
    expect(answer).toMatchObject({ questionId: "qst_01", answerId: "ans_01", makerId: "mkr_01" });
    const relayed = payloadsAt("support.answered", 216.7) as Payloads["support.answered"][];
    expect(relayed).toEqual([finalOf(run("run_09"), "support.answered")]);
    expect(relayed[0]).toMatchObject({ threadId: "thr_03", runId: "run_09" });
    expect(relayed[0].reply.en).toContain(answer.text);
  });
});

describe("the tour: the runs play in their windows, in S3's order", () => {
  for (const [runId, from, to] of [
    ["run_01", 87.6, 95.5],
    ["run_02", 121.0, 126.0],
    ["run_07", 206.6, 211.0],
    ["run_09", 215.4, 216.0],
  ] as const) {
    it(`${runId}: its first step at ${from} s, each step's ms the gap to the next, all inside ${from} to ${to} s`, () => {
      const r = run(runId);
      const es = stepsOf(runId);
      expect(es.map((e) => e.payload)).toEqual(r.steps.map((s) => ({ ...s, threadId: r.threadId })));
      expect(es[0].at).toBe(ms(from));
      for (let i = 1; i < es.length; i++) expect(es[i].at - es[i - 1].at, es[i].payload.stepId).toBe(r.steps[i - 1].ms);
      expect(es.every((e) => e.at >= ms(from) && e.at <= ms(to))).toBe(true);
    });
  }

  it("run_01 is cindy, intake, cindy, steward with its check step, clerk, writer", () => {
    const es = stepsOf("run_01");
    expect(agents(es)).toEqual(["cindy", "intake", "cindy", "steward", "clerk", "writer"]);
    expect(es.filter((e) => e.payload.kind === "check").map((e) => e.payload.agentId)).toEqual(["steward"]);
  });

  it("run_02 is cindy, lister, tagger, the three checker checks and the indexer, then the draft, the index entry, the snapshot, the data view and apr_04, in that order", () => {
    const es = stepsOf("run_02");
    expect(agents(es)).toEqual(["cindy", "lister", "tagger", "checker", "indexer"]);
    expect(es.filter((e) => e.payload.agentId === "checker").map((e) => e.payload.kind)).toEqual(["check", "check", "check"]);
    const pos = (pred: (e: CindiaEvent) => boolean) => ev.findIndex(pred);
    const order = [
      ev.indexOf(es[es.length - 1]),
      pos((e) => e.type === "listing.drafted" && (e.payload as Payloads["listing.drafted"]).listingId === "lst_01"),
      pos((e) => e.type === "listing.indexed"),
      pos((e) => e.type === "data.synced"),
      pos((e) => e.type === "beat.started" && (e.payload as Payloads["beat.started"]).process === "data"),
      pos((e) => e.type === "approval.requested" && (e.payload as Payloads["approval.requested"]).approvalId === "apr_04"),
    ];
    expect(order.every((p) => p >= 0)).toBe(true);
    expect(order).toEqual(order.toSorted((a, b) => a - b));
    expect(new Set(order).size).toBe(order.length);
  });

  it("run_07 is cindy, intake, cindy, the steward's two tools, result and check, then the writer, and run_09 is cindy and the writer", () => {
    const es = stepsOf("run_07");
    expect(agents(es)).toEqual(["cindy", "intake", "cindy", "steward", "writer"]);
    expect(es.filter((e) => e.payload.agentId === "steward").map((e) => e.payload.kind)).toEqual(["tool", "tool", "result", "check"]);
    expect(stepsOf("run_09").map((e) => e.payload.agentId)).toEqual(["cindy", "writer"]);
  });

  it("no other run plays in the tour", () => {
    expect([...new Set(of("swarm.step").map((e) => e.payload.runId))]).toEqual(["run_01", "run_02", "run_07", "run_09"]);
  });
});

describe("the tour: v1's events keep their payloads at their tour times", () => {
  const o = getById<Order>("ord_001") as Order;
  const PAY = 93;
  const MONEY = 115;
  const MONTH = 116;
  const CLOSE = 118;
  const STATEMENT = 119;
  const RECEIPT = 122;
  const v1Split = {
    pieceId: "pc_01",
    grossCents: o.grossCents,
    cardFeeCents: o.cardFeeCents,
    platformFeeCents: o.platformFeeCents,
    materialsCents: o.materialsCents,
    makerShareCents: o.makerShareCents,
  };
  const mst = makerStatements[0];
  /** v1's type, v1's time and tour time in seconds, and the payload (the two changes marked). */
  const V1: [EventType, number, number, unknown][] = [
    ["piece.opened", 4.2, 74.3, { pieceId: "pc_01" }],
    ["split.shown", 8.3, 76.5, { ...v1Split, compare: gallerySplits.pc_01 }],
    ["checkout.started", 11.3, 11.3 + PAY, { pieceId: "pc_01", grossCents: 18000 }],
    ["card.tokenized", 12.5, 12.5 + PAY, { token: "tok_7Q2M9X4KD1PA", brand: "visa", last4: "4242", pieceId: "pc_01" }],
    ["order.placed", 13.5, 13.5 + PAY, { orderId: "ord_001", pieceId: "pc_01", channelId: "ch_cindia", buyerId: "buy_01", grossCents: 18000, date: "2026-09-01" }],
    ["receipt.updated", 14.0, 14.0 + PAY, { orderId: "ord_001", status: "received", makerId: "mkr_01", makerShareCents: 13448 }],
    ["money.moved", 15.5, 15.5 + MONEY, { moveId: "mv_0001", kind: "sale", from: { kind: "buyer", id: "buy_01" }, to: { kind: "cindia" }, amountCents: 18000, refId: "ord_001", date: "2026-09-01" }],
    ["money.moved", 16.5, 16.5 + MONEY, { moveId: "mv_0002", kind: "fee", from: { kind: "cindia" }, to: { kind: "card_network" }, amountCents: 552, refId: "ord_001", date: "2026-09-01" }],
    ["money.moved", 17.5, 17.5 + MONEY, { moveId: "mv_0003", kind: "settlement", from: { kind: "cindia" }, to: { kind: "studio", id: "std_dine" }, amountCents: 15648, refId: "pay_001", date: "2026-09-01" }],
    ["account.synced", 18.5, 18.5 + MONEY, { accountId: "acct_studio", balanceCents: openingBalanceCents + 15648, asOf: "2026-09-01" }],
    ["followup.drafted", 35.7, 35.7 + MONTH, { followUpId: "fup_01", approvalId: "apr_01", to: followUp.to, subject: followUp.subject, body: followUp.body }],
    ["approval.requested", 36.0, 36.0 + MONTH, { approvalId: "apr_01" }],
    ["approval.requested", 38.6, 38.6 + MONTH, { approvalId: "apr_02" }],
    ["approval.granted", 39.8, 39.8 + MONTH, { approvalId: "apr_01", by: "own_01", date: "2026-10-01" }],
    ["followup.sent", 40.3, 40.3 + MONTH, { followUpId: "fup_01", approvalId: "apr_01" }],
    ["approval.granted", 41.0, 41.0 + MONTH, { approvalId: "apr_02", by: "own_01", date: "2026-10-01" }],
    ...makerPayouts.map((m): [EventType, number, number, unknown] => ["payout.sent", 41.6, 41.6 + MONTH, { makerPayoutId: m.id, makerId: m.makerId, amountCents: m.amountCents, date: "2026-10-02" }]),
    ...makerPayouts.map((m, i): [EventType, number, number, unknown] => [
      "money.moved",
      41.8,
      41.8 + MONTH,
      { moveId: `mv_000${4 + i}`, kind: "maker_pay", from: { kind: "studio", id: "std_dine" }, to: { kind: "maker", id: m.makerId }, amountCents: m.amountCents, refId: m.id, date: "2026-10-02" },
    ]),
    ["workbook.ready", 44.6, 44.6 + CLOSE, { monthId: "2026-09", fileName: "cindia-close-2026-09.xlsx", sheets: ["Ledger", "Reconciliation", "Profit and loss", "Makers"] }],
    [
      "impact.updated",
      45.5,
      45.5 + CLOSE,
      {
        impactId: impact.id,
        makerShareBps: impact.makerShareBps,
        daysCloseToPayout: impact.daysCloseToPayout,
        daysCloseToPayoutBefore: impact.daysCloseToPayoutBefore,
        bookkeepingHoursSaved: impact.bookkeepingHoursSaved,
        estimate: true,
      },
    ],
    ["statement.issued", 47.4, 47.4 + STATEMENT, { makerStatementId: "mst_01", makerId: mst.makerId, lines: mst.lines, totalCents: mst.totalCents, heldCents: 9500, payoutDate: "2026-10-02" }],
    ["receipt.updated", 51.0, 51.0 + RECEIPT, { orderId: "ord_001", status: "paid_to_maker", makerId: "mkr_01", makerShareCents: 13448, paidDate: "2026-10-02" }],
    ["proof.scored", 59.0, 179.0, { caught: 4, total: 4, results: answerKey.map((e) => ({ errorId: e.id, caught: true })) }],
  ];

  for (const [type, v1At, tourAt, payload] of V1) {
    it(`${type} from ${v1At} s plays at ${Number(tourAt.toFixed(1))} s with its v1 payload`, () => {
      expect(payloadsAt(type, Number(tourAt.toFixed(1)))).toContainEqual(payload);
    });
  }

  it("Cindy's draft and proposal lines move +116.0 s and keep their act_ numbers after the month's", () => {
    expect(payloadsAt("agent.acted", 151.5)).toEqual([
      expect.objectContaining({ actId: `act_${String(MONTH_ACT_COUNT + 1).padStart(4, "0")}`, kind: "draft", refId: "fup_01" }),
    ]);
    expect(payloadsAt("agent.acted", 154.3)).toEqual([
      expect.objectContaining({ actId: `act_${String(MONTH_ACT_COUNT + 2).padStart(4, "0")}`, kind: "propose", refId: "apr_02" }),
    ]);
  });

  it("the closing ledger.posted and month.closed move +118.0 s", () => {
    expect(of("ledger.posted").filter((e) => e.at === ms(43.3 + CLOSE))).toHaveLength(1);
    expect(payloadsAt("month.closed", 43.8 + CLOSE)).toEqual([expect.objectContaining({ monthId: "2026-09", heldCents: 34000 })]);
  });

  it("the month and the catch move +116.0 s: MONTH_SHIFT_MS is v1's 20200 plus 116000", () => {
    expect(MONTH_SHIFT_MS).toBe(20200 + 116000);
    const tour = new Set(ev.map((e) => `${e.type}|${e.at}|${JSON.stringify(e.payload)}`));
    for (const e of monthTimeline.events) expect(tour.has(`${e.type}|${e.at + MONTH_SHIFT_MS}|${JSON.stringify(e.payload)}`), e.id).toBe(true);
  });

  it("v1's concierge isn't in the tour", () => {
    expect(of("concierge.asked")).toEqual([]);
    expect(of("concierge.answered")).toEqual([]);
  });
});

describe("the tour: figures 11 to 14 and 16", () => {
  it("11. d01's search.queried qry_01 is figure 11's query, and search.answered its six results", () => {
    expect(payloadsAt("search.queried", 60.4)).toEqual([{ queryId: "qry_01", ...demoSearch.query }]);
    const q = of("search.queried")[0].payload;
    expect(q.text).toBe("a warm, bold gift for my mom. she loves red wool. under $200");
    expect(q.keywords).toEqual(["warm", "bold", "red", "wool", "gift for mom", "under $200"]);
    expect(of("search.queried")).toHaveLength(1);
    const a = payloadsAt("search.answered", 62.6) as Payloads["search.answered"][];
    expect(a).toEqual([{ queryId: "qry_01", ...demoSearch.answer }]);
    expect(a[0].results.map((r) => r.pieceId)).toEqual(["pc_01", "pc_07", "pc_11", "pc_14", "pc_30", "pc_43"]);
  });

  it("12. d02's surprise srp_01 is figure 12's draw of pc_38", () => {
    expect(payloadsAt("surprise.asked", 180.4)).toEqual([{ surpriseId: "srp_01", ...demoSurprise.ask }]);
    const d = payloadsAt("surprise.drawn", 181.6) as Payloads["surprise.drawn"][];
    expect(d).toEqual([{ surpriseId: "srp_01", ...demoSurprise.draw }]);
    expect(d[0]).toMatchObject({ pieceId: "pc_38", method: "fair_random", seed: 10 });
  });

  it("13. the project add-on: project.funded ctb_01, mv_0101 and mv_0102 equal demoContribution and demoFundMoves", () => {
    expect(payloadsAt("project.funded", 106.0)).toEqual([demoContribution]);
    expect(of("project.funded")).toHaveLength(1);
    expect(payloadsAt("money.moved", 134.2)).toEqual([demoFundMoves[0]]);
    expect(payloadsAt("money.moved", 134.8)).toEqual([demoFundMoves[1]]);
    for (const m of [demoFundMoves[0], demoFundMoves[1]]) expect(m).toMatchObject({ refId: "ctb_01", date: "2026-09-01", amountCents: 500 });
  });

  it("14. counterfeit.flagged cft_01 equals the candidate, its similarity read from counterfeitCandidates", () => {
    const c = counterfeitCandidates.find((x) => x.id === "cft_01");
    expect(c).toBeDefined();
    expect(payloadsAt("counterfeit.flagged", 195.0)).toEqual([
      { cftId: "cft_01", scanId: "wsc_01", pieceId: c?.pieceId, url: c?.url, title: c?.title, snippet: c?.snippet, similarity: c?.similarity, claim: c?.claim },
    ]);
    expect(c).toMatchObject({ pieceId: "pc_01", verdict: "possible_copy" });
    expect(of("counterfeit.flagged")).toHaveLength(1);
  });

  it("16. d03's split.shown equals splits.pc_01, figure 1's numbers with figure 16's gallery compare", () => {
    expect(payloadsAt("split.shown", 76.5)).toEqual([splits.pc_01]);
    expect(of("split.shown")).toHaveLength(1);
    expect(splits.pc_01).toEqual({
      pieceId: "pc_01",
      grossCents: 18000,
      cardFeeCents: 552,
      platformFeeCents: 1800,
      materialsCents: 2200,
      makerShareCents: 13448,
      compare: { channelId: "ch_gallery", commissionBps: 4000, makerShareCents: 8600 },
    });
  });
});
