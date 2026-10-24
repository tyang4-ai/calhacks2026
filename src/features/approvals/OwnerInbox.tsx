// The owner's phone: every approval Cindy has asked for, in request order, each with its details
// and its decision bar, inside one Panel. The toast is the phone's buzz while anything is waiting.
import { useLayoutEffect, useRef } from "react";
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

/** The card the phone keeps in view: the first one still waiting, else the newest decided one. */
function selectFocus(s: CindiaState): string | null {
  const ids = selectRequested(s);
  return ids.find((id) => s.approvals.items[id]?.status === "pending") ?? ids[ids.length - 1] ?? null;
}

/**
 * Decided cards that are no longer the newest, joined into one string so the selector stays stable.
 * They shrink to one or two lines so the newer card keeps the phone's room. Store only, so a seek
 * and a play end on the same layout.
 */
function selectCompact(s: CindiaState): string {
  const ids = selectRequested(s);
  return ids.filter((id, i) => i < ids.length - 1 && s.approvals.items[id]?.status !== "pending").join(",");
}

/** Room the toast covers at the bottom of the list while anything is waiting. */
const TOAST_ROOM = 112;
/** Space kept below the focus card so its last lines clear the phone's rounded bottom corners. */
const EDGE = 20;

export function OwnerInbox({ lang }: SlotProps) {
  const ids = useCindia(selectRequested);
  const waiting = useCindia(selectWaiting);
  const focusId = useCindia(selectFocus);
  const compactKey = useCindia(selectCompact);
  const compact = new Set(compactKey ? compactKey.split(",") : []);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  // Keep the focus card's bottom (its decision bar, seal and payouts) inside the phone. Jumps
  // straight there with no smooth scroll, so a seek and a 1x play end on the same frame. Re-runs when
  // the focus changes and whenever the list's height changes (details arriving, payouts marked sent).
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const list = listRef.current;
    const spacer = spacerRef.current;
    if (!scroller || !list || !spacer || !focusId) return;
    const reveal = () => {
      const card = list.querySelector<HTMLElement>(`[data-testid="approvals-item-${focusId}"]`);
      if (!card) return;
      // The list can run past the phone's screen, which clips it, so the room is the part of the
      // list the screen shows. Rects carry the demo stage's scale, so divide it back out.
      const box = scroller.getBoundingClientRect();
      const k = scroller.offsetHeight > 0 ? box.height / scroller.offsetHeight : 1;
      let shownBottom = box.top + scroller.clientHeight * k;
      for (let p = scroller.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowY !== "visible") shownBottom = Math.min(shownBottom, p.getBoundingClientRect().bottom);
      }
      const shown = k > 0 ? (shownBottom - box.top) / k : scroller.clientHeight;
      // Whatever the screen hides at the bottom of the list becomes scroll room, so the last card
      // can still rise clear of the screen's edge.
      spacer.style.height = `${Math.max(0, Math.ceil(scroller.clientHeight - shown))}px`;
      const room = shown - EDGE - (waiting > 0 ? TOAST_ROOM : 0);
      const bottom = card.offsetTop + card.offsetHeight;
      scroller.scrollTop = Math.max(0, bottom - room);
    };
    reveal();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(reveal);
    ro.observe(list);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [focusId, waiting]);

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
          ref={scrollerRef}
          style={{
            position: "relative",
            overflowY: "auto",
            minHeight: 0,
            maxHeight: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "var(--c-space-16)",
            // The tilted seal's corners reach a few pixels past the card, and the list clips them.
            margin: "0 calc(-1 * var(--c-space-8))",
            paddingInline: "var(--c-space-8)",
            paddingBottom: waiting > 0 ? TOAST_ROOM : "var(--c-space-16)",
          }}
        >
          <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-16)", paddingTop: "var(--c-space-12)" }}>
          {ids.length === 0 && (
            <p style={{ color: "var(--c-color-ink-soft)", fontSize: "var(--c-text-16)", margin: 0 }}>{t(UI.emptyInbox, lang)}</p>
          )}
          {ids.map((id) => {
            const kind = getById<Approval>(id)?.kind;
            const small = compact.has(id);
            const details = small ? null : kind === "follow_up" ? (
                <FollowUpDraft approvalId={id} lang={lang} />
              ) : kind === "maker_payouts" ? (
                <PayoutLines approvalId={id} lang={lang} />
              ) : null;
            return (
              <ApprovalCard
                key={id}
                approvalId={id}
                lang={lang}
                compact={small}
                details={details}
                decision={<DecisionBar approvalId={id} lang={lang} compact={small} />}
              />
            );
          })}
          </div>
          <div ref={spacerRef} aria-hidden="true" style={{ flexShrink: 0 }} />
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
