// B05 live adapter: the judge's scenario (api-contract.md, B05). No timeline holds a scripted
// scenario.loaded, so this only answers people: the registry passes a person's scenario.loaded on
// in live mode. It uploads the person's own file (`content`) or, for "Use the sample statement",
// the held-back statement's CSV, with the records the server needs, and returns the server's
// scenario.loaded, match.made and flag.raised events.
//
// The scenario panel lists records from record.arrived, which the endpoint doesn't return, so the
// adapter adds one record.arrived per scn_ record the answer involves (as the scripted answer does),
// with dates from the mock or from the file it sent. Anything missing, invalid or failed throws or
// returns [], and the registry plays the scripted answer, so the panel keeps its Simulated badge.
import type { CindiaEvent, Payloads, RecordType } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { validateEvent } from "../../core/validate";
import { contracts } from "../../mock/channels";
import { getById } from "../../mock";
import { sampleFileName, scenarioCsv, scenarioDeposit, scenarioOrders, scenarioPayout, scenarioStatement } from "../../mock/scenario";
import type { LiveAdapter } from "../types";

/** The registry gives produce() 8 seconds, so the fetch gives up at 7.5. */
const FETCH_TIMEOUT_MS = 7500;
const HEALTH_TIMEOUT_MS = 3000;

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

type AnswerEvent = CindiaEvent<"scenario.loaded"> | CindiaEvent<"match.made"> | CindiaEvent<"flag.raised">;

function isAnswerEvent(e: unknown): e is AnswerEvent {
  if (!e || typeof e !== "object") return false;
  const t = (e as { type?: unknown }).type;
  if (t !== "scenario.loaded" && t !== "match.made" && t !== "flag.raised") return false;
  return validateEvent(e).length === 0;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dates the uploaded file gives: the statement's (issuedDate, or the latest CSV line) and each line's. */
function datesFrom(content: string): { statement?: string; lines: Map<string, string> } {
  const lines = new Map<string, string>();
  const text = content.replace(/^﻿/, "").trim();
  if (text.startsWith("{")) {
    try {
      const obj = JSON.parse(text) as { issuedDate?: unknown };
      return { statement: typeof obj.issuedDate === "string" && DATE_RE.test(obj.issuedDate) ? obj.issuedDate : undefined, lines };
    } catch {
      return { lines };
    }
  }
  let latest: string | undefined;
  for (const row of text.split(/\r?\n/).slice(1)) {
    const [date, orderId] = row.split(",").map((c) => c.trim());
    if (!date || !orderId || !DATE_RE.test(date)) continue;
    lines.set(orderId, date);
    if (!latest || date > latest) latest = date;
  }
  return { statement: latest, lines };
}

/** The record type and date for a scn_ record, from the mock entity, or undefined for a contract or payout. */
function knownRecord(id: string): { recordType: RecordType; date: string } | undefined {
  const e = getById(id) as Record<string, unknown> | undefined;
  if (!e) return undefined;
  if ("lines" in e && typeof e.issuedDate === "string") return { recordType: "statement", date: e.issuedDate };
  if ("direction" in e && typeof e.date === "string") return { recordType: "bank_txn", date: e.date };
  if ("pieceId" in e && "buyerId" in e && typeof e.date === "string") return { recordType: "order", date: e.date };
  return undefined;
}

let localCounter = 0;

/** One record.arrived per scn_ record the answer involves: the statement's orders, the statement, the bank record. */
function recordsFor(answer: AnswerEvent[], content: string, monthId: string): CindiaEvent<"record.arrived">[] {
  const dates = datesFrom(content);
  const statementIds = new Set<string>();
  const ids: string[] = [];
  for (const e of answer) {
    if (e.type === "match.made") statementIds.add(e.payload.recordIds[0] ?? "");
    if (e.type === "flag.raised") statementIds.add(e.payload.recordIds[1] ?? "");
  }
  // Orders first, then the statement, then the rest, the order the scripted answer uses.
  ids.push(...dates.lines.keys());
  for (const e of answer) {
    if (e.type === "scenario.loaded") ids.push(...(e.payload.recordIds ?? []));
    else ids.push(...e.payload.recordIds);
  }
  const seen = new Set<string>();
  const out: CindiaEvent<"record.arrived">[] = [];
  const add = (recordId: string, recordType: RecordType, date: string) => {
    localCounter += 1;
    out.push({
      id: `evt_live_b05_${String(localCounter).padStart(4, "0")}`,
      type: "record.arrived",
      at: 0,
      source: "live",
      key: "b05-scenario",
      payload: { recordId, recordType, date },
    });
  };
  const ordered = [...ids.filter((id) => !statementIds.has(id)), ...statementIds];
  const late: [string, RecordType, string][] = [];
  for (const id of ordered) {
    if (!id.includes("scn_") || seen.has(id)) continue;
    seen.add(id);
    const known = knownRecord(id);
    if (statementIds.has(id)) {
      // A live parse's statement isn't in the mock: its date comes from the file.
      add(id, "statement", known?.date ?? dates.statement ?? `${monthId}-01`);
    } else if (known?.recordType === "bank_txn") {
      late.push([id, known.recordType, known.date]);
    } else if (known) {
      add(id, known.recordType, known.date);
    } else if (dates.lines.has(id)) {
      add(id, "order", dates.lines.get(id) ?? `${monthId}-01`);
    }
  }
  for (const [id, type, date] of late) add(id, type, date);
  return out;
}

const adapter: LiveAdapter = {
  key: "b05-scenario",

  async health() {
    const body = (await fetchJson("/api/health", {}, HEALTH_TIMEOUT_MS)) as { routers?: unknown };
    return Array.isArray(body.routers) && body.routers.includes("b05") && body.routers.includes("b01");
  },

  async produce(event: CindiaEvent, _state: CindiaState): Promise<CindiaEvent[]> {
    if (event.type !== "scenario.loaded") return [];
    const p = event.payload as Payloads["scenario.loaded"];
    const own = typeof p.content === "string" && p.content.length > 0;
    const content = own ? (p.content as string) : scenarioCsv;
    const fileName = own ? p.fileName : sampleFileName;
    const monthId = scenarioStatement.monthId;
    // The sample's records for the sample. A person's file gets only the contract, so the sample's
    // deposit is never taken for their payment.
    const records = own
      ? { orders: [], payouts: [], refunds: [], statements: [], bankTxns: [], contracts }
      : { orders: scenarioOrders, payouts: [scenarioPayout], refunds: [], statements: [], bankTxns: [scenarioDeposit], contracts };
    const type = fileName.toLowerCase().endsWith(".json") ? "application/json" : "text/csv";

    const form = new FormData();
    form.append("trigger", JSON.stringify(event));
    form.append("file", new Blob([content], { type }), fileName);
    form.append("monthId", monthId);
    form.append("records", JSON.stringify(records));

    const body = await fetchJson("/api/b05/scenario", { method: "POST", body: form }, FETCH_TIMEOUT_MS);
    const events = (body as { events?: unknown }).events;
    if (!Array.isArray(events)) throw new Error("b05 answered without an events list");
    const answer = events.filter(isAnswerEvent);
    if (answer.length !== events.length || answer[0]?.type !== "scenario.loaded") {
      throw new Error("b05 answered with events that don't match events.md");
    }
    const [loaded, ...results] = answer;
    if (!loaded) return [];
    return [loaded, ...recordsFor(answer, content, monthId), ...results].map((e) => ({ ...e, at: event.at, key: "b05-scenario" as const }));
  },
};

export default adapter;
