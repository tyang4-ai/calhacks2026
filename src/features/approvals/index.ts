// The approvals feature module: fills owner.main with the owner's inbox.
import type { FeatureModule } from "../../core/featureTypes";
import { OwnerInbox } from "./OwnerInbox";

const approvals: FeatureModule = {
  id: "approvals",
  slots: { "owner.main": OwnerInbox },
};

export default approvals;
