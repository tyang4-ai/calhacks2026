// The impact feature module: fills studio.close.side with the impact numbers.
import type { FeatureModule } from "../../core/featureTypes";
import { ImpactPanel } from "./ImpactPanel";

const impact: FeatureModule = {
  id: "impact",
  slots: { "studio.close.side": ImpactPanel },
};

export default impact;
