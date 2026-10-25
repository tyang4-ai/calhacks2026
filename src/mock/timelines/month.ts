// The fast-forward month: September's records in date order, about 0.29 s per day, each followed by
// its match and its ledger posting, then the gallery's statement and deposit, held back for the
// catch. Times are ms after month.started. The tour plays this whole timeline in d07-month, shifted
// by MONTH_SHIFT_MS (136200 ms, timelines/demo.ts).
import type { CindiaEvent } from "../../core/events";
import type { Timeline } from "../../core/player";
import type { Text } from "../../core/types";
import { actId, draft, finalize, type Draft } from "../events";
import {
  bankTxns,
  galleryDeposit,
  galleryFlag,
  galleryStatement,
  journalFor,
  matchForPayout,
  monthId,
  orders,
  payouts,
  purchases,
  refunds,
} from "../month";
import { dayIndex } from "../util";

const DAY_MS = 290;
const FIRST_MS = 200;
const STEP_MS = 40;

/** The catch, held out of date order (demo-script.md d08-catch, less the 136200 shift). */
export const CATCH_TIMES = { statement: 10100, deposit: 10600, flag: 11300, explained: 12800 } as const;

type Item = Omit<Draft, "at">;
const item = (d: Draft): Item => ({ type: d.type, payload: d.payload, ...(d.key ? { key: d.key } : {}) });

const MATCH_LINES: Record<string, (recordIds: string[]) => Text> = {
  bundled: (ids) => {
    const os = ids.filter((id) => id.startsWith("ord_"));
    return {
      en: `I matched one card-processor payout to ${os.length} orders: ${os.join(", ")}.`,
      zh: `我把一笔收单结款与${os.length}笔订单对上了：${os.join("、")}。`,
    };
  },
  refund_netted: (ids) => {
    const r = refunds.find((x) => ids.includes(x.id));
    return {
      en: `I found the refund for ${r?.orderId} taken out of the next payout, and matched it.`,
      zh: `我发现${r?.orderId}的退款已从下一笔结款中扣除，已核对。`,
    };
  },
  carried_over: (ids) => {
    const os = ids.filter((id) => id.startsWith("ord_"));
    return {
      en: `This payout landed on Oct 2, after the close, so I carried its ${os.length} orders into October.`,
      zh: `这笔结款10月2日才到账，晚于月结，我把这${os.length}笔订单结转到10月。`,
    };
  },
};

let acts = 0;
const days = new Map<string, Item[]>();
const on = (date: string) => {
  let list = days.get(date);
  if (!list) days.set(date, (list = []));
  return list;
};
const ledgerFor = (refId: string): Item[] => {
  const j = journalFor(refId);
  return j ? [item(draft("ledger.posted", 0, { entryIds: [...j.entryIds] }))] : [];
};

const datesInOrder = [...new Set([...orders.map((o) => o.date), ...refunds.map((r) => r.date), ...payouts.map((p) => p.date), ...purchases.map((p) => p.date)])].toSorted();

for (const date of datesInOrder) {
  const list = on(date);
  for (const o of orders.filter((x) => x.date === date)) {
    list.push(item(draft("record.arrived", 0, { recordId: o.id, recordType: "order", date })));
    if (o.channelId === "ch_gallery") list.push(...ledgerFor(o.id));
  }
  for (const r of refunds.filter((x) => x.date === date)) {
    list.push(item(draft("record.arrived", 0, { recordId: r.id, recordType: "refund", date })));
  }
  for (const p of payouts.filter((x) => x.date === date && x.channelId !== "ch_gallery")) {
    const m = matchForPayout(p.id);
    list.push(item(draft("record.arrived", 0, { recordId: p.id, recordType: "payout", date })));
    list.push(
      item(
        draft("match.made", 0, {
          matchId: m.id,
          kind: m.kind,
          recordIds: [...m.recordIds],
          ...(m.kind === "carried_over" ? { intoMonthId: "2026-10" } : {}),
        }),
      ),
    );
    const line = MATCH_LINES[m.kind];
    if (line) {
      acts += 1;
      list.push(item(draft("agent.acted", 0, { actId: actId(acts), kind: "match", text: line(m.recordIds), refId: m.id })));
    }
    list.push(...ledgerFor(p.id));
  }
  for (const pur of purchases.filter((x) => x.date === date)) {
    const t = bankTxns.find((x) => x.id === pur.txnId);
    list.push(item(draft("record.arrived", 0, { recordId: pur.txnId, recordType: "bank_txn", date: t?.date ?? date })));
    list.push(...ledgerFor(pur.id));
  }
}

const drafts: Draft[] = [draft("month.started", 0, { monthId })];
for (const [date, list] of days) {
  const base = FIRST_MS + dayIndex(date) * DAY_MS;
  list.forEach((it, k) => drafts.push({ ...it, at: base + k * STEP_MS }));
}

drafts.push(
  draft("record.arrived", CATCH_TIMES.statement, { recordId: galleryStatement.id, recordType: "statement", date: galleryStatement.issuedDate }),
  draft("record.arrived", CATCH_TIMES.deposit, { recordId: galleryDeposit.id, recordType: "bank_txn", date: galleryDeposit.date }),
  draft("flag.raised", CATCH_TIMES.flag, {
    flagId: galleryFlag.id,
    kind: galleryFlag.kind,
    recordIds: [...galleryFlag.recordIds],
    expectedCents: galleryFlag.expectedCents,
    actualCents: galleryFlag.actualCents,
    deltaCents: galleryFlag.deltaCents,
  }),
  draft("flag.explained", CATCH_TIMES.explained, {
    flagId: galleryFlag.id,
    trustRecordId: galleryFlag.trustRecordId,
    explanation: { ...galleryFlag.explanation },
  }),
);

/** How many agent.acted lines this timeline fires. The demo's own lines count on from here. */
export const MONTH_ACT_COUNT = acts;

const events: CindiaEvent[] = finalize(drafts, "evt_m_");

export const monthTimeline: Timeline = { id: "month", durationMs: 13000, events };

export default monthTimeline;
