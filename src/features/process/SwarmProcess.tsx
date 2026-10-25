// The swarm view (T3), process-pane-swarm:
// - the kit AgentGraph (process-swarm-graph) with the roster's agents that took part in the selected
//   run, Cindy at the center with an edge to each specialist. A node lights when its step is in the
//   store and the player clock has reached its `at`, never on wall time. A step whose toolName is
//   elastic_agent is drawn on a tool node, Elastic Agent Builder, beside the Finder (C-3);
// - one row per step (process-swarm-step-<stepId>): the agent's name from the roster, the step's
//   kind, tool, model, ms and summary, the Rule-based badge on code agents, and the step's source and
//   key, so a judge can tell a B13-streamed step from a scripted one;
// - process-swarm-run-picker chooses the run. When the tour opened the view (the store's demo.process
//   is swarm) the default is the newest run from src/mock/swarm.ts, never a run_user_ run (B2-15);
//   anywhere else the newest run;
// - in live mode, process-swarm-shared shows L18.
import { useCallback, useState } from "react";
import type { Payloads } from "../../core/events";
import type { CindiaState, LogEntry, Stamped } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Lang } from "../../core/types";
import { agents, getAgent, swarmRuns } from "../../mock";
import { AgentGraph, Badge, usePlayerTime, type AgentGraphNode, type GraphEdgeIn, type GraphStepIn } from "../../ui";
import { Empty, Quiet, SectionHead } from "./parts";
import { formatMs } from "./readers";
import { ELASTIC_AGENT_TOOL, EMPTY, GLOSSARY, L18, STEP_KIND_LABELS, SWARM, t } from "./strings";

type Step = Stamped<Payloads["swarm.step"]>;

const SCRIPTED_RUN_IDS = new Set(swarmRuns.map((r) => r.runId));
/** Each roster agent's place, so the graph's nodes keep the roster's order. */
const ROSTER_ORDER = new Map(agents.map((a, i) => [a.agentId, i]));
const ELASTIC_TOOL = "elastic_agent";
const GRAPH_W = 480;
const GRAPH_H = 372;

interface RunOption {
  runId: string;
  steps: number;
  done: boolean;
}

/** The run the view shows when nobody picked one (B2-15). */
function defaultRunId(s: CindiaState): string | null {
  const ids = s.swarm.runIds;
  if (ids.length === 0) return null;
  const newest = (candidates: string[]) => {
    let best: string | null = null;
    for (const id of candidates) if (best === null || s.swarm.runs[id].firstAt >= s.swarm.runs[best].firstAt) best = id;
    return best;
  };
  if (s.demo.process === "swarm") {
    const scripted = newest(ids.filter((id) => SCRIPTED_RUN_IDS.has(id)));
    if (scripted) return scripted;
  }
  return newest(ids);
}

/**
 * The source and key of each step's event, from the log. A step keeps the `at` of its event, so the
 * log's swarm.step entries at that time are its candidates; steps sharing one `at` take them in the
 * order they arrived (runs in arrival order, then each run's steps in order).
 */
function stepSources(s: CindiaState): Record<string, Pick<LogEntry, "source" | "key">> {
  const byAt = new Map<number, LogEntry[]>();
  for (const e of s.log.entries) {
    if (e.type !== "swarm.step") continue;
    const list = byAt.get(e.at) ?? [];
    list.push(e);
    byAt.set(e.at, list);
  }
  const used = new Map<number, number>();
  const out: Record<string, Pick<LogEntry, "source" | "key">> = {};
  for (const runId of s.swarm.runIds) {
    for (const stepId of s.swarm.runs[runId]?.stepIds ?? []) {
      const step = s.swarm.steps[stepId];
      if (!step) continue;
      const list = byAt.get(step.at);
      if (!list || list.length === 0) continue;
      const n = used.get(step.at) ?? 0;
      const e = list[Math.min(n, list.length - 1)];
      used.set(step.at, n + 1);
      out[stepId] = e.key ? { source: e.source, key: e.key } : { source: e.source };
    }
  }
  return out;
}

function swarmView(s: CindiaState) {
  const runs: RunOption[] = s.swarm.runIds
    .map((runId) => ({ runId, steps: s.swarm.runs[runId].stepIds.length, done: s.swarm.runs[runId].done }))
    .toReversed();
  return {
    runs,
    defaultRun: defaultRunId(s),
    stepsByRun: Object.fromEntries(s.swarm.runIds.map((id) => [id, s.swarm.runs[id].stepIds.map((sid) => s.swarm.steps[sid]).filter(Boolean)])) as Record<string, Step[]>,
    sources: stepSources(s),
    live: s.mode === "live",
  };
}

function agentName(agentId: string, lang: Lang): string {
  const a = getAgent(agentId);
  return a ? t(a.name, lang) : agentId;
}

