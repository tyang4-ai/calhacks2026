// The copy watch: the sandbox market's four listings, the scripted scan of mkr_01, the Reporter's
// draft fup_02 and the approval apr_03 that goes with it (R26, figure 14).
//
// DEMO DATA. The sandbox market is static pages of fictional listings that ship with the public
// site at /market/. Every seller is invented. A listing's title, snippet and claim are that
// fictional seller's own words, so they are the one place a claim like "Authentic Native American
// made" appears. Every listing resembles a piece of the Diné co-op only, and every URL is a
// /market/ path (listing-01 to listing-04, in cftId order).
//
// Every similarity is the listing's real normalized text match against its pieceId, pc_01
// (S3-catalog T9, B2-9), computed with B15's formula and the trained model cindia-embed-v1
// (fingerprint f7181c7ddb90af25), from B11's real run of 2026-10-24, Pacific time (trained
// 2026-10-25T05:55:09Z): the listing's "title. snippet" embedded as a query, c its cosine to pc_01,
// b its mean cosine to all 54 pieces, and (c - b) / (1 - b) clipped to 0 to 1, rounded to 2
// decimals. pc_01 is the closest of the co-op's twelve for cft_01 only. For the other three B15's
// live Comparer would match a closer piece (pc_03 for cft_02, pc_07 for cft_03 and cft_04), and
// these records keep pc_01, the piece each listing resembles. Each verdict comes from the evidence
// rule, not the number: cft_01 names the co-op and Grace N. and repeats her story.
import type { Approval, CounterfeitCandidate, FollowUp, ScriptedScan } from "../core/types";
import { pieces } from "./catalog";
import { communities } from "./communities";
import { makers, owner } from "./people";

const grace = makers.find((m) => m.id === "mkr_01");
const firstPiece = pieces.find((p) => p.makerId === "mkr_01");
const coop = communities.find((c) => c.id === "com_dine");
if (!grace || !firstPiece || !coop) throw new Error("watch.ts needs mkr_01, her first piece and com_dine");

/** The first sentence of the piece's own story, which cft_01's snippet repeats word for word. */
const firstSentence = firstPiece.story.en.slice(0, firstPiece.story.en.indexOf(". ") + 1);

export const counterfeitCandidates: CounterfeitCandidate[] = [
  {
    id: "cft_01",
    url: "/market/listing-01.html",
    title: `${grace.name.en} wool weaving, ${coop.name.en}, grey red black`,
    snippet: `${firstSentence} Ready to hang.`,
    pieceId: firstPiece.id,
    similarity: 0.74,
    claim: {
      en: `Says it's woven by ${grace.name.en} of the ${coop.name.en}. She didn't list it there.`,
      zh: `声称由${coop.name.zh}的 ${grace.name.zh} 织成。她没有在那里上架这件作品。`,
    },
    verdict: "possible_copy",
    seller: "Lantern Lane Home Goods",
    priceCents: 9500,
  },
  {
    id: "cft_02",
    url: "/market/listing-02.html",
    title: "Authentic Native American made wool rug, grey and red",
    snippet: "Authentic Native American made wool rug in grey and red, about 60 by 90 cm. Free shipping.",
    pieceId: firstPiece.id,
    similarity: 0.34,
    claim: { en: "Claims to be Native American made. Names no maker.", zh: "声称是美洲原住民制作，但没有写明匠人。" },
    verdict: "claim_only",
    seller: "Canyon Rug Outlet",
    priceCents: 12900,
  },
  {
    id: "cft_03",
    url: "/market/listing-03.html",
    title: "Machine-woven grey and red throw with diamonds",
    snippet: "A machine-woven acrylic throw in grey and red with a diamond pattern. Factory made, not Native made.",
    pieceId: firstPiece.id,
    similarity: 0.4,
    claim: { en: "Says plainly it's factory made. Claims no maker or community.", zh: "明确写着是工厂制造，没有声称出自哪位匠人或哪个社区。" },
    verdict: "neither",
    seller: "Homestead Textile Supply",
    priceCents: 3900,
  },
  {
    id: "cft_04",
    url: "/market/listing-04.html",
    title: "Plain grey wool blanket, queen size",
    snippet: "A plain grey wool blanket, queen size, machine washable.",
    pieceId: firstPiece.id,
    similarity: 0.32,
    claim: { en: "Claims nothing about who made it.", zh: "没有声称是谁制作的。" },
    verdict: "neither",
    seller: "Northfield Bedding Co.",
    priceCents: 6900,
  },
];

// The scan of Grace N. (F-watch's rule): the community's English name, the maker's name with her
// first piece's object, then the first eight words of that piece's English story.
export const scriptedScan: ScriptedScan = {
  scanId: "wsc_01",
  makerId: grace.id,
  queries: [
    coop.name.en,
    `${grace.name.en} ${firstPiece.facets.object.en}`,
    firstPiece.story.en.split(/\s+/).slice(0, 8).join(" "),
  ],
  cftIds: counterfeitCandidates.filter((c) => c.verdict === "possible_copy").map((c) => c.id),
  followUpId: "fup_02",
  approvalId: "apr_03",
};

// The Reporter's draft to the sandbox market's trust team: calm and factual. It says what the
// listing claims and what the co-op can't confirm, uses no accusing word in either language, cites
// no law, and is never sent (L24).
const hit = counterfeitCandidates[0];
export const fup_02: FollowUp = {
  id: "fup_02",
  approvalId: "apr_03",
  to: { en: "Sandbox market, trust team", zh: "沙盒市场信任团队" },
  subject: {
    en: `A listing that names ${grace.name.en} of the ${coop.name.en}`,
    zh: `一件写明${coop.name.zh}的 ${grace.name.zh} 的商品`,
  },
  body: {
    en:
      `Hello,\n\nThe listing at ${hit.url}, "${hit.title}", says the weaving was woven by ${grace.name.en} of the ${coop.name.en}. ` +
      `${grace.name.en} didn't list this piece on your market, and the co-op can't confirm that she made it. ` +
      `The listing's description also repeats a sentence from her own listing on Cindia word for word. ` +
      `Could you look into the listing and let us know what you find?\n\nThank you,\n${owner.name.en}, ${coop.name.en}`,
    zh:
      `您好：\n\n贵市场的商品 ${hit.url}（“${hit.title}”）声称这件编织由${coop.name.zh}的 ${grace.name.zh} 织成。` +
      `${grace.name.zh} 没有在贵市场上架这件作品，合作社也无法确认是她制作的。` +
      `这件商品的描述还逐字重复了她在Cindia上作品介绍中的一句话。` +
      `能否请您查看这件商品，并告诉我们结果？\n\n谢谢！\n${owner.name.zh}，${coop.name.zh}`,
  },
};

export const apr_03: Approval = {
  id: "apr_03",
  kind: "report_listing",
  subjectIds: ["cft_01"],
  proposedBy: "cindy",
  overLimit: false,
  decisionDate: "2026-10-01",
  status: "pending",
};
