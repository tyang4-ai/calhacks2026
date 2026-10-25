// F-watch: the counterfeit watch on /sell/watch.
import type { FeatureModule } from "../../core/featureTypes";
import { WatchView } from "./WatchView";

const watch: FeatureModule = {
  id: "watch",
  slots: {
    "studio.watch.main": WatchView,
  },
};

export default watch;
