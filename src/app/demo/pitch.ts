// The three pitch cards that open the tour (p01-what, p02-why, p03-how), and the tagline the end
// card repeats. The text is final: Gordon approved it in docs/v2/video-brief.md section 7 (decisions.md,
// Oct 25 00:22 PT), and his 3:25 AM message gave the Cindia card its new tagline and last line
// (decisions.md, Oct 25 03:30 PT). If the two ever differ, this file wins. English only, like the whole site.

export type PitchCardId = "what" | "why" | "how";

export interface PitchCardText {
  id: PitchCardId;
  /** The beat that shows the card. */
  beatId: string;
  title: string;
  /** At most four short lines, one per bullet. */
  lines: string[];
}

/** The tagline: the first line of the Cindia card, repeated on the end card. */
export const TAGLINE = "Describe the vibe. Gift the piece. Pay the person.";

export const PITCH_CARDS: readonly PitchCardText[] = [
  // [GORDON] The Cindia card, approved by Gordon (video-brief.md section 7; new tagline and last line, Oct 25 3:25 AM).
  {
    id: "what",
    beatId: "p01-what",
    title: "Cindia",
    lines: [
      TAGLINE,
      "A platform for underrepresented makers, starting with Native American makers.",
      "Yes, it's like Etsy. But we do the selling, the marketing and the books for them.",
      "Tell us who the gift is for, and we find handmade pieces that fit them.",
    ],
  },
  // [GORDON] The Why card, approved by Gordon (video-brief.md section 7; new last line, Oct 25 4:58 AM).
  {
    id: "why",
    beatId: "p02-why",
    title: "Why",
    lines: [
      "Selling online takes time, broadband and marketing reach that many makers on tribal lands don't have.",
      "On a marketplace, a co-op gets one payout and splits it by hand.",
      // Source: the U.S. Attorney's case of Aug 5, 2026 (docs/v2/fix-plan.md section 1.3), where
      // one eBay seller admitted to selling more than $92,000 of fake Native-made goods.
      "Fakes sell as Native-made. In August, one eBay seller admitted to selling more than $92,000 of them.",
      "Their craft, their prices, their say. We do the paperwork.",
    ],
  },
  // [GORDON] The How card, approved by Gordon (video-brief.md section 7).
  {
    id: "how",
    beatId: "p03-how",
    title: "How it works",
    lines: [
      "A swarm of small Claude agents, each with one job, on Haiku and Sonnet.",
      "Our own embedding model, fine-tuned on queries Claude wrote, embeds every listing.",
      "SpacetimeDB holds every record, and Elastic searches them.",
      "A person approves anything that moves money.",
    ],
  },
];

/** The card a beat shows: its own, or the first card before the first beat and after a reset. */
export function pitchCardFor(beatId: string | null): PitchCardText {
  return PITCH_CARDS.find((c) => c.beatId === beatId) ?? PITCH_CARDS[0];
}
