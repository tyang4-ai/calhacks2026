// The month view: the catch on top once a flag exists, the month timeline under it, inside one kit
// Panel that declares b01-match and b02-explain, so it shows the Simulated badge while either is
// scripted. The catch keeps a fixed place at the top, where the studio-catch camera zooms.
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { Panel } from "../../ui";
import { CatchPanel } from "./CatchPanel";
import { MonthTimeline } from "./MonthTimeline";
import { UI } from "./strings";

const SOURCE_KEYS = ["b01-match", "b02-explain"] as const;

export function ReconcileView({ lang }: SlotProps) {
  const hasFlag = useCindia((s) => s.month.flagIds.length > 0);
  return (
    <Panel
      sourceKeys={[...SOURCE_KEYS]}
      title={UI.panelTitle[lang]}
      lang={lang}
      style={{ height: "100%", boxSizing: "border-box" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--c-space-16)",
          minHeight: 0,
        }}
      >
        {hasFlag && <CatchPanel lang={lang} />}
        <MonthTimeline lang={lang} />
      </div>
    </Panel>
  );
}
