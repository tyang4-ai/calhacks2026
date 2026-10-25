// The start list (F-audit T3): the month's traceable figures, each a button that opens its trail.
// The maker payouts, the flag and the buyer's order all come from src/mock/; nothing is typed in.
import type { CSSProperties } from "react";
import type { MakerPayout, Order, Person, Piece, Text } from "../../core/types";
import { useCindia } from "../../core/store";
import { flags, getById, makerPayouts, orders } from "../../mock";
import { Money, formatDate, formatMonth } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface StartListProps {
  lang: Lang;
  onPick: (recordId: string) => void;
}

interface StartFigure {
  recordId: string;
  label: Text;
  /** A second line under the label, or null. */
  detail: Text | null;
  cents: number;
  tone: "neutral" | "out";
}

function joinText(a: Text, b: Text, sep = " · "): Text {
  return { en: `${a.en}${sep}${b.en}`, zh: `${a.zh}${sep}${b.zh}` };
}

/** The buyer's order: the month's first order by date, then by ID. */
function buyersOrder(): Order | undefined {
  return orders.toSorted((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)))[0];
}

/** The figures the list offers, in order: the maker payouts, the flag, the buyer's order. */
function startFigures(): StartFigure[] {
  const out: StartFigure[] = [];
  for (const mp of makerPayouts as MakerPayout[]) {
    const maker = getById<Person>(mp.makerId);
    out.push({
      recordId: mp.id,
      label: maker ? joinText(GLOSSARY.makerPayout, maker.name) : GLOSSARY.makerPayout,
      detail: null,
      cents: mp.amountCents,
      tone: "neutral",
    });
  }
  for (const f of flags) {
    out.push({ recordId: f.id, label: GLOSSARY.shortPayment, detail: f.explanation, cents: f.deltaCents, tone: "out" });
  }
  const o = buyersOrder();
  if (o) {
    const piece = getById<Piece>(o.pieceId);
    out.push({
      recordId: o.id,
      label: piece ? joinText(UI.buyersOrder, piece.title) : UI.buyersOrder,
      detail: null,
      cents: o.grossCents,
      tone: "neutral",
    });
  }
  return out;
}

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--c-space-8)",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "var(--c-space-12)",
  padding: "var(--c-space-12)",
  textAlign: "left",
  background: "var(--c-color-paper)",
  color: "var(--c-color-ink)",
  border: "1px solid var(--c-color-line)",
  borderRadius: "var(--c-radius-control)",
  font: "inherit",
  cursor: "pointer",
};

const quietStyle: CSSProperties = {
  margin: 0,
  color: "var(--c-color-ink-soft)",
  fontSize: "var(--c-text-14)",
};

export function StartList({ lang, onPick }: StartListProps) {
  const closed = useCindia((s) => s.month.closed);
  const monthId = useCindia((s) => s.month.monthId);
  const sent = useCindia((s) => s.approvals.payouts);
  const figures = startFigures();
  const shownMonth = closed?.monthId ?? monthId ?? makerPayouts[0]?.monthId ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-12)" }}>
      <p style={{ ...quietStyle, color: "var(--c-color-ink)" }}>
        {t(UI.pickFigure, lang)}
        {shownMonth && <span style={{ color: "var(--c-color-ink-soft)" }}> · {formatMonth(shownMonth, lang)}</span>}
      </p>
      {closed === null && <p style={quietStyle}>{t(UI.beforeClose, lang)}</p>}
      <ul data-testid="audit-start-list" style={listStyle}>
        {figures.map((f) => {
          const paid = sent[f.recordId];
          return (
            <li key={f.recordId}>
              <button type="button" data-testid={`audit-start-${f.recordId}`} style={buttonStyle} onClick={() => onPick(f.recordId)}>
                <span style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-4)", minWidth: 0 }}>
                  <span>{t(f.label, lang)}</span>
                  {f.detail && (
                    <span style={{ ...quietStyle, overflowWrap: "anywhere" }}>
                      {t(f.detail, lang)}
                    </span>
                  )}
                  {paid && (
                    <span style={quietStyle}>
                      {t(GLOSSARY.payoutDate, lang)}: {formatDate(paid.date, lang)}
                    </span>
                  )}
                </span>
                <Money cents={f.cents} tone={f.tone} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
