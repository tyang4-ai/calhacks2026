// The buyer feature module: fills the buyer.main slot with the buyer flow.
import type { FeatureModule } from "../../core/featureTypes";
import { BuyerFlow } from "./BuyerFlow";

const buyer: FeatureModule = {
  id: "buyer",
  slots: { "buyer.main": BuyerFlow },
};

export default buyer;
