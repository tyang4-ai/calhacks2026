// The price split (F3, M-buyer T3): where one piece's price goes, drawn from its split.shown alone,
// as the kit ShareBar in the desktop price column. PieceSplit shows the price above it. Every amount
// comes from the event payload, never from the order or the catalog. v1's phone layout, with the
// title and price above the bar and the store's latest split as its default, went with the phone
// flow (M-buyer T7).
import type { BuyerState } from "../../core/state";
import { useCindia } from "../../core/store";
import { ShareBar, type SharePart } from "../../ui/ShareBar";
import styles from "./buyer.module.css";
import { label, tr, type Lang } from "./strings";

export interface PriceSplitProps {
  lang: Lang;
  /** The piece whose split to draw. */
  pieceId: string;
}

export function PriceSplit({ lang, pieceId }: PriceSplitProps) {
  const split = useCindia((s: { buyer: BuyerState }) => s.buyer.splits[pieceId] ?? null);
  if (split === null) return null;

  const parts: SharePart[] = [
    { kind: "maker", label: tr(label.makerShare, lang), cents: split.makerShareCents, testId: "buyer-split-maker-share" },
    { kind: "materials", label: tr(label.materials, lang), cents: split.materialsCents },
    { kind: "platform", label: tr(label.cindiaFee, lang), cents: split.platformFeeCents },
    { kind: "card", label: tr(label.cardFee, lang), cents: split.cardFeeCents },
  ];

  return (
    <div className={styles.pageShareBar}>
      <ShareBar testId="buyer-split-bar" parts={parts} />
    </div>
  );
}
