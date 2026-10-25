// The approvals as a stack of cards, in the order their approval.requested arrived. The selected
// card carries aria-current, and clicking a card selects it. When the list scrolls, it keeps the
// selected card in view, jumping there with no smooth scroll, so a seek and a play end on the same
// frame.
import { useLayoutEffect, useRef } from "react";
import { ApprovalCard } from "./ApprovalCard";
import type { Lang } from "./strings";

export interface ApprovalListProps {
  /** Requested approvals, in request order. */
  ids: string[];
  selectedId: string | null;
  lang: Lang;
  onSelect: (approvalId: string) => void;
  /** Hits whose counterfeit.flagged came from a live scan. */
  liveHits: string[];
  className?: string;
}

export function ApprovalList({ ids, selectedId, lang, onSelect, liveHits, className }: ApprovalListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const key = ids.join(",");

  useLayoutEffect(() => {
    const list = listRef.current;
    // key names the cards, so a card added or removed re-runs this.
    if (!list || !selectedId || !key) return;
    const reveal = () => {
      if (getComputedStyle(list).overflowY === "visible" || list.scrollHeight <= list.clientHeight) return;
      const card = list.querySelector<HTMLElement>(`[data-testid="approvals-item-${selectedId}"]`);
      if (!card) return;
      const pad = parseFloat(getComputedStyle(list).paddingTop) || 0;
      const top = card.offsetTop - pad;
      const bottom = card.offsetTop + card.offsetHeight + pad;
      if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
      if (top < list.scrollTop) list.scrollTop = Math.max(0, top);
    };
    reveal();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(reveal);
    ro.observe(list);
    for (const child of Array.from(list.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [selectedId, key]);

  return (
    <div ref={listRef} className={className} style={{ position: "relative" }}>
      {ids.map((id) => (
        <ApprovalCard key={id} approvalId={id} lang={lang} selected={id === selectedId} onSelect={onSelect} liveHits={liveHits} />
      ))}
    </div>
  );
}
