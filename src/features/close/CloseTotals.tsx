// The month's close totals, straight from the month.closed payload. Before the close, a quiet note.
import type { Payloads } from "../../core/events";
import { Money } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface CloseTotalsProps {
  closed: Payloads["month.closed"] | null;
  lang: Lang;
}

export function CloseTotals({ closed, lang }: CloseTotalsProps) {
  if (!closed) {
    return <p style={{ color: "var(--c-color-ink-soft)", margin: "0 0 16px" }}>{t(UI.notClosedYet, lang)}</p>;
  }
  const rows = [
    { label: GLOSSARY.sales, cents: closed.salesCents, tone: "neutral" as const },
    { label: GLOSSARY.fees, cents: closed.feesCents, tone: "neutral" as const },
    { label: GLOSSARY.makerPay, cents: closed.makerPayCents, tone: "neutral" as const },
    { label: GLOSSARY.held, cents: closed.heldCents, tone: "pending" as const },
  ];
  return (
    <section data-testid="close-totals" style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>{t(UI.totalsTitle, lang)}</h3>
      <dl style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, margin: 0 }}>
        {rows.map((r) => (
          <div key={r.label.en}>
            <dt style={{ color: "var(--c-color-ink-soft)", fontSize: "0.875rem" }}>{t(r.label, lang)}</dt>
            <dd style={{ margin: "4px 0 0", fontSize: "1.25rem" }}>
              <Money cents={r.cents} tone={r.tone} />
            </dd>
          </div>
        ))}
      </dl>
      {closed.heldCents > 0 && (
        <p style={{ color: "var(--c-color-ink-soft)", fontSize: "0.875rem", margin: "8px 0 0" }}>{t(GLOSSARY.heldNote, lang)}</p>
      )}
    </section>
  );
}
