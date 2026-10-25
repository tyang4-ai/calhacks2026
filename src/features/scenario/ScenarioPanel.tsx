// The judge's scenario (studio.month.side): the drop zone, "Use the sample statement" and the
// results Cindy finds. The panel declares b05-scenario, so it shows the Simulated badge while that
// source is scripted. Requests go out with userEvent(); the sources registry answers them.
// On the desktop Sell site the panel fills the month view's right third and no more: its face is a
// flex column, the drop zone and the sample button keep their place at the top, and the results
// scroll inside the panel under them, so nothing ever spills out of the Sell frame.
import type { CSSProperties } from "react";
import type { SlotProps } from "../../core";
import { Button, Panel } from "../../ui";
import { DropZone } from "./DropZone";
import { ScenarioResults } from "./ScenarioResults";
import { STRINGS, t } from "./strings";
import { useSample } from "./useSample";

const bodyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--c-space-16)",
  flex: "1 1 auto",
  minHeight: 0,
};

const resultsStyle: CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
};

export function ScenarioPanel({ lang }: SlotProps) {
  const loadSample = useSample();
  return (
    <Panel
      testId="scenario-panel"
      sourceKeys={["b05-scenario"]}
      title={t(STRINGS.title, lang)}
      lang={lang}
      className="[&>div]:flex [&>div]:flex-col"
      style={{ height: "100%", boxSizing: "border-box" }}
    >
      <div style={bodyStyle}>
        <p style={{ margin: 0, color: "var(--c-color-ink-soft)", flex: "0 0 auto" }}>{t(STRINGS.intro, lang)}</p>
        <div style={{ flex: "0 0 auto" }}>
          <DropZone lang={lang} onUseSample={loadSample} />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <Button variant="quiet" testId="scenario-use-sample" onClick={loadSample}>
            {t(STRINGS.useSample, lang)}
          </Button>
        </div>
        <div style={resultsStyle}>
          <ScenarioResults lang={lang} />
        </div>
      </div>
    </Panel>
  );
}
