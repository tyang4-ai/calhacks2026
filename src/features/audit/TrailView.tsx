// The trail view (F-audit T2). The steps unfold one at a time when the trail opens, each with its
// record kind, date, amounts through the kit's Money and its memo. The bank record comes last and is
// marked as the source of truth. Every figure is read from the step, which reads it from the record.
import type { CSSProperties } from "react";
import { motion } from "motion/react";
import type { BankTxn, Contract, LedgerEntry, Text } from "../../core/types";
import { getById } from "../../mock";
import { Badge, EvidenceCard, Money, formatBps, formatDate } from "../../ui";
import { UI_MS, useReducedMotion } from "../../ui/motion";
import type { AmountField, StepAmount, StepKind, Trail, TrailStep } from "./buildTrail";
import { ACCOUNTS, GLOSSARY, UI, t, type Lang } from "./strings";

export interface TrailViewProps {
  trail: Trail;
  lang: Lang;
}

const KIND_LABEL: Record<StepKind, Text> = {
  maker_payout: GLOSSARY.makerPayout,
  order: GLOSSARY.order,
  channel_payout: GLOSSARY.payout,
  refund: GLOSSARY.refund,
  flag: GLOSSARY.flag,
  contract: GLOSSARY.contract,
  statement: GLOSSARY.statement,
  bank_txn: GLOSSARY.bankRecord,
  ledger_entry: UI.ledgerEntry,
};

const FIELD_LABEL: Record<AmountField, Text> = {
  amountCents: UI.amount,
  grossCents: UI.gross,
  netCents: UI.net,
  heldCents: GLOSSARY.held,
  expectedCents: UI.expected,
  actualCents: UI.actual,
  deltaCents: UI.shortBy,
  totalSaleCents: UI.totalSale,
  totalCommissionCents: UI.totalCommission,
  totalNetCents: UI.totalNet,
  debitCents: UI.debit,
  creditCents: UI.credit,
  refundCents: GLOSSARY.refund,
  feesCents: GLOSSARY.fees,
  makerShareCents: GLOSSARY.makerShare,
};

/** Delay between steps as they unfold, capped so the whole trail finishes within about 1.5 s. */
const STEP_DELAY_MS = 70;
const MAX_UNFOLD_MS = 1300;

const memoStyle: CSSProperties = {
  margin: 0,
  color: "var(--c-color-ink-soft)",
  fontSize: "var(--c-text-14)",
  overflowWrap: "anywhere",
};

const stepStyle: CSSProperties = {
  borderLeft: "2px solid var(--c-color-line)",
  padding: "var(--c-space-8) 0 var(--c-space-8) var(--c-space-12)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--c-space-4)",
  minWidth: 0,
};

function Amount({ a, lang, tone }: { a: StepAmount; lang: Lang; tone?: "neutral" | "in" | "out" | "pending" }) {
  return (
    <span style={{ display: "inline-flex", gap: "var(--c-space-4)", alignItems: "baseline" }}>
      <span style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}>{t(FIELD_LABEL[a.field], lang)}</span>
      <span data-field={a.field}>
        <Money cents={a.cents} tone={tone} />
      </span>
    </span>
  );
}

function toneFor(step: TrailStep, a: StepAmount): "neutral" | "in" | "out" | "pending" {
  if (step.kind === "flag" && a.field === "actualCents") return "out";
  if (a.field === "heldCents" && a.cents > 0) return "pending";
  return "neutral";
}

/** Extra label-value lines a record kind has beyond its amounts. */
function extraRows(step: TrailStep, lang: Lang): { label: string; value: string }[] {
  if (step.kind === "ledger_entry") {
    const e = getById<LedgerEntry>(step.recordId);
    const acct = e ? ACCOUNTS[e.account as keyof typeof ACCOUNTS] : undefined;
    return acct ? [{ label: t(UI.account, lang), value: t(acct, lang) }] : [];
  }
  if (step.kind === "contract") {
    const c = getById<Contract>(step.recordId);
    return c ? [{ label: t(UI.commissionRate, lang), value: formatBps(c.commissionBps) }] : [];
  }
  return [];
}

