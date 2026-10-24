// The scenario feature module: fills studio.month.side with the judge's scenario panel.
import type { FeatureModule } from "../../core/featureTypes";
import { ScenarioPanel } from "./ScenarioPanel";

const scenario: FeatureModule = {
  id: "scenario",
  slots: { "studio.month.side": ScenarioPanel },
};

export default scenario;
