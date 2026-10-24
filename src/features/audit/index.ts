// The audit feature module: fills studio.drawer.audit with the audit trail drawer.
import type { FeatureModule } from "../../core/featureTypes";
import { AuditDrawer } from "./AuditDrawer";

const audit: FeatureModule = {
  id: "audit",
  slots: { "studio.drawer.audit": AuditDrawer },
};

export default audit;
