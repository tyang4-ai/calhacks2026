// The ask-cindy feature module: fills studio.drawer.ask with the Ask Cindy drawer.
import type { FeatureModule } from "../../core/featureTypes";
import { AskDrawer } from "./AskDrawer";

const askCindy: FeatureModule = {
  id: "ask-cindy",
  slots: { "studio.drawer.ask": AskDrawer },
};

export default askCindy;
