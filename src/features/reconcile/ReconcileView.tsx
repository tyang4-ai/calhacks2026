// The month view: the catch on top once a flag exists, the month timeline under it, inside one kit
// Panel that declares b01-match, b02-explain and b16-bank-books (B16 re-checks the flag against
// Nessie), so it shows the Simulated badge while any of them is scripted. The catch keeps a fixed
// place at the top, where the sell-catch camera zooms.
// The panel fills its slot and no more: its face is a flex column and the content under the title
// scrolls inside it, so the panel's bottom edge stays in the console's view area.
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { Panel } from "../../ui";
import { CatchPanel } from "./CatchPanel";
import { MonthTimeline } from "./MonthTimeline";
import { UI } from "./strings";

const SOURCE_KEYS = ["b01-match", "b02-explain", "b16-bank-books"] as const;

export function ReconcileView({ lang }: SlotProps) {
  const hasFlag = useCindia((s) => s.month.flagIds.length > 0);
  return (
    <Panel
      sourceKeys={[...SOURCE_KEYS]}
      title={UI.panelTitle[lang]}
      lang={lang}
      className="[&>div]:flex [&>div]:flex-col"
      style={{ height: "100%", boxSizing: "border-box" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--c-space-16)",
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        {hasFlag && <CatchPanel lang={lang} />}
        <MonthTimeline lang={lang} compactHandled={hasFlag} />
      </div>
    </Panel>
  );
}
