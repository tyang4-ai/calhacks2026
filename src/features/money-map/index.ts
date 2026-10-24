// The money-map feature module: fills studio.map.main. No top-level side effects.
import type { FeatureModule } from "../../core";
import { MoneyMap } from "./MoneyMap";

const moneyMap: FeatureModule = {
  id: "money-map",
  slots: { "studio.map.main": MoneyMap },
};

export default moneyMap;
