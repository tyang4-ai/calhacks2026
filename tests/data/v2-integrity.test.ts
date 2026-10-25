// S3-catalog T8: the dataset's integrity. IDs are unique, well formed and resolve; the lookups hold
// every approval and follow-up; the scripted runs use the roster as it allows and fit the tour's
// windows; every scripted event validates; the runs say what the plan says; and src/mock/ holds no
// kept-out, stereotype or meaning word outside the allowed fields, no URL off the sandbox market or
// the example hosts, no old or dropped name, and no randomness or wall-clock read.
import { describe, expect, it } from "vitest";
import type { CindiaEvent, EventType, Payloads } from "../../src/core/events";
import type { Approval, FollowUp, Person, Piece, PlannedEvent, ScriptedRun, Text } from "../../src/core/types";
import { validateEvent } from "../../src/core/validate";
import * as mock from "../../src/mock/index";
import {
  agents,
  allApprovals,
  allFollowUps,
  allIds,
  allMakers,
  communities,
  contentRules,
  counterfeitCandidates,
  demoContribution,
  demoDataSync,
  demoFundMoves,
  demoQuestions,
  demoSearch,
  demoSurprise,
  fallbackListingRun,
  fallbackSupportRun,
  galleryFlag,
  gallerySplits,
  getAgent,
  getById,
  keywordAliases,
  leads,
  listings,
  makerPayouts,
  makerQuestions,
  makerStatements,
  modelId,
  orders,
  owner,
  pieces,
  policy,
  projects,
  scriptedScan,
  searchEval,
  searchIndex,
  splits,
  storefronts,
  swarmRuns,
  vibeVocabulary,
  worksInProgress,
} from "../../src/mock/index";
import { mockAnswers } from "../../src/sources/mockAnswers";
import { normalizeQuestion, scriptedAnswer } from "../../src/sources/requests";
import { planRun } from "../../src/sources/scriptedSwarm";
import { scan, strings, wordHits } from "./v2-helpers";

const BAD = [...contentRules.bannedObjects, ...contentRules.stereotypeWords, ...contentRules.meaningWords];
const PEOPLE = Object.values(contentRules.peopleNames).flat();
const run = (id: string) => swarmRuns.find((r) => r.runId === id) as ScriptedRun;
const piece = (id: string) => getById<Piece>(id) as Piece;
const finals = <T extends EventType>(r: ScriptedRun, type: T) =>
  r.final.filter((f): f is Extract<PlannedEvent, { type: T }> => f.type === type).map((f) => f.payload as Payloads[T]);
const reply = (id: string) => finals(run(id), "support.answered")[0];
const steps = swarmRuns.flatMap((r) => r.steps);

/** IDs that live only in events (data-model.md, the ID scheme), or are a record's own parts. */
const EVENT_ONLY = /^(?:mv|chk|stp|ans|blk|thr|qry|srp|wsc|ctb|scr|act|evt|ask|acct)_/;
/** The run and eval IDs, records of their own files that getById() doesn't index. */
const OWN = new Set([...swarmRuns.map((r) => r.runId), ...searchEval.map((q) => q.id)]);
const resolves = (id: string) => getById(id) !== undefined || getAgent(id) !== undefined || OWN.has(id) || EVENT_ONLY.test(id) || id === "pc_55";

/** Every collection's own IDs, with the formats data-model.md gives. */
const FORMATS: RegExp[] = [
  /^std_dine$/,
  /^com_(?:dine|ojibwe|acoma|seminole)$/,
  /^own_0[1-4]$/,
  /^mkr_(?:0[1-9]|1[0-7])$/,
  /^buy_(?:0[1-9]|1\d|20)$/,
  /^pc_(?:0[1-9]|[1-4]\d|5[0-4])$/,
  /^ch_(?:cindia|site|gallery)$/,
  /^ctr_gallery_01$/,
  /^(?:ord|pay|rfd|pur|txn|mat)_\d{3}$/,
  /^stm_gallery_2026_09$/,
  /^flg_01$/,
  /^mpo_0[1-3]$/,
  /^mst_0[1-3]$/,
  /^apr_0[1-5]$/,
  /^fup_0[12]$/,
  /^led_\d{4}$/,
  /^err_0[1-4]$/,
  /^imp_2026_09$/,
  /^(?:stm_)?scn_[a-z0-9_]+$/,
  /^prj_0[1-4]$/,
  /^wip_0[1-3]$/,
  /^mls_\d{2}$/,
  /^sto_0[1-4]$/,
  /^lst_01$/,
  /^cft_0[1-4]$/,
  /^pol_0[1-5]$/,
  /^qst_\d{2}$/,
  /^sq_\d{3}$/,
  /^run_(?:0[1-9]|10)$/,
  /^stp_\d{4}$/,
  /^chk_\d{2}$/,
  /^blk_\d{2}$/,
];

/**
 * The keys whose values name records: id, every *Id and *Ids, and approvedBy. A month, a process and
 * the model are named by their own IDs, not records (run_02's test checks the model's).
 */
const SKIP_KEYS = new Set(["monthId", "intoMonthId", "processId", "modelId"]);
const isIdKey = (k: string) => !SKIP_KEYS.has(k) && (k === "id" || k === "approvedBy" || /[a-z](?:Id|Ids)$/.test(k));

