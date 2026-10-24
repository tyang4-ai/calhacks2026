// The price split (F3): the price of the piece and where it goes, drawn from split.shown alone.
// Every amount comes from the event payload, never from the order or the catalog.
import type { Piece } from "../../core/types";
import type { BuyerState } from "../../core/state";
import { useCindia } from "../../core/store";
import { getById } from "../../mock";
import { Money } from "../../ui/Money";
import { ShareBar, type SharePart } from "../../ui/ShareBar";
import { label, tr, ui, type Lang } from "./strings";

export interface PriceSplitProps {
  lang: Lang;
}

const selectSplit = (s: { buyer: BuyerState }) =>
  s.buyer.latestSplitPieceId !== null ? (s.buyer.splits[s.buyer.latestSplitPieceId] ?? null) : null;

export function PriceSplit({ lang }: PriceSplitProps) {
  const split = useCindia(selectSplit);
  if (split === null) return null;

  const piece = getById<Piece>(split.pieceId);
  const parts: SharePart[] = [
    { kind: "maker", label: tr(label.makerShare, lang), cents: split.makerShareCents, testId: "buyer-split-maker-share" },
    { kind: "materials", label: tr(label.materials, lang), cents: split.materialsCents },
    { kind: "platform", label: tr(label.cindiaFee, lang), cents: split.platformFeeCents },
    { kind: "card", label: tr(label.cardFee, lang), cents: split.cardFeeCents },
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--c-space-8)" }}>
        <span style={{ fontSize: "var(--c-text-16)", color: "var(--c-color-ink-soft)" }}>
          {piece ? tr(piece.title, lang) : tr(ui.price, lang)}
        </span>
        <Money cents={split.grossCents} style={{ fontSize: "var(--c-text-24)" }} testId="buyer-split-price" />
      </div>
      <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{tr(ui.splitNote, lang)}</p>
      <ShareBar testId="buyer-split-bar" parts={parts} />
    </section>
  );
}
