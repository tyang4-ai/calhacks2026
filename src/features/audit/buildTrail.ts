// The audit trail builder (F-audit T1): a pure function from a record ID to its ordered steps.
// It walks the links in data-model.md (orderIds, refundIds, recordIds, refId, nettedInPayoutId)
// and always ends at a bank transaction, right after the ledger entries that share its refId.
// Every value comes from the records in src/mock/ through getById() and the exported collections.
import type {
  BankTxn,
  Channel,
  ChannelPayout,
  Contract,
  Flag,
  LedgerEntry,
  MakerPayout,
  Order,
  Person,
  Piece,
  Refund,
  Statement,
  Text,
} from "../../core/types";
import {
  bankTxns,
  contracts,
  flags,
  getById,
  ledger,
  makerPayouts,
  orders,
  payouts,
  refunds,
  statements,
} from "../../mock";

/** The kind of record one step shows. */
export type StepKind =
  | "maker_payout"
  | "order"
  | "channel_payout"
  | "refund"
  | "flag"
  | "contract"
  | "statement"
  | "bank_txn"
  | "ledger_entry";

/** The name of the dataset field an amount comes from, so a test can compare it to the record. */
export type AmountField =
  | "amountCents"
  | "grossCents"
  | "netCents"
  | "heldCents"
  | "expectedCents"
  | "actualCents"
  | "deltaCents"
  | "totalSaleCents"
  | "totalCommissionCents"
  | "totalNetCents"
  | "debitCents"
  | "creditCents"
  | "refundCents"
  | "feesCents"
  | "makerShareCents";

export interface StepAmount {
  field: AmountField;
  /** Exactly the record's field value, in integer cents. */
  cents: number;
}

export interface TrailStep {
  /** The dataset ID of the record, e.g. "ord_001", "txn_045", "led_0123". */
  recordId: string;
  kind: StepKind;
  /** The record's date (a contract's signedDate, a statement's issuedDate), or null when it has none. */
  date: string | null;
  /** The record's amounts, the headline one first. Empty for a record with none (a contract). */
  amounts: StepAmount[];
  /** A short line about the record from its own fields, or null. */
  memo: Text | null;
  /** The record ID this step was reached from, or null for the first step. */
  fromId: string | null;
}

export interface Trail {
  rootId: string;
  /**
   * The first step is the root record. The last step is always the anchor bank transaction
   * (kind "bank_txn"), right after the ledger entries that share its refId.
   */
  steps: TrailStep[];
}

// ---------------------------------------------------------------------------------------------
// Record kinds, found by membership in the mock collections rather than by ID prefix.

function kindOf(id: string): StepKind | null {
  const has = (list: { id: string }[]) => list.some((r) => r.id === id);
  if (has(makerPayouts)) return "maker_payout";
  if (has(orders)) return "order";
  if (has(payouts)) return "channel_payout";
  if (has(refunds)) return "refund";
  if (has(flags)) return "flag";
  if (has(contracts)) return "contract";
  if (has(statements)) return "statement";
  if (has(bankTxns)) return "bank_txn";
  if (has(ledger)) return "ledger_entry";
  return null;
}

function same(s: string): Text {
  return { en: s, zh: s };
}

function nameOf(id: string): Text | null {
  const r = getById<Channel | Person | Piece>(id);
  if (!r) return null;
  return "title" in r ? r.title : r.name;
}

function amount(field: AmountField, cents: number): StepAmount {
  return { field, cents };
}

