// The shared shape of catalog parts A and B (S3-catalog T3 and T4): one compact spec per piece,
// turned into a Piece with every v1 and v2 field. Pure, no wall clock, no randomness.
import type { Piece, Text } from "../../core/types";

export interface PieceSpec {
  id: string;
  makerId: string;
  kind: "featured" | "series";
  title: Text;
  priceCents: number;
  hours: number;
  materialsCents: number;
  /** Two or three plain sentences (R11). The first goes into the index passage. */
  story: Text;
  /** Physical steps (R13) with their hours, which add up to hours. */
  process: [Text, number][];
  object: Text;
  materials: string[];
  techniques: string[];
  motifs: string[];
  colors: string[];
  sizeCm?: { w: number; h: number };
  leadTimeDays: number;
  moods: string[];
  occasions: string[];
  recipients: string[];
  /** What the illustration shows. */
  imageAlt: Text;
}

/** A Piece from its spec. Featured pieces are one of a kind, series pieces are made again. */
export function buildPiece(s: PieceSpec, communityId: string, heritage: Text): Piece {
  return {
    id: s.id,
    title: s.title,
    makerId: s.makerId,
    kind: s.kind,
    hours: s.hours,
    materialsCents: s.materialsCents,
    priceCents: s.priceCents,
    story: s.story,
    heritage,
    process: s.process.map(([step, hours]) => ({ step, hours })),
    image: `/images/${s.id}.svg`,
    communityId,
    // Lists are copied, so pieces that share a list in their spec never share an array.
    facets: {
      object: s.object,
      materials: [...s.materials],
      techniques: [...s.techniques],
      motifs: [...s.motifs],
      colors: [...s.colors],
      ...(s.sizeCm ? { sizeCm: { ...s.sizeCm } } : {}),
      oneOfAKind: s.kind === "featured",
      leadTimeDays: s.leadTimeDays,
    },
    vibe: { moods: [...s.moods], occasions: [...s.occasions], recipients: [...s.recipients] },
    imageAlt: s.imageAlt,
  };
}
