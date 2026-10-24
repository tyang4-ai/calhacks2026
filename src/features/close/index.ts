// The close feature module: fills studio.close.main with the month close and its Excel workbook.
import type { FeatureModule } from "../../core/featureTypes";
import { ClosePanel } from "./ClosePanel";

const close: FeatureModule = {
  id: "close",
  slots: { "studio.close.main": ClosePanel },
};

export default close;