function StepBody({ step, lang }: { step: TrailStep; lang: Lang }) {
  const memo = step.memo ? t(step.memo, lang) : null;
  const rows = extraRows(step, lang);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--c-space-8)", alignItems: "baseline" }}>
        <span style={{ fontWeight: 600 }}>{t(KIND_LABEL[step.kind], lang)}</span>
        <span style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)", fontVariantNumeric: "tabular-nums" }}>
          {step.date ? formatDate(step.date, lang) : step.recordId}
        </span>
      </div>
      {step.amounts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--c-space-4) var(--c-space-12)" }}>
          {step.amounts.map((a) => (
            <Amount key={a.field} a={a} lang={lang} tone={toneFor(step, a)} />
          ))}
        </div>
      )}
      {rows.map((r) => (
        <div key={r.label} style={{ fontSize: "var(--c-text-14)" }}>
          <span style={{ color: "var(--c-color-ink-soft)" }}>{r.label}</span> {r.value}
        </div>
      ))}
      {memo && (
        <p style={memoStyle} title={memo}>
          {memo}
        </p>
      )}
    </>
  );
}

function BankBody({ step, lang }: { step: TrailStep; lang: Lang }) {
  const txn = getById<BankTxn>(step.recordId);
  const main = step.amounts[0];
  const memo = step.memo ? t(step.memo, lang) : null;
  const rows: { label: string; value: string }[] = [];
  if (step.date) rows.push({ label: t(UI.date, lang), value: formatDate(step.date, lang) });
  if (txn) rows.push({ label: t(UI.counterparty, lang), value: t(txn.counterparty, lang) });
  return (
    <EvidenceCard
      state="trusted"
      kind={
        <span style={{ display: "flex", gap: "var(--c-space-8)", alignItems: "center", flexWrap: "wrap" }}>
          {t(GLOSSARY.bankRecord, lang)}
          <Badge variant="jade">{t(UI.sourceOfTruth, lang)}</Badge>
        </span>
      }
      title={txn ? t(txn.direction === "in" ? UI.deposit : UI.withdrawal, lang) : step.recordId}
      figureLabel={main ? t(FIELD_LABEL[main.field], lang) : undefined}
      figure={
        main ? (
          <span data-field={main.field}>
            <Money cents={main.cents} tone={txn?.direction === "in" ? "in" : "neutral"} />
          </span>
        ) : undefined
      }
      rows={rows}
      footer={
        <>
          {memo && (
            <p style={memoStyle} title={memo}>
              {memo}
            </p>
          )}
          <p style={{ margin: 0, fontSize: "var(--c-text-14)" }}>{t(UI.sourceOfTruthNote, lang)}</p>
        </>
      }
    />
  );
}

export function TrailView({ trail, lang }: TrailViewProps) {
  const reduced = useReducedMotion();
  const last = trail.steps.length - 1;
  const gap = trail.steps.length > 1 ? Math.min(STEP_DELAY_MS, MAX_UNFOLD_MS / trail.steps.length) : 0;
  return (
    <ol
      key={trail.rootId}
      data-testid="audit-trail"
      data-root-id={trail.rootId}
      style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-4)" }}
    >
      {trail.steps.map((s, i) => {
        const isBank = i === last;
        return (
          <motion.li
            key={s.recordId}
            data-testid={isBank ? "audit-bank-record" : `audit-step-${s.recordId}`}
            data-record-id={s.recordId}
            data-kind={s.kind}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: UI_MS / 1000, delay: (i * gap) / 1000, ease: "easeOut" }}
            style={isBank ? { marginTop: "var(--c-space-8)", minWidth: 0 } : stepStyle}
          >
            {isBank ? <BankBody step={s} lang={lang} /> : <StepBody step={s} lang={lang} />}
          </motion.li>
        );
      })}
    </ol>
  );
}
