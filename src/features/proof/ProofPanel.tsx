// The proof view: the scoreboard, the four planted errors and the real or simulated list, inside
// one kit Panel that declares b03-proof, so it shows the Simulated badge while the score is scripted.
// On the desktop Sell site the panel has the proof view's left two thirds, beside F-search's model
// score in studio.proof.side: the score and its bar share the top row over the intro, the four test cases sit in
// a two-by-two grid under them, so all four show at the end of the proof beat, and the real or
// simulated list follows in two columns. Anything longer scrolls inside the panel, never the page.
import type { CSSProperties } from "react";
import type { SlotProps } from "../../core/featureTypes";
import type { SourceKey } from "../../core/events";
import { Panel } from "../../ui";
import { ErrorList } from "./ErrorList";
import { Scoreboard } from "./Scoreboard";
import { SourceList } from "./SourceList";
import { GLOSSARY, UI, t } from "./strings";

const SOURCE_KEYS: SourceKey[] = ["b03-proof"];

const bodyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--c-space-12)",
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
};

const topStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--c-space-8)",
};

export function ProofPanel({ lang }: SlotProps) {
  return (
    <Panel
      sourceKeys={SOURCE_KEYS}
      title={t(GLOSSARY.proof, lang)}
      lang={lang}
      className="[&>div]:flex [&>div]:flex-col"
      style={{ height: "100%", boxSizing: "border-box" }}
    >
      <div style={bodyStyle}>
        <div style={topStyle}>
          <Scoreboard lang={lang} />
          <p style={{ margin: 0, color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-14)" }}>{t(UI.intro, lang)}</p>
        </div>
        <ErrorList lang={lang} />
        <SourceList lang={lang} />
      </div>
    </Panel>
  );
}

export default ProofPanel;
