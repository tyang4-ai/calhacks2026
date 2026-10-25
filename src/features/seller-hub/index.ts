// F-seller-hub: the Sell overview, the listing flow and the maker page's side panel.
import type { FeatureModule } from "../../core/featureTypes";
import { ListingsView } from "./ListingsView";
import { MakerSide } from "./MakerSide";
import { SellerOverview } from "./SellerOverview";

const sellerHub: FeatureModule = {
  id: "seller-hub",
  slots: {
    "studio.overview.main": SellerOverview,
    "studio.listings.main": ListingsView,
    "maker.side": MakerSide,
  },
};

export default sellerHub;
