// The approvals feature module: fills owner.main, the Sell site's approvals view.
import type { FeatureModule } from "../../core/featureTypes";
import { ApprovalsView } from "./ApprovalsView";

const approvals: FeatureModule = {
  id: "approvals",
  slots: { "owner.main": ApprovalsView },
};

export default approvals;
