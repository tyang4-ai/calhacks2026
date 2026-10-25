// Where a sale's money goes, one split.shown payload per piece under the ch_cindia money rules, and
// the gallery comparison (figure 16). S3-catalog T1 stub: both records are empty until T7 computes
// them from the catalog.
import type { Payloads } from "../core/events";
import type { PieceId } from "../core/types";

/** The gallery comparison a split may carry. */
export type GalleryCompare = NonNullable<Payloads["split.shown"]["compare"]>;

/** splits[pieceId] is the split.shown payload for that piece. */
export const splits: Record<PieceId, Payloads["split.shown"]> = {};

/** gallerySplits[pieceId] is the comparison for a co-op piece, built from splits. */
export const gallerySplits: Record<PieceId, GalleryCompare> = {};
