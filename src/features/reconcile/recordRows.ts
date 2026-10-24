// F-reconcile T2: a record ID to its display row, and the month's rows in date order, where the
// records a match names fold into that match's one row at the payout's date.
import { createElement, type ReactNode } from "react";
import type { RecordType } from "../../core/events";
import type { MatchState, MonthState, RecordArrival } from "../../core/state";
import type { BankTxn, Channel, ChannelPayout, Order, Piece, Refund, Statement } from "../../core/types";
import { getById } from "../../mock";
import { Money, formatDate, formatMonth, type LedgerRow } from "../../ui";
import { OneLine, PARTY_MAX, matchCells } from "./MatchRow";
import { RECORD_TYPE_LABELS, RECORD_TYPE_ORDER, t } from "./strings";

export type Lang = "en" | "zh";
export type CellKey = "date" | "type" | "party" | "detail" | "amount";
export type RecordCells = Record<CellKey, ReactNode>;

export const CELL_KEYS: readonly CellKey[] = ["date", "type", "party", "detail", "amount"];

function channelName(channelId: string, lang: Lang): string {
  const ch = getById<Channel>(channelId);
  return ch ? ch.name[lang] : channelId;
}

function pieceTitle(pieceId: string, lang: Lang): string {
  const p = getById<Piece>(pieceId);
  return p ? p.title[lang] : pieceId;
}

/** A date cell kept on one line, so a row is no taller than its type label. */
export function noWrap(text: string): ReactNode {
  return createElement("span", { style: { whiteSpace: "nowrap" } }, text);
}

function money(cents: number, tone: "neutral" | "in" | "out" | "pending"): ReactNode {
  return createElement(Money, { cents, tone });
}

/** The record's own date from the mock data, falling back to the arrival's date. */
export function recordDate(recordId: string, recordType: RecordType, fallback = ""): string {
  switch (recordType) {
    case "order":
      return getById<Order>(recordId)?.date ?? fallback;
    case "payout":
      return getById<ChannelPayout>(recordId)?.date ?? fallback;
    case "refund":
      return getById<Refund>(recordId)?.date ?? fallback;
    case "statement":
      return getById<Statement>(recordId)?.issuedDate ?? fallback;
    case "bank_txn":
      return getById<BankTxn>(recordId)?.date ?? fallback;
  }
}

/** One record as table cells: date, type, party, detail and amount. */
export function recordRow(recordId: string, recordType: RecordType, lang: Lang, fallbackDate = ""): RecordCells {
  const date = recordDate(recordId, recordType, fallbackDate);
  const base = { date: date ? noWrap(formatDate(date, lang)) : "", type: t(RECORD_TYPE_LABELS[recordType], lang) };
  switch (recordType) {
    case "order": {
      const o = getById<Order>(recordId);
      return { ...base, party: o ? channelName(o.channelId, lang) : "", detail: o ? pieceTitle(o.pieceId, lang) : "", amount: o ? money(o.grossCents, "neutral") : "" };
    }
    case "payout": {
      const p = getById<ChannelPayout>(recordId);
      return { ...base, party: p ? channelName(p.channelId, lang) : "", detail: "", amount: p ? money(p.netCents, "pending") : "" };
    }
    case "refund": {
      const r = getById<Refund>(recordId);
      const o = r ? getById<Order>(r.orderId) : undefined;
      return {
        ...base,
        party: o ? channelName(o.channelId, lang) : "",
        detail: o ? pieceTitle(o.pieceId, lang) : "",
        amount: r ? money(-r.amountCents, "out") : "",
      };
    }
    case "statement": {
      const s = getById<Statement>(recordId);
      return { ...base, party: s ? channelName(s.channelId, lang) : "", detail: s ? formatMonth(s.monthId, lang) : "", amount: s ? money(s.totalNetCents, "neutral") : "" };
    }
    case "bank_txn": {
      const b = getById<BankTxn>(recordId);
      return {
        ...base,
        party: b ? b.counterparty[lang] : "",
        detail: "",
        amount: b ? money(b.direction === "in" ? b.amountCents : -b.amountCents, b.direction === "in" ? "in" : "neutral") : "",
      };
    }
  }
}

/** Sort key: ISO date, then a fixed tie-break on the ID, so every seek gives the same order. */
export interface SortKey {
  date: string;
  id: string;
}

