// The Designer's draft (T5): its button, its run and the choice to use what it drafted.
// - storefront-designer emits storefront.requested for the storefront through userEvent().
// - storefront-designer-steps lists the swarm.step events of the newest run on the storefront's
//   thread, as kit ChatBubbles with the agent's name. Runs are picked by threadId, never by runId:
//   the tour's run is run_03, but a person's request re-keys it to run_user_<n> (and a live one to
//   run_user_<tag>_<n>), while the thread stays the storefront's ID.
// - Once storefront.drafted is in the store, storefront-use-draft hands the drafted blocks up. The
//   owner decides: the draft is never applied on its own.
import { useState } from "react";
import { userEvent } from "../../core/events";
import { emit, useCindia } from "../../core/store";
import type { Lang, StorefrontBlock, Text } from "../../core/types";
import { getAgent } from "../../mock";
import { Button, ChatBubble } from "../../ui";
import { draftKey, threadSteps } from "./designerRun";
import { SEP, UI, t, tf } from "./strings";
import styles from "./storefront.module.css";
import { usePlayerEpoch } from "./usePlayerEpoch";

function agentName(agentId: string): { name: Text; kind: "claude" | "code" | undefined } {
  const agent = getAgent(agentId);
  return agent ? { name: agent.name, kind: agent.kind } : { name: { en: agentId, zh: agentId }, kind: undefined };
}

export interface DesignerDraftProps {
  storefrontId: string;
  lang: Lang;
  /** True while the working copy holds exactly the drafted blocks. */
  inUse: boolean;
  onUseDraft: (blocks: StorefrontBlock[]) => void;
}

export function DesignerDraft({ storefrontId, lang, inUse, onUseDraft }: DesignerDraftProps) {
  const { runId, steps } = useCindia((s) => threadSteps(s, storefrontId));
  const draft = useCindia((s) => s.storefront.drafts[storefrontId] ?? null);
  const epoch = usePlayerEpoch();
  const [asked, setAsked] = useState<{ epoch: number; draft: string | null } | null>(null);
  const key = draftKey(draft?.blocks);
  const waiting = asked !== null && asked.epoch === epoch && asked.draft === key;
  const designer = getAgent("designer");

  return (
    <section className={styles.designer} lang={lang}>
      <div className={styles.designerHead}>
        <h3 className={styles.h3}>{designer ? t(designer.name, lang) : "designer"}</h3>
        {designer && <span className={styles.soft}>{t(designer.job, lang)}</span>}
      </div>
      <Button
        testId="storefront-designer"
        variant="quiet"
        disabled={waiting}
        onClick={() => {
          setAsked({ epoch, draft: key });
          emit(userEvent("storefront.requested", { storefrontId }));
        }}
      >
        {t(UI.designer, lang)}
      </Button>
      <div className={styles.designerSteps} data-testid="storefront-designer-steps" data-run-id={runId ?? undefined} data-thread-id={storefrontId}>
        <p className={styles.h4}>{t(UI.steps, lang)}</p>
        {steps.length === 0 ? (
          <p className={styles.soft}>{t(waiting ? UI.designerWorking : UI.designerIdle, lang)}</p>
        ) : (
          <ol className={styles.stepList}>
            {steps.map((step, i) => {
              const agent = agentName(step.agentId);
              const detail = [`${i + 1}`, ...(step.toolName ? [tf(UI.tool, lang, { name: step.toolName })] : []), tf(UI.ms, lang, { ms: step.ms })].join(SEP);
              return (
                <li key={step.stepId} className={styles.stepItem} data-step-id={step.stepId} data-agent-id={step.agentId}>
                  <ChatBubble role="agent" agentName={agent.name} agentKind={agent.kind} text={step.summary} at={step.at} lang={lang} detail={<span>{detail}</span>} />
                </li>
              );
            })}
          </ol>
        )}
        {waiting && steps.length > 0 && <p className={styles.soft}>{t(UI.designerWorking, lang)}</p>}
      </div>
      {draft && !waiting && (
        <div className={styles.draftChoice}>
          <p className={styles.soft}>{t(inUse ? UI.draftInUse : UI.draftReady, lang)}</p>
          <Button testId="storefront-use-draft" variant="primary" disabled={inUse} onClick={() => onUseDraft(draft.blocks)}>
            {t(UI.applyDraft, lang)}
          </Button>
        </div>
      )}
    </section>
  );
}
