// The storefront feature module: the storefront builder on Sell › Storefront and the public page at
// /store/:slug. No top-level side effects, so the shell can load it lazily inside its error boundary.
import type { FeatureModule } from "../../core/featureTypes";
import { StorefrontBuilder } from "./StorefrontBuilder";
import { StorePage } from "./StorePage";

const storefront: FeatureModule = {
  id: "storefront",
  slots: {
    "studio.storefront.main": StorefrontBuilder,
    "store.main": StorePage,
  },
};

export default storefront;
