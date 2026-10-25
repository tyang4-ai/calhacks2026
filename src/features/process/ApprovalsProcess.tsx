// The approvals view (T5), process-pane-approvals: process-approvals-list shows each approval in the
// order it was requested, with what Cindy proposed, its status, the kit Seal on granted ones (the
// owner's mark, from the person who granted it), and what followed: followup.sent, payout.sent and
// wip.milestone_paid. An approval getById() doesn't find (a live apr_user_<n>) uses the inline
// approval object the store kept from its approval.requested. The tour opens it in d09-approve (C-12).
import { useCallback } from "react";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { ApprovalStatus, Lang, Person, Text } from "../../core/types";
import { getById } from "../../mock";
import { Money, Seal } from "../../ui";
import { approvalInfo, usePlaying, type ApprovalInfo } from "./processes";
import { Empty, Quiet, Tag } from "./parts";
import { APPROVAL_KIND_LABELS, APPROVAL_STATUS_LABELS, BOOKS, EMPTY, GLOSSARY, t } from "./strings";

interface Followed {
  id: string;
  label: Text;
  amountCents?: number;
}

interface ApprovalRow {
  approvalId: string;
  info: ApprovalInfo | null;
  status: ApprovalStatus;
  date?: string;
  decidedAt?: number;
  sealChar?: string;
  followed: Followed[];
}

function approvalsView(s: CindiaState): ApprovalRow[] {
  return s.approvals.approvalIds
    .filter((id) => s.approvals.items[id]?.requested)
    .map((approvalId) => {
      const item = s.approvals.items[approvalId];
      const info = approvalInfo(s, approvalId) ?? null;
      const followed: Followed[] = [];
      for (const f of Object.values(s.approvals.followUps)) {
        if (f.approvalId === approvalId && f.sent) followed.push({ id: f.followUpId, label: { en: `${GLOSSARY.followUp.en} · ${GLOSSARY.sent.en}`, zh: `${GLOSSARY.followUp.zh} · ${GLOSSARY.sent.zh}` } });
      }
      const subjects = new Set(info?.subjectIds ?? []);
      for (const id of s.approvals.payoutIds) {
        const p = s.approvals.payouts[id];
        if (p && subjects.has(p.makerPayoutId)) followed.push({ id: p.makerPayoutId, label: { en: `${GLOSSARY.makerPayout.en} · ${GLOSSARY.sent.en}`, zh: `${GLOSSARY.makerPayout.zh} · ${GLOSSARY.sent.zh}` }, amountCents: p.amountCents });
      }
      for (const [milestoneId, m] of Object.entries(s.wip.milestones)) {
        if (m.status === "paid" && subjects.has(milestoneId)) followed.push({ id: milestoneId, label: BOOKS.milestonePaid, amountCents: m.amountCents });
      }
      const by = item.by ? getById<Person>(item.by) : undefined;
      const row: ApprovalRow = { approvalId, info, status: item.status, followed };
      if (item.date) row.date = item.date;
      if (item.decidedAt !== undefined) row.decidedAt = item.decidedAt;
      if (by && "surnameChar" in by) row.sealChar = by.surnameChar;
      return row;
    });
}

export function ApprovalsProcess({ lang }: { lang: Lang }) {
  const rows = useCindia(useCallback((s: CindiaState) => approvalsView(s), []));
  // The seal lands on the player clock while it plays; a paused clock shows it landed.
  const playing = usePlaying();
  return (
    <div data-testid="process-pane-approvals" className="flex flex-col gap-3">
      {rows.length > 0 && <Quiet>{t(GLOSSARY.proposedByCindy, lang)}</Quiet>}
      <ol data-testid="process-approvals-list" className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.length === 0 && (
          <li>
            <Empty text={EMPTY.approvals} lang={lang} />
          </li>
        )}
        {rows.map((r) => (
          <li
            key={r.approvalId}
            data-approval-id={r.approvalId}
            data-status={r.status}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2"
            style={{
              border: "1px solid var(--c-color-line)",
              borderLeft: r.status === "pending" ? "3px solid var(--c-color-seal)" : "1px solid var(--c-color-line)",
              borderRadius: "var(--c-radius-panel)",
            }}
          >
            <div className="flex min-w-0 flex-col gap-0.5" style={{ flex: "1 1 280px" }}>
              <span className="flex flex-wrap items-center gap-2">
                <Tag tone="soft">{r.approvalId}</Tag>
                <span className="font-semibold">{r.info ? t(APPROVAL_KIND_LABELS[r.info.kind], lang) : r.approvalId}</span>
                {r.info?.amountCents !== undefined && <Money cents={r.info.amountCents} />}
              </span>
              {r.info?.summary && <Quiet>{t(r.info.summary, lang)}</Quiet>}
              {r.info && r.info.subjectIds.length > 0 && (
                <Quiet>{r.info.subjectIds.join(", ")}</Quiet>
              )}
              {r.info?.overLimit && (
                <span className="font-semibold" style={{ color: "var(--c-color-seal)", fontSize: "var(--c-text-14)" }}>
                  {t(GLOSSARY.overLimit, lang)}
                </span>
              )}
            </div>
            <span data-role="status" className="font-semibold" style={{ flex: "0 0 180px", color: r.status === "granted" ? "var(--c-color-jade)" : r.status === "declined" ? "var(--c-color-ink-soft)" : "var(--c-color-seal)" }}>
              {t(APPROVAL_STATUS_LABELS[r.status], lang)}
            </span>
            <div data-role="followed" className="flex min-w-0 flex-col gap-0.5" style={{ flex: "1 1 260px", fontSize: "var(--c-text-14)" }}>
              {r.followed.length === 0 ? (
                <Quiet>{t(BOOKS.nothingYet, lang)}</Quiet>
              ) : (
                r.followed.map((f) => (
                  <span key={f.id} className="flex flex-wrap items-center gap-1" data-followed={f.id}>
                    <span>{t(f.label, lang)}</span>
                    {f.amountCents !== undefined && <Money cents={f.amountCents} tone="in" />}
                  </span>
                ))
              )}
            </div>
            <div className="flex justify-end" style={{ flex: "0 0 72px" }}>
              {r.status === "granted" && r.sealChar && (
                <Seal char={r.sealChar} date={r.date} lang={lang} size={64} startAt={r.decidedAt} now={playing ? undefined : Number.MAX_SAFE_INTEGER} />
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default ApprovalsProcess;
