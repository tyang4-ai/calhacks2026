// The queries a scan sends for one maker (F-watch, Interfaces), built with no randomness, for
// copies of this co-op's own work. Take the maker's first piece in catalog order, then send:
// - the community's English name,
// - the maker's name, a space, and that piece's facets.object.en,
// - the first eight words of that piece's English story.
// At most three. src/mock/watch.ts builds scriptedScan.queries by the same rule, so the tour's scan
// and a person's Scan now for mkr_01 send the same three. A pure function: unit tests pass their
// own catalog.
import type { Community, Person, Piece } from "../../core/types";
import { communities as mockCommunities, getById, pieces as mockPieces } from "../../mock";

/** What the rule reads. Tests pass their own. */
export interface QuerySources {
  /** The catalog, in catalog order. */
  pieces: readonly Pick<Piece, "makerId" | "facets" | "story" | "communityId">[];
  person: (id: string) => Pick<Person, "name" | "communityId"> | undefined;
  community: (id: string) => Pick<Community, "name"> | undefined;
}

const defaults = (): QuerySources => ({
  pieces: mockPieces,
  person: (id) => getById<Person>(id),
  community: (id) => getById<Community>(id) ?? mockCommunities.find((c) => c.id === id),
});

/** The most queries a scan sends. */
export const MAX_QUERIES = 3;

/** The first eight words of a text, split on whitespace. */
export function firstWords(text: string, n = 8): string {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}

/**
 * The queries Scan now sends for `makerId`. A maker with no pieces sends only the community's name
 * (or nothing, when the maker or the community isn't found): the other two need a piece.
 */
export function scanQueries(makerId: string, src: QuerySources = defaults()): string[] {
  const maker = src.person(makerId);
  if (!maker) return [];
  const piece = src.pieces.find((p) => p.makerId === makerId);
  const communityId = maker.communityId ?? piece?.communityId;
  const community = communityId ? src.community(communityId) : undefined;
  const out: string[] = [];
  const push = (q: string | undefined) => {
    const v = q?.trim();
    if (v && !out.includes(v) && out.length < MAX_QUERIES) out.push(v);
  };
  push(community?.name.en);
  if (piece) {
    push(`${maker.name.en} ${piece.facets.object.en}`);
    push(firstWords(piece.story.en, 8));
  }
  return out;
}