/** Every [path, id] a value names through its ID keys, and the keys of its records by pieceId. */
function references(value: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (Array.isArray(value)) value.forEach((v, i) => references(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (isIdKey(k)) {
        for (const id of typeof v === "string" ? [v] : Array.isArray(v) ? v.filter((x) => typeof x === "string") : []) out.push([`${path}.${k}`, id]);
      }
      references(v, `${path}.${k}`, out);
    }
  }
  return out;
}

/** The ms of a run's first n steps. */
const sumMs = (r: ScriptedRun, n: number) => r.steps.slice(0, n).reduce((t, s) => t + s.ms, 0);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Sep 4" for a fixed ISO date plus some days, computed with a fixed UTC date (tests only). */
function day(iso: string, plus: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + plus);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** A passage part, left out with its label when the list is empty. */
const list = (label: string, xs: string[]) => (xs.length > 0 ? [`${label}: ${xs.join(", ")}`] : []);
/** The text up to and including the first ". ", "! " or "? ", trimmed. */
function firstSentence(t: string): string {
  const m = /[.!?] /.exec(t);
  return (m ? t.slice(0, m.index + 1) : t).trim();
}

/** Every facet and vibe word a piece carries. */
const wordsOf = (p: Piece) =>
  new Set([p.facets.object.en, ...p.facets.materials, ...p.facets.techniques, ...p.facets.motifs, ...p.facets.colors, ...p.vibe.moods, ...p.vibe.occasions, ...p.vibe.recipients]);

