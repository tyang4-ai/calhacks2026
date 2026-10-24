// The proof view: the scoreboard, the four planted errors and the real or simulated list, inside
// one kit Panel that declares b03-proof, so it shows the Simulated badge while the score is scripted.
import type { SlotProps } from "../../core/featureTypes";
import type { SourceKey } from "../../core/events";
import { Panel } from "../../ui";
import { ErrorList } from "./ErrorList";
import { Scoreboard } from "./Scoreboard";
import { SourceList } from "./SourceList";
import { GLOSSARY, UI, t } from "./strings";

const SOURCE_KEYS: SourceKey[] = ["b03-proof"];

export function ProofPanel({ lang }: SlotProps) {
  return (
    <Panel
      sourceKeys={SOURCE_KEYS}
      title={t(GLOSSARY.proof, lang)}
      lang={lang}
      style={{ height: "100%", boxSizing: "border-box", overflow: "auto" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-24)", minHeight: 0 }}>
        <p style={{ margin: 0, color: "var(--c-color-ink-soft)" }}>{t(UI.intro, lang)}</p>
        <Scoreboard lang={lang} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
            gap: "var(--c-space-24)",
            alignItems: "start",
          }}
        >
          <ErrorList lang={lang} />
          <SourceList lang={lang} />
        </div>
      </div>
    </Panel>
  );
}

export default ProofPanel;
