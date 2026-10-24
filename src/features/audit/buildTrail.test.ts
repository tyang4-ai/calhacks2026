import { describe, expect, it } from "vitest";
import type { BankTxn, Flag, Refund } from "../../core/types";
import { bankTxns, getById, ledger } from "../../mock";
import { buildTrail, type Trail } from "./buildTrail";

function trail(id: string): Trail {
  const t = buildTrail(id);
  if (!t) throw new Error(`no trail for ${id}`);
  return t;
}

function ids(t: Trail): string[] {
  return t.steps.map((s) => s.recordId);
}

function txnForRef(refId: string): BankTxn {
  const t = bankTxns.find((x) => x.refId === refId);
  if (!t) throw new Error(`no bank txn for ${refId}`);
  return t;
}

const ROOTS = ["mpo_01", "mpo_02", "mpo_03", "flg_01", "ord_001", "ord_020"];

describe("buildTrail", () => {
  it("returns null for an unknown ID", () => {
    expect(buildTrail("nope_999")).toBeNull();
    expect(buildTrail("")).toBeNull();
  });

  it("mpo_01 passes through ord_001 and pay_001 and ends at the txn that paid the maker", () => {
    const t = trail("mpo_01");
    expect(t.rootId).toBe("mpo_01");
    expect(t.steps[0].recordId).toBe("mpo_01");
    expect(t.steps[0].fromId).toBeNull();
    expect(ids(t)).toContain("ord_001");
    expect(ids(t)).toContain("pay_001");
    expect(t.steps.find((s) => s.recordId === "ord_001")?.fromId).toBe("mpo_01");
    expect(t.steps.find((s) => s.recordId === "pay_001")?.fromId).toBe("ord_001");
    // pay_001's deposit is a middle step.
    const dep = txnForRef("pay_001");
    const depIdx = ids(t).indexOf(dep.id);
    expect(depIdx).toBeGreaterThan(0);
    expect(depIdx).toBeLessThan(t.steps.length - 1);
    const last = t.steps.at(-1)!;
    expect(last.kind).toBe("bank_txn");
    expect(last.recordId).toBe(txnForRef("mpo_01").id);
  });

  it("flg_01 shows the contract, the statement and the gallery deposit", () => {
    const flag = getById<Flag>("flg_01")!;
    const [contractId, statementId, txnId] = flag.recordIds;
    const t = trail("flg_01");
    expect(contractId).toBe("ctr_gallery_01");
    expect(statementId).toBe("stm_gallery_2026_09");
    expect(ids(t)).toEqual(expect.arrayContaining(["ctr_gallery_01", "stm_gallery_2026_09", txnId]));
    expect(t.steps.at(-1)!.recordId).toBe(txnId);
    const fs = t.steps[0];
    expect(fs.kind).toBe("flag");
    const expected = fs.amounts.find((a) => a.field === "expectedCents")!.cents;
    const actual = fs.amounts.find((a) => a.field === "actualCents")!.cents;
    expect(expected).toBe(flag.expectedCents);
    expect(actual).toBe(flag.actualCents);
    // Demo-critical figures: $2,040.00 expected, $1,700.00 actual.
    expect(expected).toBe(204000);
    expect(actual).toBe(170000);
  });

  it("ord_020 reaches rfd_001 and the payout it was netted from, ending at that payout's deposit", () => {
    const refund = getById<Refund>("rfd_001")!;
    const t = trail("ord_020");
    expect(ids(t)).toContain("rfd_001");
    expect(ids(t)).toContain(refund.nettedInPayoutId);
    expect(t.steps.find((s) => s.recordId === refund.nettedInPayoutId)?.fromId).toBe("rfd_001");
    expect(t.steps.at(-1)!.recordId).toBe(txnForRef(refund.nettedInPayoutId).id);
  });

  it("ord_001 ends at pay_001's deposit", () => {
    const t = trail("ord_001");
    expect(ids(t)).toContain("pay_001");
    expect(t.steps.at(-1)!.recordId).toBe(txnForRef("pay_001").id);
  });

  it.each(ROOTS)("%s: ends with the anchor txn right after its ledger entries, no duplicates", (root) => {
    const t = trail(root);
    expect(new Set(ids(t)).size).toBe(t.steps.length);
    const last = t.steps.at(-1)!;
    expect(last.kind).toBe("bank_txn");
    const anchor = getById<BankTxn>(last.recordId)!;
    const ledgerIds = ledger.filter((e) => e.refId === anchor.refId).map((e) => e.id);
    expect(ledgerIds.length).toBeGreaterThan(0);
    const before = ids(t).slice(t.steps.length - 1 - ledgerIds.length, t.steps.length - 1);
    expect(before).toEqual(ledgerIds);
    // Every step but the first was reached from a record earlier in the trail.
    const seen = new Set<string>();
    t.steps.forEach((s, i) => {
      if (i === 0) expect(s.fromId).toBeNull();
      else expect(seen.has(s.fromId ?? "")).toBe(true);
      seen.add(s.recordId);
    });
  });

  it.each(ROOTS)("%s: every amount equals the named field of its record", (root) => {
    for (const s of trail(root).steps) {
      const rec = getById(s.recordId) as unknown as Record<string, unknown> | undefined;
      expect(rec, s.recordId).toBeDefined();
      for (const a of s.amounts) {
        expect(Number.isInteger(a.cents)).toBe(true);
        expect(a.cents, `${s.recordId}.${a.field}`).toBe(rec![a.field]);
      }
    }
  });

  it("builds trails for every pay_ root and rfd_001", () => {
    for (const t of bankTxns.filter((x) => x.refId.startsWith("pay_"))) {
      expect(buildTrail(t.refId)?.steps.at(-1)?.recordId).toBe(t.id);
    }
    const r = trail("rfd_001");
    expect(r.steps.at(-1)!.kind).toBe("bank_txn");
  });
});
