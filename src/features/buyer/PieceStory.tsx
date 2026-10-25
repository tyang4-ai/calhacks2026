// The piece page's left column (M-buyer T2): the story card in its page layout (title, maker with
// her mark and the Demo data badge, the community link, hours, story, L5, the steps and the craft
// line), then how the community would verify its makers. Everything comes from src/mock.
import type { Piece } from "../../core/types";
import { getById } from "../../mock";
import { PieceVerification } from "./PieceVerification";
import { StoryCard } from "./StoryCard";
import type { Lang } from "./strings";

export interface PieceStoryProps {
  lang: Lang;
  pieceId: string;
}

export function PieceStory({ lang, pieceId }: PieceStoryProps) {
  const piece = getById<Piece>(pieceId);
  if (!piece) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <StoryCard lang={lang} pieceId={piece.id} layout="page" />
      <div className="border-t border-line pt-2">
        <PieceVerification lang={lang} communityId={piece.communityId} />
      </div>
    </div>
  );
}
