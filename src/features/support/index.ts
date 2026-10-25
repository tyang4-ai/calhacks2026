// The support feature module (F-support): one drawer component serves both support drawers and
// reads SlotProps.side, and the piece page's side panel is "Ask about this piece".
import type { FeatureModule } from "../../core/featureTypes";
import { AskAboutPiece } from "./AskAboutPiece";
import { SupportDrawer } from "./SupportDrawer";

const support: FeatureModule = {
  id: "support",
  slots: {
    "shop.drawer.support": SupportDrawer,
    "studio.drawer.support": SupportDrawer,
    "shop.piece.side": AskAboutPiece,
  },
};

export default support;
