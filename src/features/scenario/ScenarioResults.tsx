// F-scenario T2: what Cindy found in the judge's statement. Reads the store only: the scenario's
// records, matches and flag, filtered to IDs that contain scn_ (the sample's scn_ IDs and the
// stm_scn_ statement a live parse returns). Amounts come from the entity through getById(); a record
// the mock doesn't know (a live parse) shows its type and date only. Before any load it shows the
// empty line, after a load but before records the reading line. When a person's own file was
// answered while b05-scenario is still scripted, the registry fell back to the sample, and
// scenario-note says so.
import { useMemo } from "react";
import { useCindia } from "../../core";
import type { RecordType } from "../../core/events";
import type { FlagState, MatchState, RecordArrival } from "../../core/state";
import type { BankTxn, Channel, ChannelPayout, Contract, Order, Refund, Statement } from "../../core/types";
import { getById } from "../../mock";
import { EvidenceCard, Flag, LedgerTable, Money, formatBps, formatCents, formatDate, type LedgerRow } from "../../ui";
import type { Lang } from "./strings";
import { GLOSSARY, RECORD_TYPE_LABEL, STRINGS, fill, t } from "./strings";

export interface ScenarioResultsProps {
  lang: Lang;
}

const isScenarioId = (id: string) => id.includes("scn_");

/** Distinct scn_ IDs, in the order the store took them in. */
function scenarioIds(ids: string[]): string[] {
  return [...new Set(ids.filter(isScenarioId))];
}

/** The record's own amount, from the mock entity, or undefined when the mock doesn't know it. */
function amountOf(recordId: string, type: RecordType): number | undefined {
  switch (type) {
    case "order":
      return getById<Order>(recordId)?.grossCents;
    case "statement":
      return getById<Statement>(recordId)?.totalNetCents;
    case "bank_txn":
      return getById<BankTxn>(recordId)?.amountCents;
    case "payout":
      return getById<ChannelPayout>(recordId)?.netCents;
    case "refund":
      return getById<Refund>(recordId)?.amountCents;
  }
}

/** A short second line for a record: the piece for an order, the counterparty for a bank record. */
function detailOf(recordId: string, type: RecordType, lang: Lang): string | undefined {
  if (type === "order") {
    const o = getById<Order>(recordId);
    const p = o ? getById(o.pieceId) : undefined;
    return p && "title" in p ? t(p.title, lang) : undefined;
  }
  if (type === "bank_txn") {
    const b = getById<BankTxn>(recordId);
    return b ? t(b.counterparty, lang) : undefined;
  }
  if (type === "statement" || type === "payout") {
    const r = getById<Statement | ChannelPayout>(recordId);
    const ch = r ? getById<Channel>(r.channelId) : undefined;
    return ch ? t(ch.name, lang) : undefined;
  }
  return undefined;
}

const muted = { color: "var(--c-color-ink-soft)" } as const;

