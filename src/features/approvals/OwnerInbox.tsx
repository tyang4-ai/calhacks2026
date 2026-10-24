// The owner's phone: every approval Cindy has asked for, in request order, each with its details
// and its decision bar, inside one Panel. The toast is the phone's buzz while anything is waiting.
import type { SlotProps } from "../../core/featureTypes";
import { useCindia } from "../../core/store";
import type { CindiaState } from "../../core/state";
import type { Approval } from "../../core/types";
import { getById } from "../../mock";
import { Panel, Toast } from "../../ui";
import { ApprovalCard } from "./ApprovalCard";
import { DecisionBar } from "./DecisionBar";
import { FollowUpDraft } from "./FollowUpDraft";
import { PayoutLines } from "./PayoutLines";
import { GLOSSARY, UI, t, waitingCount } from "./strings";

const SOURCE_KEYS = ["b08-approvals", "b02-explain", "b04-bank"] as const;

/** Approval IDs in the order their approval.requested arrived. */
function selectRequested(s: CindiaState): string[] {
  return s.approvals.approvalIds.filter((id) => s.approvals.items[id]?.requested);
}

/** How many requested approvals are still pending. */
function selectWaiting(s: CindiaState): number {
  return s.approvals.approvalIds.filter((id) => {
    const item = s.approvals.items[id];
    return item?.requested && item.status === "pending";
  }).length;
}

export function OwnerInbox({ lang }: SlotProps) {
  const ids = useCindia(selectRequested);
  const waiting = useCindia(selectWaiting);

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }} lang={lang}>
      <Panel
        title={t(UI.inboxTitle, lang)}
        sourceKeys={[...SOURCE_KEYS]}
        density="phone"
        lang={lang}
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            overflowY: "auto",
            minHeight: 0,
            maxHeight: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "var(--c-space-16)",
            paddingBottom: waiting > 0 ? 112 : "var(--c-space-16)",
          }}
        >
          {ids.length === 0 && (
            <p style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-16)", margin: 0 }}>{t(UI.emptyInbox, lang)}</p>
          )}
          {ids.map((id) => {
            const kind = getById<Approval>(id)?.kind;
            const details =
              kind === "follow_up" ? (
                <FollowUpDraft approvalId={id} lang={lang} />
              ) : kind === "maker_payouts" ? (
                <PayoutLines approvalId={id} lang={lang} />
              ) : null;
            return (
              <ApprovalCard key={id} approvalId={id} lang={lang} details={details} decision={<DecisionBar approvalId={id} lang={lang} />} />
            );
          })}
        </div>
      </Panel>
      {waiting > 0 && (
        <Toast testId="approvals-toast" tone="seal">
          <div style={{ fontWeight: 600 }}>{t(GLOSSARY.needsApproval, lang)}</div>
          <div style={{ fontSize: "var(--c-text-14)" }}>
            {t(waitingCount(waiting), lang)} {t(UI.toastHint, lang)}
          </div>
        </Toast>
      )}
    </div>
  );
}
