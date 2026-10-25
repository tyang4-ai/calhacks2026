// The listing run's steps as they stream (F-seller-hub T4), test ID seller-listing-steps.
// - A listing run's threadId is its listingId, so the steps are the swarm.step events of the newest
//   run on the followed listing's thread, in the order they arrived.
// - Each step (seller-listing-step-<stepId>) is a kit ChatBubble: the agent's name from the roster
//   (getAgent, since agent IDs have no prefix), the Rule-based badge for a `code` agent, the step's
//   summary in the slot's language, its tool when set, and its ms.
// - New steps slide in with the kit's UI motion on the player clock. While the player is paused,
//   or after a seek, they render finished.
// - Before any step: "Cindy is starting the team."
import { useLayoutEffect, useRef } from "react";
import { player } from "../../core/player";
import { useCindia } from "../../core/store";
import type { Text } from "../../core/types";
import { getAgent } from "../../mock";
import { ChatBubble, uiProgress, usePlayerTime, useReducedMotion } from "../../ui";
import { listingSteps } from "./model";
import { LISTING, SEP, t, tf, type Lang } from "./strings";
import styles from "./seller-hub.module.css";

function agentName(agentId: string): { name: Text; kind: "claude" | "code" | undefined } {
  const agent = getAgent(agentId);
  return agent ? { name: agent.name, kind: agent.kind } : { name: { en: agentId, zh: agentId }, kind: undefined };
}

export function ListingSteps({ listingId, lang }: { listingId: string | null; lang: Lang }) {
  const { runId, steps } = useCindia((s) => listingSteps(s, listingId));
  const now = usePlayerTime();
  const reduced = useReducedMotion();
  const playing = player.isPlaying();
  const listRef = useRef<HTMLOListElement>(null);
  const newestStepId = steps.length > 0 ? steps[steps.length - 1].stepId : null;

  // Keep the newest step in view as the run streams.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && newestStepId) el.scrollTop = el.scrollHeight;
  }, [newestStepId]);

  return (
    <div className={styles.steps} data-testid="seller-listing-steps" data-run-id={runId ?? undefined} lang={lang}>
      <h3 className={styles.h3}>
        {t(LISTING.steps, lang)}
        {runId && <span className={styles.mono}>{runId}</span>}
      </h3>
      {steps.length === 0 ? (
        <p className={styles.empty}>{t(listingId ? LISTING.starting : LISTING.stepsIdle, lang)}</p>
      ) : (
        <ol className={styles.stepList} ref={listRef}>
          {steps.map((step, i) => {
            const agent = agentName(step.agentId);
            const p = playing ? uiProgress(now, step.at, reduced) : 1;
            const detail = [
              `${i + 1}`,
              t(LISTING.stepKinds[step.kind], lang),
              ...(step.toolName ? [tf(LISTING.tool, lang, { name: step.toolName })] : []),
              tf(LISTING.ms, lang, { ms: step.ms }),
            ].join(SEP);
            return (
              <li
                key={step.stepId}
                className={styles.stepItem}
                data-agent-id={step.agentId}
                style={p < 1 ? { opacity: p, transform: `translateY(${Math.round((1 - p) * 8)}px)` } : undefined}
              >
                <ChatBubble
                  role="agent"
                  testId={`seller-listing-step-${step.stepId}`}
                  agentName={agent.name}
                  agentKind={agent.kind}
                  text={step.summary}
                  at={step.at}
                  lang={lang}
                  detail={<span className={styles.stepDetail}>{detail}</span>}
                />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