export function ScenarioResults({ lang }: ScenarioResultsProps) {
  const month = useCindia((s) => s.month);
  const scenario = useCindia((s) => s.scenario);
  const b05 = useCindia((s) => s.sources["b05-scenario"]);

  const { records, matches, flags } = useMemo(() => {
    return {
      records: scenarioIds(month.recordIds)
        .map((id) => month.records[id])
        .filter((r): r is RecordArrival => r !== undefined),
      matches: scenarioIds(month.matchIds)
        .map((id) => month.matches[id])
        .filter((m): m is MatchState => m !== undefined),
      flags: scenarioIds(month.flagIds)
        .map((id) => month.flags[id])
        .filter((f): f is FlagState => f !== undefined),
    };
  }, [month]);

  const latest = scenario.latestScenarioId ? scenario.loads[scenario.latestScenarioId] : undefined;

  if (!latest) {
    return <p style={{ margin: 0, ...muted }}>{t(STRINGS.empty, lang)}</p>;
  }
  if (records.length === 0) {
    return (
      <p style={{ margin: 0, ...muted }} aria-live="polite">
        {t(STRINGS.reading, lang)}
      </p>
    );
  }

  const fellBack = latest.content !== undefined && b05 === "scripted";
  const matchedIds = new Set(matches.flatMap((m) => m.recordIds));
  const flaggedIds = new Set(flags.flatMap((f) => f.recordIds));

  const rows: LedgerRow[] = records.map((r) => {
    const flagged = flaggedIds.has(r.recordId);
    const matched = matchedIds.has(r.recordId);
    const cents = amountOf(r.recordId, r.recordType);
    const detail = detailOf(r.recordId, r.recordType, lang);
    return {
      id: r.recordId,
      state: flagged ? "flagged" : matched ? "matched" : "pending",
      cells: {
        record: (
          <span data-record-id={r.recordId}>
            {t(RECORD_TYPE_LABEL[r.recordType], lang)}
            {detail && <span style={{ display: "block", fontSize: "0.85em", ...muted }}>{detail}</span>}
          </span>
        ),
        date: formatDate(r.date, lang),
        amount: cents === undefined ? "" : <Money cents={cents} />,
        status: t(flagged ? STRINGS.flagged : matched ? GLOSSARY.match : STRINGS.unmatched, lang),
      },
    };
  });

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-12)" }} aria-live="polite">
      {fellBack && (
        <p data-testid="scenario-note" style={{ margin: 0, ...muted }}>
          {t(STRINGS.fallbackNote, lang)}
        </p>
      )}
      <LedgerTable
        testId="scenario-results"
        caption={<strong>{t(STRINGS.resultsHeading, lang)}</strong>}
        columns={[
          { key: "record", label: t(STRINGS.colRecord, lang) },
          { key: "date", label: t(STRINGS.colDate, lang) },
          { key: "amount", label: t(STRINGS.colAmount, lang), numeric: true },
          { key: "status", label: t(STRINGS.colStatus, lang) },
        ]}
        rows={rows}
      />
      {flags.map((f) => (
        <ScenarioFlag key={f.flagId} flag={f} lang={lang} />
      ))}
    </section>
  );
}

function ScenarioFlag({ flag, lang }: { flag: FlagState; lang: Lang }) {
  const contract = flag.recordIds.map((id) => getById(id)).find((e): e is Contract => !!e && "commissionBps" in e);
  const statement = flag.recordIds.map((id) => getById(id)).find((e): e is Statement => !!e && "lines" in e && "totalNetCents" in e);
  const bank = flag.recordIds.map((id) => getById(id)).find((e): e is BankTxn => !!e && "counterparty" in e && "amountCents" in e);
  const channel = contract ? getById<Channel>(contract.channelId) : undefined;
  const overLines = contract && statement ? statement.lines.filter((l) => l.commissionBps > contract.commissionBps) : [];

  return (
    <Flag testId="scenario-flag" reason={fill(STRINGS.flagReason, lang, { amount: formatCents(flag.deltaCents) })}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: "var(--c-space-8)" }}>
        {contract && (
          <EvidenceCard
            kind={t(GLOSSARY.contract, lang)}
            title={channel ? t(channel.name, lang) : t(GLOSSARY.gallery, lang)}
            figureLabel={t(STRINGS.expected, lang)}
            figure={<Money cents={flag.expectedCents} />}
            rows={[{ label: t(GLOSSARY.commission, lang), value: formatBps(contract.commissionBps) }]}
            state="trusted"
          />
        )}
        {statement && (
          <EvidenceCard
            kind={t(GLOSSARY.statement, lang)}
            title={formatDate(statement.issuedDate, lang)}
            figure={<Money cents={statement.totalNetCents} />}
            rows={overLines.map((l) => {
              const p = getById(l.pieceId);
              return {
                label: p && "title" in p ? t(p.title, lang) : t(GLOSSARY.piece, lang),
                value: fill(STRINGS.overCommission, lang, {
                  rate: formatBps(l.commissionBps),
                  contractRate: contract ? formatBps(contract.commissionBps) : "",
                }),
              };
            })}
            state="flagged"
          />
        )}
        {bank && (
          <EvidenceCard
            kind={t(GLOSSARY.bankRecord, lang)}
            title={formatDate(bank.date, lang)}
            figureLabel={t(STRINGS.actual, lang)}
            figure={<Money cents={flag.actualCents} />}
            rows={[{ label: t(STRINGS.difference, lang), value: <Money cents={-flag.deltaCents} /> }]}
          />
        )}
      </div>
    </Flag>
  );
}
