// The communities feature module: the strip on Shop home, the community pages, the projects pages
// and Sell › Projects. No top-level side effects, so the shell can load it lazily inside its error
// boundary.
import type { FeatureModule } from "../../core/featureTypes";
import { CommunityPage } from "./CommunityPage";
import { CommunityStrip } from "./CommunityStrip";
import { ProjectsView } from "./ProjectsView";
import { SellProjects } from "./SellProjects";

const communities: FeatureModule = {
  id: "communities",
  slots: {
    "shop.home.communities": CommunityStrip,
    "shop.community.main": CommunityPage,
    "shop.projects.main": ProjectsView,
    "studio.projects.main": SellProjects,
  },
};

export default communities;
