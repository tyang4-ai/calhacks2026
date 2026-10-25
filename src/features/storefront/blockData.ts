// Plain lookups the block renderer uses (T2), kept out of the components so tests can run them.
import type { Piece, StorefrontBlock } from "../../core/types";
import { getById, pieces as catalog } from "../../mock";
import { listProp } from "./workingCopy";

/**
 * The piece whose process the process block shows: the first listed piece of the first pieces
 * block that names one the catalog has, or else the community's first piece.
 */
export function firstListedPiece(blocks: readonly StorefrontBlock[], communityId: string): Piece | undefined {
  for (const b of blocks) {
    if (b.kind !== "pieces") continue;
    for (const id of listProp(b, "pieceIds")) {
      const p = getById<Piece>(id);
      if (p && p.id.startsWith("pc_") && Array.isArray(p.process)) return p;
    }
  }
  return catalog.find((p) => p.communityId === communityId);
}
