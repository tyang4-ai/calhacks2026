// F-maker-statement T2: what is held back from the maker and why, in seal-red text with no alarm styling.
// Hidden when nothing is held.
import { Money } from "../../ui";
import { GLOSSARY, t, type Lang } from "./strings";

export interface HeldNoteProps {
  lang: Lang;
  heldCents: number;
}

export function HeldNote({ lang, heldCents }: HeldNoteProps) {
  if (heldCents === 0) return null;
  return (
    <div
      data-testid="maker-statement-held"
      style={{
        color: "var(--c-color-seal)",
        fontFamily: lang === "zh" ? "var(--c-font-body-zh)" : "var(--c-font-body)",
        lineHeight: lang === "zh" ? "var(--c-leading-body-zh)" : "var(--c-leading-body)",
        fontSize: "var(--c-text-16)",
        padding: "var(--c-space-8) 0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--c-space-12)" }}>
        <span>{t(GLOSSARY.held, lang)}</span>
        <Money
          cents={heldCents}
          style={{ color: "var(--c-color-seal)", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
        />
      </div>
      <p style={{ margin: 0, fontSize: "var(--c-text-14)" }}>{t(GLOSSARY.heldNote, lang)}</p>
    </div>
  );
}