/** One step for a record, its fields read from the record itself. */
function stepFor(id: string, kind: StepKind, fromId: string | null): TrailStep {
  const base = { recordId: id, kind, fromId };
  switch (kind) {
    case "maker_payout": {
      const r = getById<MakerPayout>(id)!;
      return {
        ...base,
        date: null,
        amounts: [amount("amountCents", r.amountCents), amount("heldCents", r.heldCents)],
        memo: nameOf(r.makerId),
      };
    }
    case "order": {
      const r = getById<Order>(id)!;
      return {
        ...base,
        date: r.date,
        amounts: [amount("grossCents", r.grossCents), amount("makerShareCents", r.makerShareCents)],
        memo: nameOf(r.pieceId),
      };
    }
    case "channel_payout": {
      const r = getById<ChannelPayout>(id)!;
      const amounts = [
        amount("netCents", r.netCents),
        amount("grossCents", r.grossCents),
        amount("feesCents", r.feesCents),
      ];
      if (r.refundCents !== 0) amounts.push(amount("refundCents", r.refundCents));
      return { ...base, date: r.date, amounts, memo: nameOf(r.channelId) };
    }
    case "refund": {
      const r = getById<Refund>(id)!;
      return { ...base, date: r.date, amounts: [amount("amountCents", r.amountCents)], memo: null };
    }
    case "flag": {
      const r = getById<Flag>(id)!;
      return {
        ...base,
        date: null,
        amounts: [
          amount("expectedCents", r.expectedCents),
          amount("actualCents", r.actualCents),
          amount("deltaCents", r.deltaCents),
        ],
        memo: r.explanation,
      };
    }
    case "contract": {
      const r = getById<Contract>(id)!;
      return { ...base, date: r.signedDate, amounts: [], memo: r.terms };
    }
    case "statement": {
      const r = getById<Statement>(id)!;
      return {
        ...base,
        date: r.issuedDate,
        amounts: [
          amount("totalNetCents", r.totalNetCents),
          amount("totalSaleCents", r.totalSaleCents),
          amount("totalCommissionCents", r.totalCommissionCents),
        ],
        memo: nameOf(r.channelId),
      };
    }
    case "bank_txn": {
      const r = getById<BankTxn>(id)!;
      return {
        ...base,
        date: r.date,
        amounts: [amount("amountCents", r.amountCents)],
        memo: { en: `${r.counterparty.en} · ${r.memo}`, zh: `${r.counterparty.zh} · ${r.memo}` },
      };
    }
    case "ledger_entry": {
      const r = getById<LedgerEntry>(id)!;
      const amounts =
        r.debitCents !== 0 ? [amount("debitCents", r.debitCents)] : [amount("creditCents", r.creditCents)];
      return { ...base, date: r.date, amounts, memo: same(r.memo) };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The walk.

class Walk {
  readonly steps: TrailStep[] = [];
  private readonly seen = new Set<string>();

  /** Adds a record once; returns false if it was already in the trail or isn't a known record. */
  add(id: string, fromId: string | null): boolean {
    if (this.seen.has(id)) return false;
    const kind = kindOf(id);
    if (!kind) return false;
    this.seen.add(id);
    this.steps.push(stepFor(id, kind, fromId));
    return true;
  }

  /** The ledger entries whose refId is the given record, in ledger order. */
  addLedgerFor(refId: string, fromId: string): void {
    for (const e of ledger) if (e.refId === refId) this.add(e.id, fromId);
  }

  /** The bank transaction whose refId is the given record, as a middle step. */
  addTxnFor(refId: string, fromId: string): void {
    const t = bankTxns.find((x) => x.refId === refId);
    if (t) this.add(t.id, fromId);
  }

  /** Ends the trail: the ledger entries for refId, then the bank transaction for refId. */
  anchor(refId: string, fromId: string): boolean {
    const t = bankTxns.find((x) => x.refId === refId);
    if (!t || this.seen.has(t.id)) return false;
    this.addLedgerFor(refId, fromId);
    return this.add(t.id, fromId);
  }

  /** Adds an order with its own journal (a gallery order's) right after it. */
  addOrder(orderId: string, fromId: string | null): void {
    if (this.add(orderId, fromId)) this.addLedgerFor(orderId, orderId);
  }

  /** Adds a payout and, unless it is the anchor's record, its deposit. */
  addPayout(payoutId: string, fromId: string, anchorRefId: string): void {
    if (this.add(payoutId, fromId) && payoutId !== anchorRefId) this.addTxnFor(payoutId, payoutId);
  }
}

function payoutOf(orderId: string): ChannelPayout | undefined {
  return payouts.find((p) => p.orderIds.includes(orderId));
}

function refundOf(orderId: string): Refund | undefined {
  return refunds.find((r) => r.orderId === orderId);
}

function makerPayoutTrail(mp: MakerPayout): TrailStep[] | null {
  const w = new Walk();
  w.add(mp.id, null);
  for (const oid of mp.orderIds) {
    w.addOrder(oid, mp.id);
    const p = payoutOf(oid);
    if (p) w.addPayout(p.id, oid, mp.id);
  }
  return w.anchor(mp.id, mp.id) ? w.steps : null;
}

function flagTrail(f: Flag): TrailStep[] | null {
  const [contractId, statementId, txnId] = f.recordIds;
  const txn = getById<BankTxn>(txnId);
  if (!txn) return null;
  const w = new Walk();
  w.add(f.id, null);
  w.add(contractId, f.id);
  w.add(statementId, f.id);
  return w.anchor(txn.refId, f.id) ? w.steps : null;
}

function orderTrail(o: Order): TrailStep[] | null {
  const first = payoutOf(o.id);
  if (!first) return null;
  const refund = o.status === "refunded" ? refundOf(o.id) : undefined;
  const netted = refund ? getById<ChannelPayout>(refund.nettedInPayoutId) : undefined;
  const last = netted ?? first;
  const w = new Walk();
  w.addOrder(o.id, null);
  w.addPayout(first.id, o.id, last.id);
  if (refund) {
    w.add(refund.id, o.id);
    if (netted) w.addPayout(netted.id, refund.id, last.id);
  }
  return w.anchor(last.id, last.id) ? w.steps : null;
}

function payoutTrail(p: ChannelPayout): TrailStep[] | null {
  const w = new Walk();
  w.add(p.id, null);
  for (const oid of p.orderIds) w.add(oid, p.id);
  for (const rid of p.refundIds) w.add(rid, p.id);
  return w.anchor(p.id, p.id) ? w.steps : null;
}

function refundTrail(r: Refund): TrailStep[] | null {
  const w = new Walk();
  w.add(r.id, null);
  w.add(r.orderId, r.id);
  w.add(r.nettedInPayoutId, r.id);
  return w.anchor(r.nettedInPayoutId, r.nettedInPayoutId) ? w.steps : null;
}

/** Builds the trail for a record, or null when the ID is unknown or has no trail. */
export function buildTrail(recordId: string): Trail | null {
  let steps: TrailStep[] | null = null;
  switch (kindOf(recordId)) {
    case "maker_payout":
      steps = makerPayoutTrail(getById<MakerPayout>(recordId)!);
      break;
    case "flag":
      steps = flagTrail(getById<Flag>(recordId)!);
      break;
    case "order":
      steps = orderTrail(getById<Order>(recordId)!);
      break;
    case "channel_payout":
      steps = payoutTrail(getById<ChannelPayout>(recordId)!);
      break;
    case "refund":
      steps = refundTrail(getById<Refund>(recordId)!);
      break;
    default:
      steps = null;
  }
  return steps ? { rootId: recordId, steps } : null;
}
