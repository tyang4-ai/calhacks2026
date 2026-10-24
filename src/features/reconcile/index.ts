// The reconcile feature module: fills studio.month.main. No top-level side effects.
import type { FeatureModule } from "../../core/featureTypes";
import { ReconcileView } from "./ReconcileView";

const reconcile: FeatureModule = {
  id: "reconcile",
  slots: { "studio.month.main": ReconcileView },
};

export default reconcile;
