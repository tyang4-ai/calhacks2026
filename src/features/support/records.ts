// What the support screens look up in the records: an agent's name and kind from the roster, a
// maker's name and mark, a record a reply names (its label and its page), the context a question
// carries, and the suggestions for a side. Plain functions, no components.
import { communityRoute, makerRoute, pieceRoute, receiptRoute } from "../../core/nav";
import type { SlotProps } from "../../core/featureTypes";
import type { Community, Person, Piece, PolicyTopic, Text } from "../../core/types";
import { demoQuestions, getAgent, getById, storefronts } from "../../mock";
import { GLOSSARY, t, type Lang } from "./strings";
import type { Side } from "./threadModel";

/** An agent's name and kind from the roster, or its ID when the roster doesn't know it. */
export function agentLabel(agentId: string): { name: Text; kind: "claude" | "code" | undefined } {
  const agent = getAgent(agentId);
  return agent ? { name: agent.name, kind: agent.kind } : { name: { en: agentId, zh: agentId }, kind: undefined };
}

/** A maker's name and MakerMark character, or her ID when the records don't hold her. */
export function makerOf(makerId: string): { name: Text; char: string } {
  const p = getById<Person>(makerId);
  return p ? { name: p.name, char: p.surnameChar } : { name: { en: makerId, zh: makerId }, char: "?" };
}

const PREFIX_WORDS: Record<string, Text> = {
  ord: GLOSSARY.order,
  mpo: GLOSSARY.makerPayout,
  mst: GLOSSARY.makerStatement,
  flg: GLOSSARY.flag,
  qst: GLOSSARY.askTheMaker,
  ans: GLOSSARY.inHerOwnWords,
};

/** A record a reply names: its label in the page's language, and its page when it has one. */
export function refView(id: string, lang: Lang): { label: string; to?: string } {
  const prefix = id.split("_")[0];
  if (prefix === "pc") {
    const p = getById<Piece>(id);
    return { label: p ? t(p.title, lang) : id, to: pieceRoute(id) };
  }
  if (prefix === "mkr") {
    const p = getById<Person>(id);
    return { label: p ? t(p.name, lang) : id, to: makerRoute(id) };
  }
  if (prefix === "com") {
    const c = getById<Community>(id);
    return { label: c ? t(c.name, lang) : id, to: communityRoute(id) };
  }
  if (prefix === "pol") {
    const p = getById<PolicyTopic>(id);
    return { label: p ? t(p.title, lang) : id };
  }
  if (prefix === "ord") return { label: `${t(GLOSSARY.order, lang)} ${id}`, to: receiptRoute(id) };
  // The maker's question and her answer read as the glossary's words; their IDs stay in the tooltip.
  if (prefix === "qst" || prefix === "ans") return { label: t(PREFIX_WORDS[prefix], lang) };
  const word = PREFIX_WORDS[prefix];
  return { label: word ? `${t(word, lang)} ${id}` : id };
}

/**
 * Only what's on screen (A2-14): on the Shop side the piece or the order, or on a store page the
 * storefront's community; on the Sell side the maker on a maker page. Never any other order.
 */
export function contextIdsFor(side: Side, { pieceId, orderId, slug, makerId }: Pick<SlotProps, "pieceId" | "orderId" | "slug" | "makerId">): string[] {
  if (side === "seller") return makerId ? [makerId] : [];
  if (pieceId) return [pieceId];
  if (orderId) return [orderId];
  if (slug) {
    const store = storefronts.find((s) => s.slug === slug);
    return store ? [store.communityId] : [];
  }
  return [];
}

/** The questions scripted mode answers for a side, in demoQuestions' order (the buyer's d04 question first). */
export function questionsFor(side: Side) {
  return demoQuestions.filter((q) => q.side === side);
}
