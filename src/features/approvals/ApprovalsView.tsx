// The Sell site's approvals view (owner.main): every approval Cindy proposed, as cards in request
// order on the left (three fifths), and the selected one in full on the right (approvals-detail),
// inside one Panel that declares the view's source keys. The selection is ?ref= when it names a
// requested approval, a card the owner clicked until the next approval event, or else the approval
// named by the newest request, grant or decline in the store's log. The kit Toast says "Needs your
// approval" while the newest request is still waiting, in its own strip under the detail.
import { useState } from "react";
import type { SourceKey } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import type { CindiaState } from "../../core/state";
import { Panel, Toast } from "../../ui";
import { ApprovalList } from "./ApprovalList";
import { ApprovalDetail } from "./KindDetails";
import { REQUEST_TYPES, liveHitIds, newestApproval, selectLogRefs, useEventIndex, type Decision } from "./selection";
import { GLOSSARY, UI, t, waitingCount } from "./strings";
import styles from "./approvals.module.css";

/** owner.main's keys (ui-contract.md, Slots). */
const SOURCE_KEYS: SourceKey[] = ["b08-approvals", "b02-explain", "b04-bank", "b14-swarm", "b15-watch"];

/** Approval IDs in the order their approval.requested arrived. */
function selectRequested(s: CindiaState): string[] {
  return s.approvals.approvalIds.filter((id) => s.approvals.items[id]?.requested);
}

/** Each requested approval's status and the player time of its decision, by ID. */
function selectDecisions(s: CindiaState): Record<string, Decision> {
  const out: Record<string, Decision> = {};
  for (const id of s.approvals.approvalIds) {
    const item = s.approvals.items[id];
    if (item?.requested) out[id] = item.decidedAt === undefined ? { status: item.status } : { status: item.status, decidedAt: item.decidedAt };
  }
  return out;
}

interface Pick {
  id: string;
  /** The newest approval when the owner clicked. A newer approval event ends the pick. */
  newestAtPick: string | null;
}

export function ApprovalsView({ lang, refId }: SlotProps) {
  const requested = useCindia(selectRequested);
  const decisions = useCindia(selectDecisions);
  const refs = useCindia(selectLogRefs);
  const seen = useEventIndex();
  const [pick, setPick] = useState<Pick | null>(null);

  const newest = newestApproval(refs, seen, requested, decisions);
  const liveHits = liveHitIds(refs, seen);
  const pickValid = pick !== null && requested.includes(pick.id) && (newest === pick.newestAtPick || newest === pick.id);
  const selectedId =
    (pickValid ? pick.id : null) ?? (refId && requested.includes(refId) ? refId : null) ?? newest ?? requested[requested.length - 1] ?? null;

  const waiting = requested.filter((id) => decisions[id]?.status === "pending").length;
  const latestRequest = newestApproval(refs, seen, requested, decisions, REQUEST_TYPES);
  const toast = latestRequest !== null && decisions[latestRequest]?.status === "pending";

  const onSelect = (id: string) => setPick({ id, newestAtPick: newest });

  return (
    <div className={styles.root} lang={lang}>
      <div className={styles.fill}>
        <Panel title={t(UI.inboxTitle, lang)} sourceKeys={SOURCE_KEYS} lang={lang} className={styles.panel}>
          <p className={styles.intro}>{t(UI.inboxIntro, lang)}</p>
          {requested.length === 0 ? (
            <p data-testid="approvals-empty" className={styles.empty}>
              {t(UI.emptyInbox, lang)}
            </p>
          ) : (
            <div className={styles.body}>
              <ApprovalList ids={requested} selectedId={selectedId} lang={lang} onSelect={onSelect} liveHits={liveHits} className={styles.list} />
              <div className={styles.detailCol}>
                <div data-testid="approvals-detail" className={styles.detail} key={selectedId ?? "none"}>
                  {selectedId && <ApprovalDetail approvalId={selectedId} lang={lang} liveHits={liveHits} />}
                </div>
                {toast && (
                  <div className={styles.toastSlot}>
                    <Toast testId="approvals-toast" tone="seal">
                      <div style={{ fontWeight: 600 }}>{t(GLOSSARY.needsApproval, lang)}</div>
                      <div style={{ fontSize: "var(--c-text-14)" }}>
                        {t(waitingCount(waiting), lang)} {t(UI.toastHint, lang)}
                      </div>
                    </Toast>
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
