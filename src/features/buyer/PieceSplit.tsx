// The top of the piece page's price column (M-buyer T3): the price, then, once the store holds a
// split.shown for this piece, where the money goes (the kit ShareBar, from the payload) and the
// gallery comparison under it. Until then, "See where your money goes" asks for the split with a
// person's piece.opened, which the scripted responder answers with this piece's split.shown from
// src/mock/splits.ts (contracts section 11). Nothing is emitted on mount.
import { userEvent } from "../../core/events";
import type { CindiaState } from "../../core/state";
import { emit, useCindia } from "../../core/store";
import type { Piece } from "../../core/types";
import { getById } from "../../mock";
import { Button } from "../../ui/Button";
import { Money } from "../../ui/Money";
import { PriceCompare } from "./PriceCompare";
import { PriceSplit } from "./PriceSplit";
import { page, tr, type Lang } from "./strings";
import { useEpochState } from "./useEpoch";

export interface PieceSplitProps {
  lang: Lang;
  pieceId: string;
}

export function PieceSplit({ lang, pieceId }: PieceSplitProps) {
  const split = useCindia((s: CindiaState) => s.buyer.splits[pieceId] ?? null);
  // A request sent from this page, until a seek drops it with the store's person-made records.
  const [asked, setAsked] = useEpochState(false);
  const piece = getById<Piece>(pieceId);
  if (!piece) return null;

  function askForSplit() {
    if (split !== null || asked) return;
    emit(userEvent("piece.opened", { pieceId }));
    setAsked(true);
  }

  return (
    <section aria-label={tr(page.seeSplit, lang)} className="flex flex-col gap-2.5">
      <Money testId="buyer-split-price" cents={split?.grossCents ?? piece.priceCents} className="text-3xl leading-none font-bold" />
      {split !== null ? (
        <div className="flex flex-col gap-2">
          <PriceSplit lang={lang} pieceId={pieceId} layout="page" />
          <PriceCompare lang={lang} pieceId={pieceId} />
        </div>
      ) : (
        <Button testId="buyer-split-request" variant="quiet" onClick={askForSplit} disabled={asked} aria-busy={asked}>
          {tr(page.seeSplit, lang)}
        </Button>
      )}
    </section>
  );
}
