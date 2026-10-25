// The small areas: proof, impact, demo, scenario, surprise, wip and sync.
import type { DemoState, ImpactState, MilestoneState, ProofState, ScenarioState, SurpriseState, SyncState, WipState } from "../state";
import { addId, areaReducer, copy, latestAt, newest, put, same, stamped } from "./util";

export const proofReducer = areaReducer<ProofState>({
  "proof.scored": (s, e) =>
    same(s, { score: { ...e.payload, results: e.payload.results.map((r) => ({ ...r })) } }),
});

export const impactReducer = areaReducer<ImpactState>({
  "impact.updated": (s, e) => same(s, { latest: { ...e.payload } }),
});

export const demoReducer = areaReducer<DemoState>({
  "beat.started": (s, e) =>
    same(s, {
      beatId: e.payload.beatId,
      camera: e.payload.camera,
      process: e.payload.process ?? null,
      drawer: e.payload.drawer ?? null,
    }),
});

export const scenarioReducer = areaReducer<ScenarioState>({
  "scenario.loaded": (s, e) => {
    const p = e.payload;
    const loads = put(s.loads, p.scenarioId, { ...p, recordIds: p.recordIds ? [...p.recordIds] : undefined });
    const scenarioIds = addId(s.scenarioIds, p.scenarioId);
    return same(s, { loads, scenarioIds, latestScenarioId: p.scenarioId });
  },
});

export const surpriseReducer = areaReducer<SurpriseState>({
  "surprise.asked": (s, e) => {
    const id = e.payload.surpriseId;
    const prev = s.asks[id];
    const asks = put(s.asks, id, stamped(prev, copy(e.payload), e.at));
    const latest = s.latestSurpriseId ? s.asks[s.latestSurpriseId] : undefined;
    const latestSurpriseId = latestAt(s.latestSurpriseId, latest?.at, id, asks[id].at, !prev);
    return same(s, { ...s, asks, latestSurpriseId });
  },
  "surprise.drawn": (s, e) => {
    const id = e.payload.surpriseId;
    const draws = put(s.draws, id, stamped(s.draws[id], copy(e.payload), e.at));
    return draws === s.draws ? s : { ...s, draws };
  },
});

export const wipReducer = areaReducer<WipState>({
  "wip.milestone_reached": (s, e) => {
    const { wipId, milestoneId, date } = e.payload;
    const prev = s.milestones[milestoneId];
    if (prev?.status === "paid") return s; // a paid milestone never goes back to reached
    const next: MilestoneState = stamped<Omit<MilestoneState, "at">>(prev, { wipId, status: "reached", date }, e.at);
    const milestones = put(s.milestones, milestoneId, next);
    return milestones === s.milestones ? s : { milestones };
  },
  "wip.milestone_paid": (s, e) => {
    const { wipId, milestoneId, amountCents, date } = e.payload;
    const next: MilestoneState = stamped<Omit<MilestoneState, "at">>(s.milestones[milestoneId], { wipId, status: "paid", date, amountCents }, e.at);
    const milestones = put(s.milestones, milestoneId, next);
    return milestones === s.milestones ? s : { milestones };
  },
});

export const syncReducer = areaReducer<SyncState>({
  "data.synced": (s, e) => same(s, { ...s, data: newest(s.data, copy(e.payload), e.at) }),
  "index.synced": (s, e) => same(s, { ...s, index: newest(s.index, copy(e.payload), e.at) }),
});
