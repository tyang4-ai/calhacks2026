// The piece page (M-buyer T6, slot shop.piece.main, the left two thirds): the story column and the
// price column side by side, each in one kit Panel with the source keys it renders, so both fit
// 1440 by 900 beside the support feature's shop.piece.side. The piece is SlotProps.pieceId when the
// route sets it, otherwise the store's openPieceId (the tour on /demo). An unknown piece shows a
// short note and a link back to Shop.
import type { SourceKey } from "../../core/events";
import type { SlotProps } from "../../core/featureTypes";
import { shopRoute } from "../../core/nav";
import type { CindiaState } from "../../core/state";
import { useCindia } from "../../core/store";
import type { Piece } from "../../core/types";
import { getById } from "../../mock";
import { Link } from "../../ui/Link";
import { Panel } from "../../ui/Panel";
import { Checkout } from "./Checkout";
import { PieceSplit } from "./PieceSplit";
import { PieceStory } from "./PieceStory";
import { label, page, tr } from "./strings";

/**
 * The price column renders split.shown and receipt.updated (b10-derived) and order.placed
 * (b04-bank), so it carries the Simulated badge while either is scripted. The story column renders
 * only src/mock data through getById(), no keyed event, so it declares no key and shows no badge, as
 * the design's piece page does (ui-contract.md: a panel declares the keys it renders).
 */
const PIECE_KEYS: SourceKey[] = ["b10-derived", "b04-bank"];
const STORY_KEYS: SourceKey[] = [];

const selectOpenPiece = (s: CindiaState) => s.buyer.openPieceId;

const columnStyle = { minWidth: 0, minHeight: 0 } as const;

export function PiecePage({ lang, pieceId, publicSite = false }: SlotProps) {
  const openPieceId = useCindia(selectOpenPiece);
  const id = pieceId ?? openPieceId;
  const piece = id !== null && id !== undefined ? getById<Piece>(id) : undefined;

  if (!piece || piece.id !== id) {
    return (
      <div data-testid="buyer-piece-page" data-piece-id={id ?? ""} className="flex flex-col items-start gap-2 text-base text-ink">
        <p className="m-0">{tr(page.pieceMissing, lang)}</p>
        <Link to={shopRoute()}>← {tr(page.backToShop, lang)}</Link>
      </div>
    );
  }

  return (
    <div
      data-testid="buyer-piece-page"
      data-piece-id={piece.id}
      lang={lang}
      className="grid min-h-0 grid-cols-2 items-start gap-4"
    >
      <Panel sourceKeys={STORY_KEYS} density="phone" lang={lang} style={columnStyle}>
        <PieceStory lang={lang} pieceId={piece.id} />
      </Panel>
      <Panel sourceKeys={PIECE_KEYS} density="phone" lang={lang} title={tr(label.priceSplit, lang)} style={columnStyle}>
        <div className="flex flex-col gap-3">
          <PieceSplit lang={lang} pieceId={piece.id} />
          <div className="border-t border-line pt-2.5">
            <Checkout lang={lang} pieceId={piece.id} publicSite={publicSite} layout="page" />
          </div>
        </div>
      </Panel>
    </div>
  );
}
