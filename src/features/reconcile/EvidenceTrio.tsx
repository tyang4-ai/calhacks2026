// F-reconcile T3: the three records behind the short-payment flag, side by side. Each card
// highlights its key figure: the contract's commission and what the studio is owed, the
// statement's commission and its net, the bank deposit and its date. Once flag.explained lands,
// the card for trustRecordId carries the "Trust this record" label.
import type { CSSProperties, ReactNode } from "react";
import type { FlagState } from "../../core";
import type { BankTxn, Channel, Contract, Statement } from "../../core/types";
import { getById } from "../../mock";
import { Badge, EvidenceCard, Money, formatBps, formatDate } from "../../ui";
import { GLOSSARY, UI, t } from "./strings";

export interface EvidenceTrioProps {
  flag: FlagState;
  lang: "en" | "zh";
}

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "var(--c-space-12)",
};

const figureRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "var(--c-space-12)",
  flexWrap: "wrap",
};

function byPrefix(ids: string[], prefix: string): string | undefined {
  return ids.find((id) => id.startsWith(prefix));
}

/** The statement's commission rate: the lines' shared rate, or the effective rate if they differ. */
function statementBps(stm: Statement): number {
  const rates = new Set(stm.lines.map((l) => l.commissionBps));
  if (rates.size === 1) return stm.lines[0]!.commissionBps;
  return stm.totalSaleCents > 0 ? Math.round((stm.totalCommissionCents / stm.totalSaleCents) * 10000) : 0;
}

function TrustLabel({ lang }: { lang: "en" | "zh" }) {
  return (
    <div>
      <Badge variant="jade">{t(GLOSSARY.trust, lang)}</Badge>
    </div>
  );
}

function figurePair(a: ReactNode, b: ReactNode): ReactNode {
  return (
    <span style={figureRowStyle}>
      <span>{a}</span>
      <span>{b}</span>
    </span>
  );
}

export function EvidenceTrio({ flag, lang }: EvidenceTrioProps) {
  const ctrId = byPrefix(flag.recordIds, "ctr_");
  const stmId = byPrefix(flag.recordIds, "stm_");
  const txnId = byPrefix(flag.recordIds, "txn_");
  const contract = ctrId ? getById<Contract>(ctrId) : undefined;
  const statement = stmId ? getById<Statement>(stmId) : undefined;
  const txn = txnId ? getById<BankTxn>(txnId) : undefined;
  const channelId = contract?.channelId ?? statement?.channelId;
  const channel = channelId ? getById<Channel>(channelId) : undefined;
  const channelName = channel ? t(channel.name, lang) : t(GLOSSARY.gallery, lang);

  const trustId = flag.trustRecordId;
  const stateFor = (id: string | undefined) => (id !== undefined && id === trustId ? "trusted" : "neutral");
  const footerFor = (id: string | undefined) => (id !== undefined && id === trustId ? <TrustLabel lang={lang} /> : undefined);

  return (
    <div style={gridStyle}>
      <EvidenceCard
        testId="reconcile-evidence-contract"
        kind={t(GLOSSARY.contract, lang)}
        title={channelName}
        figureLabel={`${t(GLOSSARY.commission, lang)} · ${t(UI.owedToStudio, lang)}`}
        figure={figurePair(contract ? formatBps(contract.commissionBps) : "", <Money cents={flag.expectedCents} tone="in" />)}
        rows={contract ? [{ label: t(UI.signed, lang), value: formatDate(contract.signedDate, lang) }] : []}
        state={stateFor(ctrId)}
        footer={footerFor(ctrId)}
      />
      <EvidenceCard
        testId="reconcile-evidence-statement"
        kind={t(GLOSSARY.statement, lang)}
        title={channelName}
        figureLabel={`${t(GLOSSARY.commission, lang)} · ${t(UI.statementNet, lang)}`}
        figure={statement ? figurePair(formatBps(statementBps(statement)), <Money cents={statement.totalNetCents} />) : undefined}
        rows={
          statement
            ? [
                { label: t(UI.sales, lang), value: <Money cents={statement.totalSaleCents} /> },
                { label: t(UI.issued, lang), value: formatDate(statement.issuedDate, lang) },
              ]
            : []
        }
        state={stateFor(stmId)}
        footer={footerFor(stmId)}
      />
      <EvidenceCard
        testId="reconcile-evidence-bank"
        kind={t(GLOSSARY.bankRecord, lang)}
        title={txn ? t(txn.counterparty, lang) : channelName}
        figureLabel={t(UI.deposit, lang)}
        figure={txn ? <Money cents={txn.amountCents} /> : undefined}
        rows={txn ? [{ label: t(UI.depositDate, lang), value: formatDate(txn.date, lang) }] : []}
        state={stateFor(txnId)}
        footer={footerFor(txnId)}
      />
    </div>
  );
}
