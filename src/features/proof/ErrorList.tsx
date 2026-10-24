// The four planted errors in answer-key order: each one's kind, the records it involves, what a
// correct matcher reports, why it's there, and the verdict from proof.scored (caught, missed, or
// waiting for the score before the event arrives).
import type { CSSProperties, ReactNode } from "react";
import { useCindia } from "../../core";
import type { BankTxn, ChannelPayout, Order, Piece, PlantedError, Refund, Statement, Text } from "../../core/types";
import { answerKey, answerKeyNotes, getById } from "../../mock";
import { Badge, Flag, formatCents, formatDate, formatMonth } from "../../ui";
import { EXPECTED, KIND_LABELS, UI, recordTypeLabel, t, type Lang } from "./strings";

type Verdict = "caught" | "missed" | "pending";

const num = (v: unknown): number => (typeof v === "number" ? v : 0);

/** A short detail for a record: an order's piece, a payout's or bank record's date, a statement's month. */
function recordDetail(id: string, lang: Lang): string | null {
  const prefix = id.split("_")[0];
  if (prefix === "ord") {
    const order = getById<Order>(id);
    const piece = order ? getById<Piece>(order.pieceId) : undefined;
    return piece ? t(piece.title, lang) : null;
  }
  if (prefix === "pay") {
    const p = getById<ChannelPayout>(id);
    return p ? formatDate(p.date, lang) : null;
  }
  if (prefix === "txn") {
    const b = getById<BankTxn>(id);
    return b ? formatDate(b.date, lang) : null;
  }
  if (prefix === "rfd") {
    const r = getById<Refund>(id);
    return r ? formatDate(r.date, lang) : null;
  }
  if (prefix === "stm") {
    const s = getById<Statement>(id);
    return s ? formatMonth(s.monthId, lang) : null;
  }
  return null;
}

function recordLabel(id: string, lang: Lang): string {
  const type = recordTypeLabel(id);
  const detail = recordDetail(id, lang);
  const head = type ? `${t(type, lang)} ${id}` : id;
  return detail ? `${head} · ${detail}` : head;
}

/** What a correct matcher reports for one planted error. */
function expectedLine(err: PlantedError, lang: Lang): Text {
  const e = err.expected;
  switch (err.kind) {
    case "short_payment":
      return EXPECTED.shortPayment(formatCents(num(e.expectedCents)), formatCents(num(e.actualCents)), formatCents(num(e.deltaCents)));
    case "bundled":
      return EXPECTED.bundled(err.recordIds.filter((id) => id.startsWith("ord_")).length);
    case "refund_netted":
      return EXPECTED.refundNetted();
    case "carried_over":
      return EXPECTED.carriedOver(typeof e.intoMonthId === "string" ? formatMonth(e.intoMonthId, lang) : "");
  }
}

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "var(--c-space-12)",
  padding: "var(--c-space-16)",
  border: "1px solid var(--c-color-line)",
  borderRadius: "var(--c-space-4)",
  background: "var(--c-color-paper)",
};

const labelStyle: CSSProperties = {
  fontSize: "var(--c-text-14)",
  color: "var(--c-color-ink-soft)",
  marginRight: "var(--c-space-8)",
};

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ fontSize: "var(--c-text-14)" }}>
      <span style={labelStyle}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

function VerdictMark({ verdict, lang }: { verdict: Verdict; lang: Lang }) {
  if (verdict === "caught") {
    return (
      <Badge variant="jade">
        <span aria-hidden="true">✓ </span>
        {t(UI.caught, lang)}
      </Badge>
    );
  }
  if (verdict === "missed") return <Flag reason={t(UI.missed, lang)} />;
  return <Badge variant="neutral">{t(UI.pending, lang)}</Badge>;
}

export function ErrorList({ lang }: { lang: Lang }) {
  const score = useCindia((s) => s.proof.score);

  const verdictFor = (errorId: string): Verdict => {
    if (!score) return "pending";
    const r = score.results.find((x) => x.errorId === errorId);
    if (!r) return "pending";
    return r.caught ? "caught" : "missed";
  };

  return (
    <section lang={lang} style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-12)", minWidth: 0 }}>
      <h3 style={{ margin: 0, fontSize: "var(--c-text-18)" }}>{t(UI.errorsTitle, lang)}</h3>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--c-space-12)" }}>
        {answerKey.map((err) => {
          const note = answerKeyNotes[err.id];
          return (
            <li key={err.id} data-testid={`proof-item-${err.id}`} style={rowStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)", minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "var(--c-text-16)" }}>{t(KIND_LABELS[err.kind], lang)}</div>
                <Line label={t(UI.records, lang)}>
                  {err.recordIds.map((id, i) => (
                    <span key={id}>
                      {i > 0 && "; "}
                      {recordLabel(id, lang)}
                    </span>
                  ))}
                </Line>
                <Line label={t(UI.expected, lang)}>{t(expectedLine(err, lang), lang)}</Line>
                {note && <Line label={t(UI.why, lang)}>{t(note, lang)}</Line>}
              </div>
              <div style={{ alignSelf: "start" }}>
                <VerdictMark verdict={verdictFor(err.id)} lang={lang} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default ErrorList;