export function compareKeys(a: SortKey, b: SortKey): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function recordSortKey(arrival: RecordArrival): SortKey {
  return { date: recordDate(arrival.recordId, arrival.recordType, arrival.date), id: arrival.recordId };
}

/** A match sits at its payout's date, the first record it names. */
export function matchSortKey(match: MatchState, records: MonthState["records"]): SortKey {
  const payoutId = match.recordIds[0] ?? match.matchId;
  const arrival = records[payoutId];
  const date = arrival ? recordDate(arrival.recordId, arrival.recordType, arrival.date) : (getById<ChannelPayout>(payoutId)?.date ?? "");
  return { date, id: payoutId };
}

export type MonthSlice = Pick<MonthState, "records" | "recordIds" | "matches" | "matchIds">;

/** Every record ID some match names. */
export function matchedRecordIds(month: MonthSlice): Set<string> {
  const ids = new Set<string>();
  for (const mid of month.matchIds) for (const rid of month.matches[mid]?.recordIds ?? []) ids.add(rid);
  return ids;
}

export function recordTestId(recordId: string): string {
  return `reconcile-record-${recordId}`;
}

export function matchTestId(matchId: string): string {
  return `reconcile-match-${matchId}`;
}

/** Internal ID for a special match's table row: its reconcile-match ID sits on the pinned strip row. */
export function matchRowTestId(matchId: string): string {
  return `reconcile-row-${matchId}`;
}

/** The special kinds the "Cindy handled" strip pins. Every other match keeps its ID on its table row. */
export function isSpecialMatch(match: Pick<MatchState, "kind">): boolean {
  return match.kind !== "one_to_one";
}

/** Holds a record's details and party to one line each, so a long name can't make a tall row. */
function oneLineDetail(cells: RecordCells): RecordCells {
  const out = { ...cells };
  if (typeof cells.detail === "string" && cells.detail) out.detail = createElement(OneLine, { title: cells.detail }, cells.detail);
  if (typeof cells.party === "string" && cells.party) out.party = createElement(OneLine, { title: cells.party, maxWidth: PARTY_MAX }, cells.party);
  return out;
}

/** The month's rows in date order: unmatched records alone, matched ones folded into their match. */
export function buildTimelineRows(month: MonthSlice, lang: Lang): LedgerRow[] {
  const matched = matchedRecordIds(month);
  const items: { key: SortKey; row: LedgerRow }[] = [];
  const seen = new Set<string>();
  for (const rid of month.recordIds) {
    if (seen.has(rid) || matched.has(rid)) continue;
    seen.add(rid);
    const a = month.records[rid];
    if (!a) continue;
    items.push({
      key: recordSortKey(a),
      row: {
        id: rid,
        cells: oneLineDetail(recordRow(rid, a.recordType, lang, a.date)),
        ...(a.recordType === "payout" ? { state: "pending" as const } : {}),
        testId: recordTestId(rid),
      },
    });
  }
  for (const mid of month.matchIds) {
    const m = month.matches[mid];
    if (!m) continue;
    items.push({ key: matchSortKey(m, month.records), row: { id: mid, cells: matchCells(m, lang), state: "matched", testId: isSpecialMatch(m) ? matchRowTestId(mid) : matchTestId(mid) } });
  }
  items.sort((a, b) => compareKeys(a.key, b.key));
  return items.map((i) => i.row);
}

/** How many records of each type have arrived. */
export function countByType(month: Pick<MonthState, "records" | "recordIds">): Record<RecordType, number> {
  const counts = Object.fromEntries(RECORD_TYPE_ORDER.map((k) => [k, 0])) as Record<RecordType, number>;
  for (const rid of new Set(month.recordIds)) {
    const a = month.records[rid];
    if (a) counts[a.recordType] += 1;
  }
  return counts;
}

/** Payouts arrived so far, and how many of them a match names as its payout. */
export function payoutProgress(month: MonthSlice): { matched: number; total: number } {
  const payoutsWithMatch = new Set<string>();
  for (const mid of month.matchIds) {
    const first = month.matches[mid]?.recordIds[0];
    if (first) payoutsWithMatch.add(first);
  }
  let total = 0;
  let matched = 0;
  for (const rid of new Set(month.recordIds)) {
    if (month.records[rid]?.recordType !== "payout") continue;
    total += 1;
    if (payoutsWithMatch.has(rid)) matched += 1;
  }
  return { matched, total };
}
