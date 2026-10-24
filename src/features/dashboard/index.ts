// The dashboard feature module: fills studio.dashboard.main with the assembling dashboard.
import type { FeatureModule } from "../../core/featureTypes";
import { Dashboard } from "./Dashboard";

const dashboard: FeatureModule = {
  id: "dashboard",
  slots: { "studio.dashboard.main": Dashboard },
};

export default dashboard;
