// The judge's scenario (studio.month.side): the drop zone, "Use the sample statement" and the
// results Cindy finds. The panel declares b05-scenario, so it shows the Simulated badge while that
// source is scripted. Requests go out with userEvent(); the sources registry answers them.
import type { SlotProps } from "../../core";
import { Button, Panel } from "../../ui";
import { DropZone } from "./DropZone";
import { ScenarioResults } from "./ScenarioResults";
import { STRINGS, t } from "./strings";
import { useSample } from "./useSample";

export function ScenarioPanel({ lang }: SlotProps) {
  const loadSample = useSample();
  return (
    <Panel testId="scenario-panel" sourceKeys={["b05-scenario"]} title={t(STRINGS.title, lang)} lang={lang}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-16)" }}>
        <p style={{ margin: 0, color: "var(--c-color-ink-soft)" }}>{t(STRINGS.intro, lang)}</p>
        <DropZone lang={lang} onUseSample={loadSample} />
        <div>
          <Button variant="quiet" testId="scenario-use-sample" onClick={loadSample}>
            {t(STRINGS.useSample, lang)}
          </Button>
        </div>
        <ScenarioResults lang={lang} />
      </div>
    </Panel>
  );
}
