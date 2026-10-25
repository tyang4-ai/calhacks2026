// The desktop checkout's pure rules (M-buyer T4), kept apart from the components so a unit test
// covers each one: whether pay is open, blocked by the public build or done for this piece, whether
// the project add-on can emit and reads on, which contribution belongs to this piece's checkout, and
// the next contribution ID a person's click takes.
import type { Payloads } from "../../core/events";

/** Pay on one piece: open, blocked by the public build, or done once this piece's checkout started. */
export type PayState = "open" | "blocked" | "done";

export interface PayInput {
  /** SlotProps.publicSite: the public build, where nothing can be bought. */
  publicSite: boolean;
  /** True once buyer.checkouts[pieceId] is in the store. */
  checkedOut: boolean;
}

/** The public build blocks pay on every piece. Otherwise pay is open until this piece's own checkout starts. */
export function payState({ publicSite, checkedOut }: PayInput): PayState {
  if (publicSite) return "blocked";
  return checkedOut ? "done" : "open";
}

/** The add-on switch is locked on the public build and once this piece's checkout started. */
export function addOnLocked(input: PayInput): boolean {
  return input.publicSite || input.checkedOut;
}

/** A pay click may emit a contribution only where pay is open and the buyer switched the add-on on. */
export function addOnCanEmit(input: PayInput & { switchedOn: boolean }): boolean {
  return payState(input) === "open" && input.switchedOn;
}

/**
 * The switch reads on whenever the store holds a contribution for this piece's checkout. Before the
 * checkout, it also reads on while the buyer has it switched on, except on the public build, where
 * it stays off unless the tour's own contribution turns it on.
 */
export function addOnOn(input: PayInput & { switchedOn: boolean; funded: boolean }): boolean {
  if (input.funded) return true;
  return !addOnLocked(input) && input.switchedOn;
}

type Contribution = Payloads["project.funded"];

export interface ContributionLookup {
  pieceId: string;
  /** The contribution this page's own pay click emitted, while the page remembers it. */
  ownId: string | null;
  /** The piece an order is for: the store's order, or a mock order through getById(). */
  pieceOfOrder: (orderId: string) => string | undefined;
}

/**
 * The contribution for this piece's checkout: this page's own one while the store still holds it,
 * or else the first whose orderId names an order of this piece (the tour's ctb_01 names ord_001,
 * pc_01's order). One at most, so the tour's ctb_01 arriving after a person's own adds no second line.
 */
export function contributionFor(contributions: Record<string, Contribution>, { pieceId, ownId, pieceOfOrder }: ContributionLookup): Contribution | null {
  if (ownId !== null && contributions[ownId]) return contributions[ownId];
  for (const c of Object.values(contributions)) {
    if (c.orderId !== undefined && pieceOfOrder(c.orderId) === pieceId) return c;
  }
  return null;
}

const USER_CONTRIBUTION = /^ctb_user_(\d+)$/;

/** The next ctb_user_<n> after every person's contribution in the store (data-model.md, ID scheme). */
export function nextContributionId(contributions: Record<string, unknown>): string {
  let top = 0;
  for (const id of Object.keys(contributions)) {
    const m = USER_CONTRIBUTION.exec(id);
    if (m) top = Math.max(top, Number(m[1]));
  }
  return `ctb_user_${top + 1}`;
}

/** A person's own order, which never enters the month and is never paid out (L10). */
export function isUserOrder(orderId: string): boolean {
  return orderId.startsWith("ord_user_");
}

/** The newest order in the store for one piece, or null. orderIds runs oldest first. */
export function newestOrderFor(orderIds: string[], orders: Record<string, { pieceId: string }>, pieceId: string): string | null {
  for (let i = orderIds.length - 1; i >= 0; i--) {
    if (orders[orderIds[i]]?.pieceId === pieceId) return orderIds[i];
  }
  return null;
}
