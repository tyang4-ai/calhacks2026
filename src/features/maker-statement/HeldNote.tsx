// M-maker-statement T3: what is held back from the maker and why (maker-statement-held), under the
// lines table. The payload's heldCents with the glossary's held note, then one plain line that ties
// it to the catch, the gallery's short payment (A1-12). Seal-red text with no alarm styling: no
// wash, no rule, no icon. Hidden when nothing is held.
import { Money } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface HeldNoteProps {
  lang: Lang;
  heldCents: number;
  compact?: boolean;
}

export function HeldNote({ lang, heldCents, compact = false }: HeldNoteProps) {
  if (heldCents === 0) return null;
  return (
    <div
      data-testid="maker-statement-held"
      role="note"
      aria-label={t(GLOSSARY.held, lang)}
      style={{
        color: "var(--c-color-seal)",
        fontFamily: lang === "zh" ? "var(--c-font-body-zh)" : "var(--c-font-body)",
        lineHeight: lang === "zh" ? "var(--c-leading-body-zh)" : "var(--c-leading-body)",
        fontSize: compact ? "var(--c-text-14)" : "var(--c-text-16)",
        // Lines the amount up with the table's amount column, whose cells pad 12.
        padding: compact ? 0 : "0 var(--c-space-12)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--c-space-12)" }}>
        <span style={{ fontWeight: 600, minWidth: 0 }}>{t(GLOSSARY.heldNote, lang)}</span>
        <Money
          cents={heldCents}
          style={{ color: "var(--c-color-seal)", fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
        />
      </div>
      <p style={{ margin: 0 }}>{t(UI.heldWhy, lang)}</p>
    </div>
  );
}
