// F-support T3: the step strip (support-steps), the agents taking turns on the current thread's
// newest run. While the run works it shows each step as it arrives (support-step-<stepId>): the
// agent's name from the roster and the step's summary in the slot's language, with a small icon for
// the step's kind (a check step reads as a check), and support-working until the run ends. Once
// answered it folds to one line. Steps appear as their events arrive, so the strip follows the
// player clock in the tour and the 300 ms spacing in scripted answers. No timers of its own.
import { useMemo, useState } from "react";
import { setProcess } from "../../core/nav";
import { useCindia } from "../../core/store";
import type { Text } from "../../core/types";
import { GLOSSARY, STEP_KIND_WORDS, STRINGS, answeredAfter, handedOverAfter, t, type Lang } from "./strings";
import { agentLabel } from "./records";
import { latestRun, runEnding, runSteps, threadItems } from "./threadModel";

type StepKind = keyof typeof STEP_KIND_WORDS;

export interface StepStripProps {
  threadId: string | null;
  lang: Lang;
}

const ICON_PATHS: Record<StepKind, string> = {
  route: "M2 8 H11 M8 4.5 L11.5 8 L8 11.5",
  call: "M3.5 12.5 L12.5 3.5 M6.5 3.5 H12.5 V9.5",
  tool: "M10 10 L13.5 13.5 M6.75 11 A4.25 4.25 0 1 1 6.75 2.5 A4.25 4.25 0 1 1 6.75 11",
  result: "M8 5 A3 3 0 1 1 8 11 A3 3 0 1 1 8 5",
  check: "M3 8.5 L6.5 12 L13 4",
  handoff: "M2.5 5.5 H12 M9.5 3 L12 5.5 L9.5 8 M13.5 10.5 H4 M6.5 8 L4 10.5 L6.5 13",
  reply: "M2.5 3 H13.5 V10.5 H7 L4 13.5 V10.5 H2.5 Z",
};

