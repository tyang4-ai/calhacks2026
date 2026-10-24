// The maker-statement feature module: fills maker.main with the maker's statement.
import type { FeatureModule } from "../../core/featureTypes";
import { MakerStatementView } from "./MakerStatementView";

const makerStatement: FeatureModule = {
  id: "maker-statement",
  slots: { "maker.main": MakerStatementView },
};

export default makerStatement;
