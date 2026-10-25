// Where a sale's money goes: one split.shown payload per piece under the ch_cindia money rules
// (data-model.md, Money rules), computed from the catalog and never typed. Card fee 290 bps of gross
// plus 30 cents, Cindia's fee 1000 bps of gross, the piece's materials, and the maker's share as the
// rest, each rate rounded half up once. pc_01's split is figure 1's: 552, 1800, 2200, 13448.
//
// The gallery comparison (figure 16, A1-10): each of the co-op's twelve pieces also carries what
// its maker would get through Fogline Gallery under ctr_gallery_01, by the ch_gallery rule (gross
// minus the contract's commission minus materials). pc_01's is 4000 bps and 8600. The other
// communities sell through no gallery in this demo, so their splits carry no compare.
import type { Payloads } from "../core/events";
import type { Piece, PieceId } from "../core/types";
import { pieces } from "./catalog";
import { galleryContract } from "./channels";
import { bps, cardFee } from "./util";

/** The gallery comparison a split may carry. */
export type GalleryCompare = NonNullable<Payloads["split.shown"]["compare"]>;

/** Cindia's own fee on its marketplace, in basis points. */
const CINDIA_FEE_BPS = 1000;

function galleryCompare(p: Piece): GalleryCompare {
  const commission = bps(p.priceCents, galleryContract.commissionBps);
  return {
    channelId: galleryContract.channelId,
    commissionBps: galleryContract.commissionBps,
    makerShareCents: p.priceCents - commission - p.materialsCents,
  };
}

function split(p: Piece): Payloads["split.shown"] {
  const grossCents = p.priceCents;
  const cardFeeCents = cardFee(grossCents);
  const platformFeeCents = bps(grossCents, CINDIA_FEE_BPS);
  const shown: Payloads["split.shown"] = {
    pieceId: p.id,
    grossCents,
    cardFeeCents,
    platformFeeCents,
    materialsCents: p.materialsCents,
    makerShareCents: grossCents - cardFeeCents - platformFeeCents - p.materialsCents,
  };
  return p.communityId === "com_dine" ? { ...shown, compare: galleryCompare(p) } : shown;
}

/** splits[pieceId] is the split.shown payload for that piece. */
export const splits: Record<PieceId, Payloads["split.shown"]> = Object.fromEntries(pieces.map((p) => [p.id, split(p)]));

/** gallerySplits[pieceId] is the comparison for a co-op piece, built from splits. buyer-split-compare reads it. */
export const gallerySplits: Record<PieceId, GalleryCompare> = Object.fromEntries(
  Object.values(splits).flatMap((s) => (s.compare ? [[s.pieceId, s.compare] as const] : [])),
);
