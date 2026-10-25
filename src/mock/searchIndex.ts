// What Cindia keeps about each piece to find it (data-model.md, The embedded passage). S3-catalog T1
// stub: no index entries until T5 builds the 54 of them. The alias map and the closed vibe list are
// small fixed lists the plan states exactly (T5, content rules R18 and R24), so they are already here.
import type { IndexEntry, Vibe } from "../core/types";

/** One entry per piece, keyed by pieceId. T5 fills it. */
export const searchIndex: IndexEntry[] = [];

/**
 * Words people type, mapped to the vocabulary term they mean. Never maps a stereotype word to
 * anything (R24).
 */
export const keywordAliases: Record<string, string> = {
  mom: "gift for mom",
  mother: "gift for mom",
  mum: "gift for mom",
  dad: "gift for dad",
  father: "gift for dad",
};

/** The closed vibe list (R18). Every piece's vibe words come from it. B14's listing request carries it. */
export const vibeVocabulary: Vibe = {
  moods: ["warm", "bold", "calm", "bright", "cheerful", "quiet", "earthy", "playful", "elegant", "soft"],
  occasions: ["birthday", "housewarming", "thank you", "holiday", "everyday"],
  recipients: ["gift for mom", "gift for dad", "gift for a friend", "gift for a sister", "for myself"],
};
