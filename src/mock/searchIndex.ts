// What Cindia keeps about each piece to find it (data-model.md, IndexEntry and The embedded
// passage): one IndexEntry per piece, the aliases people type, and the closed vibe list.
//
// provenance shows who writes each layer in a real launch: the maker the facts, the community the
// culture, the Tagger agent the vibe words and the Describer agent the picture note, each approved
// by the maker. In this demo the Cindia team wrote every layer, and the Describer never ran (A2-18):
// nothing uploads a photo, so pictureNote is the same plain description as the piece's imageAlt.
import type { Community, IndexEntry, Piece, Vibe } from "../core/types";
import { pieces } from "./catalog";
import { communities } from "./communities";
import { orders } from "./month";
import { storefronts } from "./storefronts";

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


// salesThisMonth for the other three communities' 42 pieces. DEMO DATA: those communities have no
// orders in src/mock/, so these are typed numbers from 0 to 6, chosen so the fair surprise draw of
// figure 12 (keyword geometric, seed 10) lands on pc_38. The nine geometric pieces carry figure 12's
// values, every piece by Julie M. (mkr_12, pc_36 to pc_38) is 0, every other geometric piece's
// maker has at least one sale, and a one-of-a-kind (featured) piece sold at most once.
const TYPED_SALES: Record<string, number> = {
  pc_13: 2,
  pc_14: 3,
  pc_15: 1,
  pc_16: 4,
  pc_17: 0,
  pc_18: 2,
  pc_19: 1,
  pc_20: 2,
  pc_21: 0,
  pc_22: 5,
  pc_23: 1,
  pc_24: 0,
  pc_25: 1,
  pc_26: 2,
  pc_27: 4,
  pc_28: 0,
  pc_29: 2,
  pc_30: 3,
  pc_31: 2,
  pc_32: 2,
  pc_33: 0,
  pc_34: 1,
  pc_35: 5,
  pc_36: 0,
  pc_37: 0,
  pc_38: 0,
  pc_39: 1,
  pc_40: 3,
  pc_41: 0,
  pc_42: 3,
  pc_43: 2,
  pc_44: 1,
  pc_45: 2,
  pc_46: 0,
  pc_47: 1,
  pc_48: 4,
  pc_49: 0,
  pc_50: 2,
  pc_51: 1,
  pc_52: 0,
  pc_53: 2,
  pc_54: 3,
};

/** The co-op's pieces sold this month: September's paid orders, refunds left out. */
function coopSales(pieceId: string): number {
  return orders.filter((o) => o.pieceId === pieceId && o.status === "paid").length;
}

/** The first sentence of a story: up to and including the first ". ", "! " or "? ", trimmed. */
function firstSentence(text: string): string {
  const end = /[.!?] /.exec(text);
  return (end ? text.slice(0, end.index + 1) : text).trim();
}

/**
 * The passage rule (data-model.md, The embedded passage), exactly:
 * passage: {object} | craft: {craft}, {people} | materials: ... | techniques: ... | motifs: ... |
 * colors: ... | mood: ... | for: {occasions}, {recipients} | {first sentence of story.en}
 * A part whose list is empty is left out with its label. In for:, an empty list is skipped.
 */
function passage(p: Piece, c: Community): string {
  const f = p.facets;
  const parts = [`passage: ${f.object.en}`, `craft: ${c.craft.en}, ${c.people.en}`];
  const add = (label: string, list: string[]) => {
    if (list.length > 0) parts.push(`${label}: ${list.join(", ")}`);
  };
  add("materials", f.materials);
  add("techniques", f.techniques);
  add("motifs", f.motifs);
  add("colors", f.colors);
  add("mood", p.vibe.moods);
  add("for", [...p.vibe.occasions, ...p.vibe.recipients]);
  parts.push(firstSentence(p.story.en));
  return parts.join(" | ");
}

function entry(p: Piece): IndexEntry {
  const c = communities.find((x) => x.id === p.communityId);
  const slug = storefronts.find((s) => s.id === c?.storefrontId)?.slug;
  if (!c || !slug) throw new Error(`no community or storefront for ${p.id}`);
  const sales = p.communityId === "com_dine" ? coopSales(p.id) : TYPED_SALES[p.id];
  if (sales === undefined) throw new Error(`no salesThisMonth for ${p.id}`);
  return {
    pieceId: p.id,
    communityId: p.communityId,
    makerId: p.makerId,
    storefrontSlug: slug,
    provenance: { facts: "maker", culture: "community", vibe: "agent:tagger", picture: "agent:describer" },
    approvedBy: p.makerId,
    pictureNote: p.imageAlt,
    embedText: passage(p, c),
    salesThisMonth: sales,
    status: "active",
  };
}

/** One entry per piece, keyed by pieceId, in pieceId order. */
export const searchIndex: IndexEntry[] = pieces.map(entry);
