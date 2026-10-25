// The process feature module: fills process.bar (the eleven blocks, the summary and presence) and
// process.view (the open process's view with its event log). No top-level side effects.
import type { FeatureModule } from "../../core/featureTypes";
import { ProcessBar } from "./ProcessBar";
import { ProcessViewHost } from "./ProcessViewHost";

const processFeature: FeatureModule = {
  id: "process",
  slots: { "process.bar": ProcessBar, "process.view": ProcessViewHost },
};

export default processFeature;
