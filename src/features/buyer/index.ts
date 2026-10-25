// The buyer feature module. It fills the desktop piece page (shop.piece.main) and receipt page
// (shop.receipt.main), and keeps v1's phone flow in buyer.main on the Phase A legacy page until
// M-buyer T7 retires it after G4v2.
import type { FeatureModule } from "../../core/featureTypes";
import { BuyerFlow } from "./BuyerFlow";
import { PiecePage } from "./PiecePage";
import { ReceiptPage } from "./ReceiptPage";

const buyer: FeatureModule = {
  id: "buyer",
  slots: {
    "buyer.main": BuyerFlow,
    "shop.piece.main": PiecePage,
    "shop.receipt.main": ReceiptPage,
  },
};

export default buyer;
