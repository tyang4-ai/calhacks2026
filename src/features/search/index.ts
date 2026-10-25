// The search feature module: Shop home, the results page and the search proof on Sell › Proof.
// No top-level side effects, so the shell can load it lazily inside its error boundary.
import type { FeatureModule } from "../../core/featureTypes";
import { HomeView } from "./HomeView";
import { ResultsView } from "./ResultsView";
import { SearchProof } from "./SearchProof";

const search: FeatureModule = {
  id: "search",
  slots: {
    "shop.home.main": HomeView,
    "shop.search.main": ResultsView,
    "studio.proof.side": SearchProof,
  },
};

export default search;
