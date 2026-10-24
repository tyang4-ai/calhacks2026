// The small areas: proof, impact, demo and scenario.
import type { DemoState, ImpactState, ProofState, ScenarioState } from "../state";
import { addId, areaReducer, put, same } from "./util";

export const proofReducer = areaReducer<ProofState>({
  "proof.scored": (s, e) =>
    same(s, { score: { ...e.payload, results: e.payload.results.map((r) => ({ ...r })) } }),
});

export const impactReducer = areaReducer<ImpactState>({
  "impact.updated": (s, e) => same(s, { latest: { ...e.payload } }),
});

export const demoReducer = areaReducer<DemoState>({
  "beat.started": (s, e) => same(s, { beatId: e.payload.beatId, camera: e.payload.camera }),
});

export const scenarioReducer = areaReducer<ScenarioState>({
  "scenario.loaded": (s, e) => {
    const p = e.payload;
    const loads = put(s.loads, p.scenarioId, { ...p, recordIds: p.recordIds ? [...p.recordIds] : undefined });
    const scenarioIds = addId(s.scenarioIds, p.scenarioId);
    return same(s, { loads, scenarioIds, latestScenarioId: p.scenarioId });
  },
});
