// Pure selectors for the dashboard's four figures. No React, no side effects: each takes store
// state (or ledger entry IDs) and returns the numbers a tile shows, in integer cents.
import type { ChannelId, LedgerAccount, LedgerEntry, Text } from "../../core/types";
import type { Payloads } from "../../core/events";
import type { MonthState, MoneyState } from "../../core/state";
import { channels, getById } from "../../mock";

export interface ChannelRevenue {
  channelId: ChannelId;
  name: Text;
  cents: number;
}

/** The sales account each channel posts to. These account names are contract (data-model.md). */
const SALES_ACCOUNT: Record<ChannelId, LedgerAccount> = {
  ch_cindia: "sales_cindia",
  ch_site: "sales_site",
  ch_gallery: "sales_gallery",
};

const REFUNDS_ACCOUNT: LedgerAccount = "refunds";

function isChannelId(v: unknown): v is ChannelId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(SALES_ACCOUNT, v);
}

function channelForAccount(account: LedgerAccount): ChannelId | null {
  for (const id of Object.keys(SALES_ACCOUNT) as ChannelId[]) {
    if (SALES_ACCOUNT[id] === account) return id;
  }
  return null;
}

/** The channel of the record a refund entry points at (a ChannelPayout, or anything with a channelId). */
function channelForRef(refId: string): ChannelId | null {
  const rec = getById(refId) as { channelId?: unknown } | undefined;
  return rec && isChannelId(rec.channelId) ? rec.channelId : null;
}

/**
 * One row per channel, always all three, in the order of `channels` from src/mock. cents = gross of
 * the sales posted so far for that channel, less any refund posted so far for that channel.
 * Unknown IDs are skipped. Empty IDs give all zeros.
 */
export function revenueByChannel(ledgerEntryIds: readonly string[]): ChannelRevenue[] {
  const totals: Record<ChannelId, number> = { ch_cindia: 0, ch_site: 0, ch_gallery: 0 };
  const seen = new Set<string>();
  for (const id of ledgerEntryIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = getById<LedgerEntry>(id);
    // getById searches every collection, so skip anything that isn't a ledger entry.
    if (!entry || typeof entry.account !== "string" || typeof entry.debitCents !== "number") continue;
    const salesChannel = channelForAccount(entry.account);
    if (salesChannel) {
      totals[salesChannel] += entry.creditCents - entry.debitCents;
      continue;
    }
    if (entry.account === REFUNDS_ACCOUNT) {
      const refundChannel = channelForRef(entry.refId);
      if (refundChannel) totals[refundChannel] -= entry.debitCents - entry.creditCents;
    }
  }
  return channels.map((c) => ({ channelId: c.id, name: c.name, cents: totals[c.id] }));
}

export function revenueTotal(rows: readonly ChannelRevenue[]): number {
  let total = 0;
  for (const r of rows) total += r.cents;
  return total;
}

export interface MakerShareFigure {
  makerPayCents: number;
  salesCents: number;
  heldCents: number;
  shareBps: number;
}

/** makerPayCents / salesCents in basis points, rounded half up, in integer arithmetic. */
function shareInBps(partCents: number, wholeCents: number): number {
  if (wholeCents <= 0) return 0;
  return Math.floor((2 * partCents * 10000 + wholeCents) / (2 * wholeCents));
}

/** From month.closed. shareBps = makerPayCents / salesCents in basis points, rounded half up. null before the close. */
export function makerShare(closed: Payloads["month.closed"] | null): MakerShareFigure | null {
  if (!closed) return null;
  return {
    makerPayCents: closed.makerPayCents,
    salesCents: closed.salesCents,
    heldCents: closed.heldCents,
    shareBps: shareInBps(closed.makerPayCents, closed.salesCents),
  };
}

export interface CashFigure {
  accountId: string;
  balanceCents: number;
  asOf: string;
  at: number;
}

/** The latest account.synced (money.latestAccountId). null before any. */
export function cash(money: MoneyState): CashFigure | null {
  const id = money.latestAccountId;
  if (!id) return null;
  const acct = money.accounts[id];
  if (!acct) return null;
  return { accountId: id, balanceCents: acct.balanceCents, asOf: acct.asOf, at: acct.at };
}

export interface OpenFlagsFigure {
  count: number;
  flagIds: string[];
  firstAt: number;
}

/** Flags raised so far (every raised flag is open; nothing in the contracts resolves one). null when none. */
export function openFlags(month: MonthState): OpenFlagsFigure | null {
  const flagIds = month.flagIds.filter((id) => month.flags[id] !== undefined);
  if (flagIds.length === 0) return null;
  let firstAt = Infinity;
  for (const id of flagIds) firstAt = Math.min(firstAt, month.flags[id].at);
  return { count: flagIds.length, flagIds, firstAt };
}
