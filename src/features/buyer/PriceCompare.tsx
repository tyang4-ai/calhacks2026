// The gallery comparison under the split (M-buyer T3, A1-10, figure 16): what the same maker would
// get for this piece through the gallery, by its contract, beside what she gets on Cindia. The
// gallery amount is gallerySplits[pieceId] from src/mock/splits.ts, and the Cindia amount is the
// split.shown payload's maker share. Code computed both, so nothing here is typed in. A piece with
// no gallery entry, or no split yet, shows no line.
import type { Person, Piece } from "../../core/types";
import type { BuyerState } from "../../core/state";
import { useCindia } from "../../core/store";
import { gallerySplits, getById } from "../../mock";
import { Money } from "../../ui/Money";
import { fill, page, tr, type Lang } from "./strings";

export interface PriceCompareProps {
  lang: Lang;
  pieceId: string;
}

export function PriceCompare({ lang, pieceId }: PriceCompareProps) {
  const split = useCindia((s: { buyer: BuyerState }) => s.buyer.splits[pieceId] ?? null);
  const gallery = gallerySplits[pieceId];
  const piece = getById<Piece>(pieceId);
  const maker = piece ? getById<Person>(piece.makerId) : undefined;
  if (split === null || gallery === undefined || !maker) return null;

  return (
    <p data-testid="buyer-split-compare" className="m-0 text-sm leading-5 text-ink">
      {fill(tr(page.compare, lang), {
        maker: tr(maker.name, lang),
        gallery: <Money cents={gallery.makerShareCents} />,
        cindia: <Money cents={split.makerShareCents} tone="in" />,
      })}
    </p>
  );
}
