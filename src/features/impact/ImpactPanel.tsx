// The impact panel in studio.close.side: three numbers that count up when the month closes, each
// labeled an estimate while the impact.updated payload says so.
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import { Panel } from "../../ui";
import { EstimateLabel, EstimateNote } from "./EstimateNote";
import { ImpactNumbers } from "./ImpactNumbers";
import { GLOSSARY, UI, t } from "./strings";

export function ImpactPanel({ lang }: SlotProps) {
  const impact = useCindia((s) => s.impact.latest);
  const estimate = impact?.estimate === true;
  return (
    <Panel title={t(GLOSSARY.impact, lang)} sourceKeys={["b10-derived"]} lang={lang}>
      <ImpactNumbers impact={impact} lang={lang} estimateLabel={<EstimateLabel estimate={estimate} lang={lang} />} />
      {impact === null ? (
        <p className="c-impact__not-yet" style={{ margin: "16px 0 0", fontSize: 14, color: "var(--c-color-ink-soft)" }}>
          {t(UI.notYet, lang)}
        </p>
      ) : (
        <EstimateNote estimate={estimate} lang={lang} />
      )}
    </Panel>
  );
}
