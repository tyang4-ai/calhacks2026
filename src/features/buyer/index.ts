// The buyer feature module. It fills the desktop piece page (shop.piece.main) and receipt page
// (shop.receipt.main). M-buyer T7 retired v1's phone flow (buyer.main) after G4v2.
import type { FeatureModule } from "../../core/featureTypes";
import { PiecePage } from "./PiecePage";
import { ReceiptPage } from "./ReceiptPage";

const buyer: FeatureModule = {
  id: "buyer",
  slots: {
    "shop.piece.main": PiecePage,
    "shop.receipt.main": ReceiptPage,
  },
};

export default buyer;