/** The graph's nodes, edges and steps for one run. */
function graphFor(steps: Step[]) {
  const roster = [...new Set(steps.map((s) => s.agentId))].toSorted((a, b) => (ROSTER_ORDER.get(a) ?? 99) - (ROSTER_ORDER.get(b) ?? 99));
  const hub = roster.includes("cindy") ? "cindy" : roster[0];
  const usesElastic = steps.find((s) => s.toolName === ELASTIC_TOOL);
  // The kit puts a tool beside its agent, clockwise along the ring. Only at the top of the ring does
  // that keep the tool and its two-line label clear of the agent's own label and inside the drawing
  // (G3 F1), so the agent that calls Elastic Agent Builder goes first on the ring.
  const partner = usesElastic && usesElastic.agentId !== hub ? usesElastic.agentId : null;
  const ring = roster.filter((id) => id !== hub);
  const agentIds = [hub, ...(partner ? [partner, ...ring.filter((id) => id !== partner)] : ring)];
  const nodes: AgentGraphNode[] = agentIds.map((id) => {
    const a = getAgent(id);
    return { id, label: a ? a.name : { en: id, zh: id }, kind: a?.kind === "code" ? "code" : "claude" };
  });
  const edges: GraphEdgeIn[] = agentIds.filter((id) => id !== hub).map((id) => ({ from: hub, to: id }));
  if (usesElastic) {
    nodes.push({ id: ELASTIC_TOOL, label: ELASTIC_AGENT_TOOL, kind: "tool" });
    edges.push({ from: usesElastic.agentId, to: ELASTIC_TOOL });
  }
  const graphSteps: GraphStepIn[] = steps.map((s) => ({ stepId: s.stepId, agentId: s.toolName === ELASTIC_TOOL ? ELASTIC_TOOL : s.agentId, at: s.at }));
  return { nodes, edges, graphSteps, hub };
}

function StepRow({ step, n, lang, source }: { step: Step; n: number; lang: Lang; source?: Pick<LogEntry, "source" | "key"> }) {
  const agent = getAgent(step.agentId);
  const tool = step.toolName === ELASTIC_TOOL ? t(ELASTIC_AGENT_TOOL, lang) : step.toolName;
  return (
    <li
      data-testid={`process-swarm-step-${step.stepId}`}
      data-agent-id={step.agentId}
      data-kind={step.kind}
      data-source={source?.source}
      data-key={source?.key}
      className="flex flex-col gap-0.5 py-1.5"
      style={{ borderBottom: "1px solid var(--c-color-line)" }}
    >
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5" style={{ fontSize: "var(--c-text-14)" }}>
        <span className="tabular-nums" style={{ color: "var(--c-color-ink-soft)", minWidth: 18 }}>
          {n}
        </span>
        <span className="font-semibold" data-role="agent">
          {agentName(step.agentId, lang)}
        </span>
        {agent?.kind === "code" && <Badge variant="rule" />}
        <span data-role="kind">
          {t(STEP_KIND_LABELS[step.kind], lang)}
        </span>
        {tool && (
          <span data-role="tool">
            {tool}
          </span>
        )}
        <span data-role="model" style={{ color: "var(--c-color-ink-soft)" }}>
          {step.model ?? (agent?.kind === "code" ? t(GLOSSARY.ruleBased, lang) : t(SWARM.noModel, lang))}
        </span>
        <span data-role="ms" className="tabular-nums">
          {formatMs(step.ms)}
        </span>
        {source && (
          <span data-role="source" style={{ color: source.source === "live" ? "var(--c-color-jade)" : "var(--c-color-ink-soft)" }}>
            {source.source}
            {source.key ? ` · ${source.key}` : ""}
          </span>
        )}
      </span>
      <span data-role="summary">{t(step.summary, lang)}</span>
    </li>
  );
}

export function SwarmProcess({ lang }: { lang: Lang }) {
  const v = useCindia(useCallback((s: CindiaState) => swarmView(s), []));
  const now = usePlayerTime();
  const [picked, setPicked] = useState<string | null>(null);
  const runId = picked && v.stepsByRun[picked] ? picked : v.defaultRun;
  const steps = runId ? (v.stepsByRun[runId] ?? []) : [];
  const graph = graphFor(steps);

  if (!runId) {
    return (
      <div data-testid="process-pane-swarm">
        <div data-testid="process-swarm-graph">
          <Empty text={EMPTY.swarm} lang={lang} />
        </div>
        {v.live && (
          <p data-testid="process-swarm-shared">
            <Quiet>{t(L18, lang)}</Quiet>
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-testid="process-pane-swarm" data-run-id={runId} className="flex flex-wrap gap-6">
      <div className="flex min-w-0 flex-col gap-2 [&_figure]:max-w-full [&_svg]:h-auto [&_svg]:max-w-full" style={{ flex: `1 1 ${GRAPH_W}px`, maxWidth: GRAPH_W }}>
        <AgentGraph testId="process-swarm-graph" nodes={graph.nodes} edges={graph.edges} steps={graph.graphSteps} now={now} lang={lang} centerId={graph.hub} width={GRAPH_W} height={GRAPH_H} />
        <Quiet>{t(SWARM.graphNote, lang)}</Quiet>
      </div>
      <div className="flex min-h-0 min-w-0 flex-col" style={{ flex: "1 1 380px" }}>
        <SectionHead
          title={SWARM.steps}
          lang={lang}
          right={
            <select
              data-testid="process-swarm-run-picker"
              aria-label={t(SWARM.pickRun, lang)}
              value={runId}
              onChange={(e) => setPicked(e.target.value)}
              className="px-2 py-1"
              style={{ border: "1px solid var(--c-color-line)", borderRadius: "var(--c-radius-control)", background: "var(--c-color-paper)", fontSize: "var(--c-text-14)" }}
            >
              {v.runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  {r.runId} · {r.steps} {t(SWARM.stepsWord, lang)} · {t(r.done ? SWARM.finished : SWARM.running, lang)}
                </option>
              ))}
            </select>
          }
        />
        {v.live && (
          <p data-testid="process-swarm-shared" className="mb-1">
            <Quiet>{t(L18, lang)}</Quiet>
          </p>
        )}
        <ol className="m-0 list-none overflow-auto p-0" style={{ maxHeight: v.live ? GRAPH_H - 28 : GRAPH_H }}>
          {steps.map((step, i) => (
            <StepRow key={step.stepId} step={step} n={i + 1} lang={lang} source={v.sources[step.stepId]} />
          ))}
        </ol>
      </div>
    </div>
  );
}

export default SwarmProcess;
