// The proof feature module: fills studio.proof.main. No top-level side effects.
import type { FeatureModule } from "../../core/featureTypes";
import { ProofPanel } from "./ProofPanel";

const proof: FeatureModule = {
  id: "proof",
  slots: { "studio.proof.main": ProofPanel },
};

export default proof;