/** A URL's host, lowercase, or "" for a relative path. */
const host = (url: string) => /^(?:https?:)?\/\/([^/:?#]+)/i.exec(url)?.[1]?.toLowerCase() ?? "";
const allowedHost = (h: string) => contentRules.allowedHosts.some((a) => h === a || h.endsWith(`.${a}`));

/** Strips the "·" that keeps a name out of a grep over tests/. */
const unmark = (s: string) => s.replaceAll("·", "");

/** An event as the player or the responder would carry it. */
const envelope = (type: EventType, payload: unknown, n: number): CindiaEvent => ({ id: `evt_${String(n).padStart(4, "0")}`, type, at: 0, source: "scripted", payload }) as CindiaEvent;

/** A run's events: its steps on its thread, then its final events. */
function runEvents(r: ScriptedRun): CindiaEvent[] {
  return [
    ...r.steps.map((s, i) => envelope("swarm.step", { ...s, threadId: r.threadId }, i + 1)),
    ...r.final.map((f, i) => envelope(f.type, f.payload, r.steps.length + i + 1)),
  ];
}

/** Numbers for a scripted answer to a person, per prefix, as answerId() hands them out. */
function idsFor(): (prefix: string) => string {
  const next = new Map<string, number>();
  return (prefix) => {
    const n = (next.get(prefix) ?? 0) + 1;
    next.set(prefix, n);
    return `${prefix}_user_${n}`;
  };
}

/** The scripted responder's answer to a person's request, with the real mock data. */
function answer(type: EventType, payload: unknown): CindiaEvent[] {
  const req = { id: "evt_user_0001", type, at: 0, source: "user", payload } as CindiaEvent;
  return scriptedAnswer(req, mockAnswers(), "b14-swarm", { ids: idsFor() }).map((p) => p.event);
}

describe("IDs", () => {
  const own = [...allIds(), ...searchEval.map((q) => q.id), ...swarmRuns.map((r) => r.runId), ...steps.map((s) => s.stepId)];
  const checkIds = swarmRuns.flatMap((r) => finals(r, "listing.drafted").flatMap((d) => d.checks.map((c) => c.checkId)));
  const blockIds = [...storefronts.flatMap((s) => s.blocks.map((b) => b.blockId)), ...swarmRuns.flatMap((r) => finals(r, "storefront.drafted").flatMap((d) => d.blocks.map((b) => b.blockId)))];

  it("are unique across every collection, and every one matches its format", () => {
    const every = [...own, ...checkIds, ...blockIds];
    const seen = new Set<string>();
    const dupes = every.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(dupes).toEqual([]);
    expect(every.filter((id) => !FORMATS.some((f) => f.test(id)))).toEqual([]);
    // Agents have no prefix, and their IDs are unique too.
    expect(new Set(agents.map((a) => a.agentId)).size).toBe(agents.length);
    expect(agents.filter((a) => !/^[a-z]+$/.test(a.agentId)).map((a) => a.agentId)).toEqual([]);
  });

  it("number the steps stp_0001 onward, the checks chk_01 onward and the drafted blocks after the storefronts'", () => {
    expect(steps.map((s) => s.stepId)).toEqual(steps.map((_, i) => `stp_${String(i + 1).padStart(4, "0")}`));
    expect(checkIds).toEqual(checkIds.map((_, i) => `chk_${String(i + 1).padStart(2, "0")}`));
    expect(blockIds).toEqual(blockIds.map((_, i) => `blk_${String(i + 1).padStart(2, "0")}`));
  });

  it("every ID a record, a run, the scan, the question or the snapshot names resolves", () => {
    const sources: Record<string, unknown> = {
      communities,
      people: mock.people,
      pieces,
      searchIndex,
      projects,
      worksInProgress,
      demoContribution,
      demoFundMoves,
      storefronts,
      listings,
      swarmRuns,
      makerQuestions,
      counterfeitCandidates,
      scriptedScan,
      policy,
      splits: Object.values(splits),
      gallerySplits,
      allApprovals,
      allFollowUps,
      demoSearch,
      demoSurprise,
      // The processes table's rows are process names, not records.
      demoDataSync: { ...demoDataSync, tables: demoDataSync.tables.filter((t) => t.table !== "processes") },
      orders,
      payouts: mock.payouts,
      refunds: mock.refunds,
      statements: mock.statements,
      bankTxns: mock.bankTxns,
      matches: mock.matches,
      flags: mock.flags,
      makerPayouts,
      makerStatements,
      ledger: mock.ledger,
      answerKey: mock.answerKey,
      purchases: mock.purchases,
    };
    const refs = Object.entries(sources).flatMap(([name, v]) => references(v, name));
    expect(refs.length).toBeGreaterThan(1000);
    // The records keyed by pieceId, and the pieces each eval query grades.
    const keyed = [...Object.keys(splits), ...Object.keys(gallerySplits), ...searchEval.flatMap((q) => Object.keys(q.grades))];
    expect(refs.filter(([, id]) => !resolves(id))).toEqual([]);
    expect(keyed.filter((id) => getById<Piece>(id) === undefined)).toEqual([]);
    // Every agent a step names is in the roster.
    expect(steps.filter((s) => getAgent(s.agentId) === undefined).map((s) => s.stepId)).toEqual([]);
    // The snapshot's newest rows name records too, apart from the process names.
    const newest = demoDataSync.tables.filter((t) => t.table !== "processes").flatMap((t) => t.newest.map((n) => n.id));
    expect(newest.filter((id) => !resolves(id))).toEqual([]);
  });
});

describe("the lookups", () => {
  it("allApprovals holds apr_01 to apr_05 and allFollowUps fup_01 and fup_02, in ID order, each the record getById() finds", () => {
    expect(allApprovals.map((a) => a.id)).toEqual(["apr_01", "apr_02", "apr_03", "apr_04", "apr_05"]);
    expect(allFollowUps.map((f) => f.id)).toEqual(["fup_01", "fup_02"]);
    for (const a of allApprovals) expect(getById<Approval>(a.id), a.id).toBe(a);
    for (const f of allFollowUps) expect(getById<FollowUp>(f.id), f.id).toBe(f);
    expect(allFollowUps[1].approvalId).toBe("apr_03");
  });

  it("getById() finds every new collection's records and qst_01, and an unknown ID gives undefined", () => {
    const fresh = [
      ...communities,
      ...leads,
      ...allMakers,
      ...projects,
      ...worksInProgress,
      ...storefronts,
      ...listings,
      ...counterfeitCandidates,
      ...policy,
      ...makerQuestions.map((q) => q.question),
    ];
    for (const r of fresh) expect(getById(r.id), r.id).toBe(r);
    for (const w of worksInProgress) for (const m of w.milestones) expect(getById(m.milestoneId), m.milestoneId).toMatchObject(m);
    expect(getById("qst_01")).toEqual(makerQuestions[0].question);
    expect(getById("nope_01")).toBeUndefined();
  });
});

describe("the scripted runs", () => {
  it("are the ten of the runs table, with their threads, sides, triggers and final events in order", () => {
    const table: [string, string, string, string, string[]][] = [
      ["run_01", "thr_01", "buyer", "support", ["support.answered"]],
      ["run_02", "lst_01", "seller", "listing", ["listing.drafted", "listing.indexed", "approval.requested"]],
      ["run_03", "sto_01", "seller", "storefront", ["storefront.drafted"]],
      ["run_04", "thr_02", "seller", "support", ["support.answered"]],
      ["run_05", "thr_00", "buyer", "fallback", ["support.answered"]],
      ["run_06", "thr_00", "seller", "fallback", ["listing.drafted"]],
      ["run_07", "thr_03", "buyer", "support", ["support.answered", "question.forwarded"]],
      ["run_08", "thr_04", "buyer", "support", ["support.answered"]],
      ["run_09", "thr_03", "buyer", "question", ["support.answered"]],
      ["run_10", "thr_05", "seller", "support", ["support.answered"]],
    ];
    expect(swarmRuns.map((r) => [r.runId, r.threadId, r.side, r.trigger.kind, r.final.map((f) => f.type)])).toEqual(table);
    expect(run("run_01").trigger).toMatchObject({ pieceId: "pc_01" });
    expect(run("run_07").trigger).toMatchObject({ pieceId: "pc_01" });
    expect(run("run_08").trigger).toMatchObject({ pieceId: "pc_01" });
    expect(run("run_04").trigger).toMatchObject({ makerId: "mkr_01" });
    expect(run("run_10").trigger).toMatchObject({ makerId: "mkr_01" });
    expect(run("run_02").trigger).toEqual({ kind: "listing", listingId: "lst_01", notes: listings[0].notes });
    expect(run("run_03").trigger).toEqual({ kind: "storefront", storefrontId: "sto_01" });
    expect(run("run_09").trigger).toEqual({ kind: "question", questionId: "qst_01" });
    expect(fallbackSupportRun).toBe(run("run_05"));
    expect(fallbackListingRun).toBe(run("run_06"));
  });

  it("use roster agents and only the tools each is allowed, arrival_window aside, with the roster's models", () => {
    for (const r of swarmRuns) {
      for (const s of r.steps) {
        const agent = getAgent(s.agentId);
        expect(agent, s.stepId).toBeDefined();
        expect(s.runId, s.stepId).toBe(r.runId);
        expect(s.ms, s.stepId).toBeGreaterThanOrEqual(200);
        expect(s.ms, s.stepId).toBeLessThanOrEqual(2000);
        if (s.toolName !== undefined) {
          expect(s.kind, s.stepId).toBe("tool");
          if (s.toolName === "arrival_window") expect(s.agentId, s.stepId).toBe("clerk");
          else expect(agent?.tools, s.stepId).toContain(s.toolName);
        }
        const modeled = agent?.kind === "claude" && s.kind !== "check" && s.toolName !== "arrival_window";
        expect(s.model, s.stepId).toBe(modeled ? agent?.model : undefined);
      }
    }
    expect(steps.filter((s) => s.toolName === "arrival_window").map((s) => s.stepId)).toHaveLength(1);
  });

  it("fit the tour's windows: run_01's first nine steps in 7900 ms, run_02's first six in 5000 ms", () => {
    expect(run("run_01").steps).toHaveLength(10);
    expect(run("run_02").steps).toHaveLength(7);
    expect(sumMs(run("run_01"), 9)).toBeLessThanOrEqual(7900);
    expect(sumMs(run("run_02"), 6)).toBeLessThanOrEqual(5000);
  });

  it("run_01 plays its steps in S3's order: cindy, intake, cindy, the steward with its check, the clerk, the writer", () => {
    expect(run("run_01").steps.map((s) => [s.agentId, s.kind, s.toolName ?? ""])).toEqual([
      ["cindy", "route", ""],
      ["intake", "result", ""],
      ["cindy", "call", ""],
      ["steward", "tool", "verification_record"],
      ["steward", "result", ""],
      ["steward", "check", ""],
      ["clerk", "tool", "policy"],
      ["clerk", "tool", "arrival_window"],
      ["clerk", "result", ""],
      ["writer", "reply", ""],
    ]);
    expect(run("run_01").steps[5].summary).toEqual({ en: "Quote found word for word in the co-op's record.", zh: "在合作社的记录中逐字找到了这句引文。" });
    expect(run("run_02").steps.map((s) => [s.agentId, s.kind])).toEqual([
      ["cindy", "route"],
      ["lister", "result"],
      ["tagger", "result"],
      ["checker", "check"],
      ["checker", "check"],
      ["checker", "check"],
      ["indexer", "result"],
    ]);
  });

  it("run_01's reply is L15 with the arrival dates computed from the records, and cites only its four records", () => {
    const r = reply("run_01");
    expect(r.refIds).toEqual(["pc_01", "com_dine", "mkr_01", "pol_01"]);
    expect(r.reply.en.startsWith("The co-op attests that Grace N. wove this herself. That's the co-op's record. Cindia hasn't checked it independently.")).toBe(true);
    expect(r.reply.zh.startsWith("合作社证明这件作品由 Grace N. 亲手织成。这是合作社的记录。Cindia尚未独立核实。")).toBe(true);
    // The window, computed here with fixed dates: the demo order's day, plus pc_01's lead time, plus
    // pol_01's transit days.
    const pol = policy.find((t) => t.id === "pol_01");
    const lead = piece("pc_01").facets.leadTimeDays;
    const date = orders[0].date;
    const ship = day(date, lead);
    const from = day(date, lead + Number(pol?.data?.transitDaysMin));
    const by = day(date, lead + Number(pol?.data?.transitDaysMax));
    expect([ship, from, by]).toEqual(["Sep 4", "Sep 10", "Sep 14"]);
    expect(r.reply.en).toContain(`ships by ${ship} and arrives between ${from} and ${by}`);
    // The Steward's quote is the co-op's record of pc_01's maker.
    const grace = getById<Person>(piece("pc_01").makerId);
    expect(run("run_01").steps[4].summary.en).toContain(`"Maker: ${grace?.name.en}, ${communities[0].name.en}."`);
  });

  it("run_02's one failing check is the planted claim, and it ends listing.indexed before apr_04", () => {
    const checks = swarmRuns.flatMap((r) => finals(r, "listing.drafted").flatMap((d) => d.checks));
    expect(checks.filter((c) => !c.ok).map((c) => c.checkId)).toEqual(["chk_02"]);
    const [draft] = finals(run("run_02"), "listing.drafted");
    expect(draft.checks.map((c) => [c.checkId, c.kind, c.ok])).toEqual([
      ["chk_01", "protocol", true],
      ["chk_02", "facts", false],
      ["chk_03", "price", true],
    ]);
    expect(draft.checks[1].note.en.startsWith("Planted test:")).toBe(true);
    expect(draft.summary.en).toContain("Woven from hand-spun churro wool, the old way.");
    expect(listings[0].notes).toContain("Store-bought wool yarn");
    expect(draft.facets.oneOfAKind).toBeUndefined();
    expect(draft.facets.leadTimeDays).toBeUndefined();
    expect(draft.hours).toBe(20);
    for (const w of [...draft.vibe.moods, ...draft.vibe.occasions, ...draft.vibe.recipients]) {
      expect([...vibeVocabulary.moods, ...vibeVocabulary.occasions, ...vibeVocabulary.recipients], w).toContain(w);
    }
    const [indexed] = finals(run("run_02"), "listing.indexed");
    expect(indexed).toMatchObject({ listingId: "lst_01", pieceId: "pc_55", modelId, index: "cindia-drafts", approx: true });
    expect(getById("pc_55")).toBeUndefined();
    // The passage rule, written here again, over the draft and the co-op.
    const c = communities[0];
    const expected = [
      `passage: ${draft.facets.object.en}`,
      `craft: ${c.craft.en}, ${c.people.en}`,
      ...list("materials", draft.facets.materials),
      ...list("techniques", draft.facets.techniques),
      ...list("motifs", draft.facets.motifs),
      ...list("colors", draft.facets.colors),
      ...list("mood", draft.vibe.moods),
      ...list("for", [...draft.vibe.occasions, ...draft.vibe.recipients]),
      firstSentence(draft.summary.en),
    ].join(" | ");
    expect(indexed.embedText).toBe(expected);
    expect(indexed.embedText).not.toContain("churro");
    expect(run("run_02").final.map((f) => f.type)).toEqual(["listing.drafted", "listing.indexed", "approval.requested"]);
    expect(finals(run("run_02"), "approval.requested")[0]).toEqual({ approvalId: "apr_04" });
  });

  it("run_03 drafts five blocks for sto_01: the co-op's pieces and prj_01, and a tagline that passes contentRules", () => {
    const [d] = finals(run("run_03"), "storefront.drafted");
    expect(d.storefrontId).toBe("sto_01");
    expect(d.blocks).toHaveLength(5);
    const props = (kind: string) => d.blocks.find((b) => b.kind === kind)?.props ?? {};
    expect(props("pieces").pieceIds).toEqual(pieces.filter((p) => p.communityId === "com_dine").map((p) => p.id));
    expect(props("projects").projectIds).toEqual(["prj_01"]);
    expect(props("visit")).toEqual({ address: communities[0].place.en, hours: "Visits by arrangement" });
    const tagline = String(props("hero").tagline);
    expect(wordHits(tagline, [...BAD, ...PEOPLE])).toEqual([]);
    expect(swarmRuns.filter((r) => r.trigger.kind === "storefront").map((r) => r.trigger)).toEqual([{ kind: "storefront", storefrontId: "sto_01" }]);
  });

  it("run_04 and run_10 give Grace N.'s payout, its date, the held amount and the gallery's gap, from the records", () => {
    const usd = mock.usd;
    const mpo = makerPayouts.find((m) => m.id === "mpo_01");
    const mst = makerStatements.find((m) => m.id === "mst_01");
    expect([mpo?.makerId, mst?.makerId]).toEqual(["mkr_01", "mkr_01"]);
    const r4 = reply("run_04");
    expect(r4.reply.en).toContain(usd(mpo?.amountCents ?? 0));
    expect(r4.reply.en).toContain("Oct 2");
    expect(mst?.payoutDate).toBe("2026-10-02");
    expect(r4.reply.en).toContain(usd(mst?.heldCents ?? 0));
    expect(r4.reply.en).toContain(owner.name.en);
    expect(r4.refIds).toEqual(["mpo_01", "mst_01"]);
    const r10 = reply("run_10");
    expect(r10.reply.en).toContain(usd(mst?.heldCents ?? 0));
    expect(r10.reply.en).toContain(usd(galleryFlag.deltaCents));
    expect(r10.reply.en).toContain("once the gallery sends the difference");
    expect(r10.refIds).toEqual(["mst_01", "flg_01"]);
  });

  it("run_05 replies L16 and names no piece, and run_06 is a sample draft whose checks all pass", () => {
    const r5 = reply("run_05");
    expect(r5.reply).toEqual({
      en: "In this demo, scripted answers cover the small grey, red and black wool weaving. Switch to Live to ask about this piece.",
      zh: "在本演示中，脚本回答只涵盖灰红黑三色小幅羊毛编织。切换到实时模式即可询问这件作品。",
    });
    expect(r5.refIds).toEqual([]);
    const [d] = finals(run("run_06"), "listing.drafted");
    expect(d.title.en).toContain("Sample");
    expect(d.summary.en).toContain("sample draft");
    expect(d.checks.every((c) => c.ok)).toBe(true);
  });

  it("run_07 gives the buyer L14 and forwards qst_01 to Grace N., and run_09 relays her answer word for word", () => {
    const r7 = reply("run_07");
    expect(r7.reply).toEqual({
      en: "Our records don't say, and I won't guess, so I'll ask Grace N. Her answer will show here in her own words.",
      zh: "我们的记录里没有答案，我不会乱猜，所以我会去问 Grace N.。她的回答会以她自己的原话显示在这里。",
    });
    const [fwd] = finals(run("run_07"), "question.forwarded");
    expect(fwd).toEqual({ questionId: "qst_01", threadId: "thr_03", makerId: "mkr_01", pieceId: "pc_01", text: makerQuestions[0].question.text, lang: "en" });
    expect(run("run_07").steps.filter((s) => s.kind === "check").map((s) => s.summary)).toEqual([
      { en: "No quote about a meaning in the records, so no answer is given.", zh: "记录中没有关于含义的引文，因此不作回答。" },
    ]);
    const ans = makerQuestions[0].answer;
    expect(ans).toMatchObject({ questionId: "qst_01", answerId: "ans_01", makerId: "mkr_01", lang: "en" });
    const r9 = reply("run_09");
    expect(r9.threadId).toBe("thr_03");
    expect(r9.reply.en).toContain(ans.text);
    expect(r9.reply.en).toContain("in her own words");
    expect(r9.reply.zh).toContain("Cindy的翻译");
    // A person's own answer takes the scripted one's place, word for word.
    const own = "I made it the way I like. Thanks for asking.";
    const planned = planRun(run("run_09"), envelope("question.answered", { ...ans, text: own }, 1), idsFor(), { quote: { from: ans.text, to: own } });
    const relayed = planned.map((p) => p.event).find((e) => e.type === "support.answered")?.payload as Payloads["support.answered"];
    expect(relayed.reply.en).toContain(own);
    expect(relayed.reply.en).not.toContain(ans.text);
  });

  it("run_08 names pc_07 and two pieces from other communities, all under $100 and sharing two of pc_01's words", () => {
    const r = reply("run_08");
    expect(r.refIds).toEqual(["pc_07", "pc_14", "pc_26"]);
    const base = wordsOf(piece("pc_01"));
    for (const id of r.refIds) {
      const p = piece(id);
      expect(p.priceCents, id).toBeLessThan(10000);
      expect([...wordsOf(p)].filter((w) => base.has(w)).length, id).toBeGreaterThanOrEqual(2);
      expect(r.reply.en, id).toContain(mock.usd(p.priceCents));
    }
    expect(r.refIds.map((id) => piece(id).communityId)).toEqual(["com_dine", "com_ojibwe", "com_ojibwe"]);
    const tool = run("run_08").steps.find((s) => s.toolName === "elastic_agent");
    expect(tool?.summary).toEqual({
      en: "Elastic Agent Builder (cindia-finder): pieces like pc_01 under $100",
      zh: "Elastic Agent Builder（cindia-finder）：100美元以内、与pc_01相似的作品",
    });
  });
});

describe("demoQuestions", () => {
  it("are the buyer's three and the seller's two, each answered by its own run in both languages", () => {
    expect(demoQuestions.map((q) => q.side)).toEqual(["buyer", "buyer", "buyer", "seller", "seller"]);
    const expected = ["run_01", "run_07", "run_08", "run_04", "run_10"];
    demoQuestions.forEach((q, i) => {
      const r = run(expected[i]);
      expect(r.trigger.kind === "support" && r.trigger.matches, expected[i]).toEqual([normalizeQuestion(q.text.en), normalizeQuestion(q.text.zh)]);
      for (const lang of ["en", "zh"] as const) {
        const context = q.side === "buyer" ? ["pc_01"] : ["mkr_01"];
        const events = answer("support.asked", { threadId: "thr_user_1", side: q.side, text: q.text[lang], lang, contextIds: context });
        const done = events.find((e) => e.type === "support.answered")?.payload as Payloads["support.answered"];
        // The person's run is re-keyed, so its steps say which scripted run it came from by agent order.
        expect(events.filter((e) => e.type === "swarm.step").map((e) => (e.payload as Payloads["swarm.step"]).agentId), `${expected[i]} ${lang}`).toEqual(r.steps.map((s) => s.agentId));
        expect(done.reply, `${expected[i]} ${lang}`).toEqual(finals(r, "support.answered")[0].reply);
      }
    });
    expect(makerQuestions[0].question.text).toBe(demoQuestions[1].text.en);
  });

  it("get the fallback on another piece's or another maker's page", () => {
    for (const [q, context] of [
      [demoQuestions[0], ["pc_02"]],
      [demoQuestions[3], ["mkr_02"]],
    ] as const) {
      const events = answer("support.asked", { threadId: "thr_user_1", side: q.side, text: q.text.en, lang: "en", contextIds: [...context] });
      const done = events.find((e) => e.type === "support.answered")?.payload as Payloads["support.answered"];
      expect(done.reply).toEqual(reply("run_05").reply);
      expect(done.refIds).toEqual([]);
    }
  });
});

describe("every scripted event", () => {
  it("in a run, the scan, the question, the search, the surprise and the snapshot passes validateEvent()", () => {
    const events: CindiaEvent[] = [
      ...swarmRuns.flatMap(runEvents),
      envelope("watch.started", { scanId: scriptedScan.scanId, makerId: scriptedScan.makerId, queries: scriptedScan.queries }, 1),
      envelope("question.answered", makerQuestions[0].answer, 2),
      envelope("search.queried", { queryId: "qry_01", ...demoSearch.query }, 3),
      envelope("search.answered", { queryId: "qry_01", ...demoSearch.answer }, 4),
      envelope("surprise.asked", { surpriseId: "srp_01", ...demoSurprise.ask }, 5),
      envelope("surprise.drawn", { surpriseId: "srp_01", ...demoSurprise.draw }, 6),
      envelope("data.synced", demoDataSync, 7),
    ];
    const problems = events.flatMap((e) => validateEvent(e).map((p) => `${e.type}: ${p}`));
    expect(problems).toEqual([]);
  });

  it("the responder's answers built from them validate too: the scan, a listing, a storefront and a relay", () => {
    const scanned = answer("watch.started", { scanId: "wsc_user_1", makerId: "mkr_01", queries: scriptedScan.queries });
    expect(scanned.map((e) => e.type)).toEqual(["watch.scanned", "counterfeit.flagged", "followup.drafted", "approval.requested"]);
    const listed = answer("listing.requested", { listingId: "lst_user_1", makerId: "mkr_02", notes: listings[0].notes, lang: "en" });
    expect(listed.map((e) => e.type).slice(-3)).toEqual(["listing.drafted", "listing.indexed", "approval.requested"]);
    const sample = answer("listing.requested", { listingId: "lst_user_2", makerId: "mkr_05", notes: "Earrings, red beads.", lang: "en" });
    const sampleDraft = sample.find((e) => e.type === "listing.drafted");
    expect((sampleDraft?.payload as Payloads["listing.drafted"] | undefined)?.listingId).toBe("lst_user_2");
    const drafted = answer("storefront.requested", { storefrontId: "sto_01" });
    expect(drafted.at(-1)?.type).toBe("storefront.drafted");
    expect(answer("storefront.requested", { storefrontId: "sto_02" })).toEqual([]);
    const all = [...scanned, ...listed, ...sample, ...drafted];
    expect(all.flatMap((e) => validateEvent(e).map((p) => `${e.type}: ${p}`))).toEqual([]);
  });

  it("the snapshot counts its rows from the mock data, with the five approvals, ten runs and every step", () => {
    const rows = Object.fromEntries(demoDataSync.tables.map((t) => [t.table, t.rows]));
    expect(rows).toEqual({
      catalog: pieces.length,
      listings: listings.length,
      orders: orders.length,
      approvals: allApprovals.length,
      runs: swarmRuns.length,
      steps: steps.length,
      processes: 11,
      screens: 1,
    });
    expect([rows.catalog, rows.listings, rows.orders, rows.approvals, rows.runs]).toEqual([54, 1, 30, 5, 10]);
    expect(demoDataSync.screens).toBe(1);
    expect(demoDataSync.processes.filter((p) => p.status === "working").map((p) => p.processId)).toEqual(["swarm", "data"]);
    expect(demoDataSync.processes.map((p) => p.processId)).toEqual(["search", "swarm", "checkout", "money", "reconcile", "approvals", "close", "proof", "watch", "model", "data"]);
    const newest = Object.fromEntries(demoDataSync.tables.map((t) => [t.table, t.newest.map((n) => n.id)]));
    expect(newest.catalog).toEqual(["pc_54", "pc_53", "pc_52"]);
    expect(newest.orders).toEqual(["ord_030", "ord_029", "ord_028"]);
    expect(newest.approvals).toEqual(["apr_05", "apr_04", "apr_03"]);
    expect(newest.runs).toEqual(["run_10", "run_09", "run_08"]);
    expect(newest.steps).toEqual(steps.slice(-3).map((s) => s.stepId).toReversed());
    // Labels are built from each record's fields (kind, state, status, amount or catalog title),
    // never from a person's words.
    const labels = Object.fromEntries(demoDataSync.tables.map((t) => [t.table, t.newest.map((n) => n.label)]));
    expect(labels.catalog).toEqual(newest.catalog.map((id) => piece(id).title.en));
    expect(labels.listings).toEqual(["draft"]);
    expect(labels.orders).toEqual(newest.orders.map((id) => orders.find((o) => o.id === id)).map((o) => `${o?.status} · ${mock.usd(o?.grossCents ?? 0)}`));
    expect(labels.approvals).toEqual(newest.approvals.map((id) => getById<Approval>(id)).map((a) => `${a?.kind} · ${a?.status}`));
    expect(labels.runs).toEqual(newest.runs.map((id) => run(id)).map((r) => `${r.side} · ${r.trigger.kind}`));
    expect(labels.steps).toEqual(newest.steps.map((id) => steps.find((s) => s.stepId === id)).map((s) => `${s?.agentId} · ${s?.kind}`));
    expect(newest.processes).toEqual(["data", "model", "watch"]);
    expect(labels.processes).toEqual(["working", "done", "done"]);
  });
});

describe("the content scan", () => {
  /** The Ojibwe craft line, a sourced fact: glass beads came through the fur trade. Its one kept-out word is allowed. */
  const ojibweLine = pieces.find((p) => p.communityId === "com_ojibwe")?.heritage as Text;
  const sourced = ([, w]: [string, string], s: string) => (s === ojibweLine.en && w === "fur") || (s === ojibweLine.zh && w === "毛皮");

  it("no v2 text, facet, vibe word, alias, eval query, step summary or reply holds a kept-out, stereotype or meaning word", () => {
    const sources: Record<string, unknown> = {
      communities: communities.map(({ protocols: _p, ...rest }) => rest),
      leads,
      allMakers,
      pieces,
      searchIndex,
      keywordAliases: [Object.keys(keywordAliases), Object.values(keywordAliases)],
      vibeVocabulary,
      searchEval: searchEval.map((q) => q.text),
      projects,
      worksInProgress,
      storefronts,
      listings,
      agents,
      policy,
      swarmRuns,
      demoQuestions,
      makerQuestions,
      // The market listings' own title, snippet and claim are their fictional sellers' words (R26).
      counterfeitCandidates: counterfeitCandidates.map(({ title: _t, snippet: _s, claim: _c, ...rest }) => rest),
      scriptedScan,
      allFollowUps,
      allApprovals,
      demoSearch,
      demoSurprise,
      demoDataSync,
    };
    const texts = Object.entries(sources).flatMap(([name, v]) => strings(v, name));
    expect(texts.length).toBeGreaterThan(2000);
    const hits = texts.flatMap(([path, s]) => wordHits(s, BAD).map((w): [string, string, string] => [path, w, s]));
    expect(hits.filter(([path, w, s]) => !sourced([path, w], s)).map(([p, w]) => `${p}: ${w}`)).toEqual([]);
    // The sourced line is the one exception, and it is there.
    expect(hits.some(([path, w, s]) => sourced([path, w], s))).toBe(true);
  });

  it("no title, facet, vibe word or alias holds a people's name", () => {
    const drafts = swarmRuns.flatMap((r) => finals(r, "listing.drafted"));
    const named = {
      pieces: pieces.map((p) => ({ title: p.title, facets: p.facets, vibe: p.vibe })),
      drafts: drafts.map((d) => ({ title: d.title, facets: d.facets, vibe: d.vibe })),
      projects: projects.map((p) => p.title),
      worksInProgress: worksInProgress.map((w) => w.title),
      blocks: [...storefronts.flatMap((s) => s.blocks), ...swarmRuns.flatMap((r) => finals(r, "storefront.drafted").flatMap((d) => d.blocks))]
        .filter((b) => b.kind === "hero" || b.props.title !== undefined)
        .map((b) => [b.props.tagline ?? "", b.props.title ?? ""]),
      keywordAliases,
      aliasKeys: Object.keys(keywordAliases),
      vibeVocabulary,
    };
    expect(scan(named, "named", PEOPLE)).toEqual([]);
  });
});

// Every file under src/mock/, as written.
const FILES = import.meta.glob<string>("../../src/mock/**/*.ts", { query: "?raw", import: "default", eager: true });

describe("the host scan", () => {
  it("every URL in src/mock/ is a /market/ page or on an allowed host", () => {
    // URLs written anywhere in the files, comments included.
    const written = Object.entries(FILES).flatMap(([f, text]) => [...text.matchAll(/(?:https?:\/\/|\bwww\.)[^\s"'`)<>]+/gi)].map((m) => [f, m[0]] as const));
    expect(written.filter(([, u]) => !allowedHost(host(u.startsWith("www.") ? `//${u}` : u)))).toEqual([]);
    // Every page a record links to: an absolute URL on an allowed host, or a /market/ path. Piece
    // images are the site's own illustrations under /images/.
    const values = Object.entries(mock)
      .filter(([, v]) => typeof v !== "function")
      .flatMap(([name, v]) => strings(v, name))
      .filter(([, s]) => /^(?:https?:)?\/\//i.test(s) || /^\/[\w./-]+\.html?$/.test(s));
    expect(values.length).toBeGreaterThanOrEqual(4);
    expect(values.filter(([, s]) => !(s.startsWith("/market/") || allowedHost(host(s))))).toEqual([]);
    for (const p of pieces) expect(p.image, p.id).toBe(`/images/${p.id}.svg`);
  });
});

describe("the old-names scan", () => {
  // R0-reskin's acceptance grep for v1's old names, and the dropped Peoples of the earlier plan,
  // term by term. Each term carries a "·" that unmark() strips, so a grep for these names over tests/
  // finds nothing in this file while the regex still matches exactly what the grep does.
  const OLD_TERMS = [
    "std·_gu", "Gu Em·broidery", "Gu em·broidery", "Gu stu·dio", "顾·绣", "顾·氏",
    "Shen Ruo·lan", "沈·若兰", "Lu Y·un", "陆·芸", "Han Ji·ng", "韩·静", "Zhou M·ei", "周·梅",
    "Shang·hai", "上·海", "Song·jiang", "松·江", "Su·zhou", "苏·州", "晨丝·坊",
    "[Pp]e·on(y|ies)", "牡·丹", "Plum blos·som", "梅·花", "[Kk]o·i", "锦·鲤", "Lo·tus", "晨·荷",
    "Orchid sc·roll", "兰花·轴", "Sparrow on bam·boo", "竹·雀", "[Ss]a·chet", "香·囊",
    "Silk coas·ters", "丝·绣", "Crane bro·och", "仙·鹤", "Cloud po·uch", "祥·云",
    "[Cc]hrysan·themum", "菊·花", "[Pp]hoe·nix", "凤·凰", "团·扇", "osman·thus", "桂·花",
    "Ming dyn·asty", "明·代", "宋·画", "刺·绣", "绢", "非·遗", "主理·人", "工作·室",
  ];
  const DROPPED = ["Mā·ori", "Ma·ori", "Sá·mi", "\\bSa·mi\\b", "In·uit", "Que·chua", "Maa·sai", "Mi·ao", "Hm·ong"];
  const OLD = new RegExp([...OLD_TERMS, ...DROPPED].map(unmark).join("|"));

  it("no file in src/mock/ holds a Gu-era name or a dropped People's name", () => {
    expect(OLD_TERMS).toHaveLength(56);
    expect(["Pe·ony fan", "Hm·ong", "Mā·ori", "工作·室"].every((s) => OLD.test(unmark(s)))).toBe(true);
    expect(OLD.test("Samira's sampler")).toBe(false);
    expect(Object.entries(FILES).filter(([, text]) => OLD.test(text)).map(([f, text]) => `${f}: ${OLD.exec(text)?.[0]}`)).toEqual([]);
  });
});

describe("determinism", () => {
  const DETERMINISM = import.meta.glob<string>("./determinism.test.ts", { query: "?raw", import: "default", eager: true });

  it("the v1 determinism test still covers every file, the new ones included", () => {
    const source = Object.values(DETERMINISM)[0] ?? "";
    expect(source).toContain('import.meta.glob<string>("../../src/mock/**/*.ts"');
    const names = Object.keys(FILES).map((f) => f.replace("../../src/mock/", ""));
    for (const f of ["search.ts", "searchEval.ts", "swarm.ts", "database.ts", "searchIndex.ts", "catalog/part-a.ts", "catalog/part-b.ts", "watch.ts", "projects.ts"]) {
      expect(names, f).toContain(f);
    }
    for (const [f, text] of Object.entries(FILES)) {
      expect(text, f).not.toMatch(/Math\.random|Date\.now|performance\.now|new Date\(\s*\)/);
    }
  });
});