/** A step kind's small icon. A check step is drawn as a check mark in jade. */
function StepIcon({ kind, lang }: { kind: StepKind; lang: Lang }) {
  const color = kind === "check" ? "var(--c-color-jade)" : "var(--c-color-ink-soft)";
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      role="img"
      aria-label={t(STEP_KIND_WORDS[kind] ?? STEP_KIND_WORDS.result, lang)}
      data-step-kind={kind}
      style={{ flex: "0 0 auto", color, marginTop: 3 }}
    >
      <path d={ICON_PATHS[kind] ?? ICON_PATHS.result} fill="none" stroke="currentColor" strokeWidth={kind === "check" ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Knot {
  key: string;
  name: Text;
  ruleBased: boolean;
}

/** The run's agents in order of first appearance, with each check step as one "Check" knot. */
function knotsOf(steps: { agentId: string; kind: string }[]): { knots: Knot[]; active: string | null } {
  const knots: Knot[] = [];
  const seen = new Set<string>();
  let active: string | null = null;
  for (const s of steps) {
    const key = s.kind === "check" ? "check" : s.agentId;
    active = key;
    if (seen.has(key)) continue;
    seen.add(key);
    const agent = agentLabel(s.agentId);
    knots.push({ key, name: s.kind === "check" ? STRINGS.check : agent.name, ruleBased: s.kind === "check" || agent.kind === "code" });
  }
  return { knots, active };
}

function Knots({ knots, active, done, lang }: { knots: Knot[]; active: string | null; done: boolean; lang: Lang }) {
  return (
    <ol aria-hidden="true" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: "var(--c-space-4)" }}>
      {knots.map((k, i) => {
        const isActive = !done && k.key === active;
        return (
          <li key={k.key} style={{ display: "flex", alignItems: "center", gap: "var(--c-space-4)", fontSize: "var(--c-text-14)" }}>
            {i > 0 && <span style={{ display: "inline-block", width: 12, borderTop: "2px solid var(--c-color-jade)" }} />}
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                boxSizing: "border-box",
                background: isActive ? "var(--c-color-paper)" : "var(--c-color-jade)",
                border: isActive ? "3px solid var(--c-color-ink)" : "2px solid var(--c-color-paper)",
                outline: isActive ? "none" : "1px solid var(--c-color-jade)",
              }}
            />
            <span style={{ fontWeight: isActive ? 700 : 500, color: isActive ? "var(--c-color-ink)" : "var(--c-color-ink-soft)" }}>{t(k.name, lang)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function StepStrip({ threadId, lang }: StepStripProps) {
  const swarm = useCindia((s) => s.swarm);
  const support = useCindia((s) => s.support);
  const log = useCindia((s) => s.log);
  const [openRun, setOpenRun] = useState<string | null>(null);

  const view = useMemo(() => {
    const latest = latestRun(swarm, threadId);
    if (!latest) return null;
    const steps = runSteps(swarm, latest.runId);
    const ending = runEnding(threadItems({ support, log }, threadId), latest.runId);
    return { ...latest, steps, ending };
  }, [swarm, support, log, threadId]);

  if (!view) return null;
  const { runId, run, steps, ending } = view;
  const working = !run.done && steps.length > 0;
  const folded = run.done && openRun !== runId;
  const { knots, active } = knotsOf(steps);
  const latestStep = steps[steps.length - 1];

  let summaryLine: Text | null = null;
  if (run.done) {
    if (ending?.kind === "answered") summaryLine = answeredAfter(agentLabel(ending.message.agentId).name, steps.length);
    else if (ending?.kind === "escalated") summaryLine = handedOverAfter(steps.length);
    else summaryLine = answeredAfter(agentLabel("writer").name, steps.length);
  }

  return (
    <section
      data-testid="support-steps"
      data-run-id={runId}
      data-state={working ? "working" : run.done ? "done" : "idle"}
      lang={lang}
      aria-label={t(GLOSSARY.agentSwarm, lang)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--c-space-8)",
        paddingLeft: "var(--c-space-12)",
        borderLeft: "2px solid var(--c-color-line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--c-space-8)", fontSize: "var(--c-text-14)" }}>
        <span style={{ fontWeight: 600 }}>{t(GLOSSARY.agentSwarm, lang)}</span>
        <code style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{runId}</code>
      </div>
      <Knots knots={knots} active={active} done={run.done} lang={lang} />

      {/* Folded, the rows stay in the page but hidden, so the run's record is still there. */}
      <ol
        hidden={folded}
        data-folded={folded ? "true" : undefined}
        style={{ listStyle: "none", margin: 0, padding: 0, display: folded ? "none" : "flex", flexDirection: "column", gap: "var(--c-space-4)" }}
      >
          {steps.map((s, i) => {
            const latest = working && s.stepId === latestStep?.stepId;
            return (
              <li
                key={s.stepId}
                data-testid={`support-step-${s.stepId}`}
                data-kind={s.kind}
                data-agent-id={s.agentId}
                style={{
                  display: "flex",
                  gap: "var(--c-space-8)",
                  alignItems: "flex-start",
                  padding: "2px var(--c-space-8)",
                  fontSize: "var(--c-text-14)",
                  background: latest ? "var(--c-color-mat)" : undefined,
                  borderRadius: "var(--c-radius-control)",
                }}
              >
                <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--c-color-ink-soft)", minWidth: 18, textAlign: "right" }}>{i + 1}</span>
                <StepIcon kind={s.kind as StepKind} lang={lang} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{t(agentLabel(s.agentId).name, lang)}</span>
                  <span style={{ color: "var(--c-color-ink-soft)" }}> · {t(s.summary, lang)}</span>
                </span>
              </li>
            );
          })}
      </ol>

      {working && (
        <p data-testid="support-working" role="status" style={{ margin: 0, fontSize: "var(--c-text-14)", display: "flex", gap: "var(--c-space-8)", alignItems: "baseline" }}>
          <span aria-hidden="true" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--c-color-ink)" }} />
          <span>
            {t(STRINGS.working, lang)}
            {latestStep && (
              <span style={{ color: "var(--c-color-ink-soft)" }}>
                {" "}
                {t(STRINGS.now, lang)}: {t(agentLabel(latestStep.agentId).name, lang)}
              </span>
            )}
          </span>
        </p>
      )}

      {run.done && summaryLine && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--c-space-8)", flexWrap: "wrap", fontSize: "var(--c-text-14)" }}>
          <StepIcon kind="check" lang={lang} />
          <span>{t(summaryLine, lang)}</span>
          {steps.length > 0 && (
            <button
              type="button"
              aria-expanded={!folded}
              aria-label={t(folded ? STRINGS.showSteps : STRINGS.hideSteps, lang)}
              title={t(folded ? STRINGS.showSteps : STRINGS.hideSteps, lang)}
              onClick={() => setOpenRun(folded ? runId : null)}
              style={{ font: "inherit", background: "none", border: "none", padding: 0, color: "var(--c-color-ink-soft)", textDecoration: "underline", cursor: "pointer" }}
            >
              {folded ? "+" : "−"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setProcess("swarm")}
            style={{ marginLeft: "auto", font: "inherit", background: "none", border: "none", padding: 0, color: "var(--c-color-ink)", textDecoration: "underline", cursor: "pointer" }}
          >
            {t(GLOSSARY.howItWorks, lang)} →
          </button>
        </div>
      )}
    </section>
  );
}
