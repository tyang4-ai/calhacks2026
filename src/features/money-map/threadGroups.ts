// Groups money moves into one path per ordered pair of parties (from, then to), in arrival order.
// Pure and deterministic: the same moves always give the same groups. No React here.
import type { MoneyMove, MoneyMoveKind, Party } from "../../core";
import type { ThreadProps } from "../../ui";
import { partyKey } from "./partyLayout";

/**
 * A move's thread tone, by the colors rule in design-system.md: jade ("in") for money that
 * arrived in the studio or with a maker, seal ("out") for fees going out, ink for everything else.
 */
export function moveTone(kind: MoneyMoveKind, to: Party): NonNullable<ThreadProps["tone"]> {
  if (kind === "fee") return "out";
  if (to.kind === "studio" || to.kind === "maker") return "in";
  return "neutral";
}

export interface ThreadGroup {
  /** Stable key for the ordered pair: "<from key>><to key>", for example "cindia>studio". */
  key: string;
  from: Party;
  to: Party;
  /** The moves on this path, oldest first. The last one is the newest. */
  moveIds: string[];
  /** Sum of the moves' amounts, in cents. */
  totalCents: number;
}

export function pairKey(from: Party, to: Party): string {
  return `${partyKey(from)}>${partyKey(to)}`;
}

/** One group per ordered from-to pair, ordered by the pair's first move. */
export function groupMoves(moves: readonly MoneyMove[]): ThreadGroup[] {
  const groups: ThreadGroup[] = [];
  const byKey = new Map<string, ThreadGroup>();
  for (const m of moves) {
    const key = pairKey(m.from, m.to);
    let g = byKey.get(key);
    if (!g) {
      g = { key, from: m.from, to: m.to, moveIds: [], totalCents: 0 };
      byKey.set(key, g);
      groups.push(g);
    }
    g.moveIds.push(m.moveId);
    g.totalCents += m.amountCents;
  }
  return groups;
}
