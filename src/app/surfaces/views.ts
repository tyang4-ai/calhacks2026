// The Sell site's view table, the Phase A legacy boxes' sizes and their fit rule. Pure, so the
// unit tests and the stage share them.
import { SELL_VIEWS, STUDIO_VIEWS, type SellView, type SlotId, type StudioView } from "../../core/featureTypes";

/** Each Sell view's slots (ui-contract.md, Sell views). A view with a side slot gives main two thirds. */
export const SELL_VIEW_SLOTS: Record<SellView, { main: SlotId; side?: SlotId }> = {
  overview: { main: "studio.overview.main" },
  listings: { main: "studio.listings.main" },
  storefront: { main: "studio.storefront.main" },
  projects: { main: "studio.projects.main" },
  map: { main: "studio.map.main" },
  month: { main: "studio.month.main", side: "studio.month.side" },
  close: { main: "studio.close.main", side: "studio.close.side" },
  proof: { main: "studio.proof.main", side: "studio.proof.side" },
  dashboard: { main: "studio.dashboard.main" },
  approvals: { main: "owner.main" },
  watch: { main: "studio.watch.main" },
};

export function isSellView(v: string | undefined): v is SellView {
  return v !== undefined && (SELL_VIEWS as readonly string[]).includes(v);
}

/** v1's five console views, which sit in the console legacy box on the stage in Phase A. */
export function isStudioView(v: SellView): v is StudioView {
  return (STUDIO_VIEWS as readonly string[]).includes(v);
}

export interface BoxSize {
  w: number;
  h: number;
}

/** v1's console view area: the 1280 by 800 console less its 56 px top bar and 88 px rail. */
export const LEGACY_CONSOLE: BoxSize = { w: 1192, h: 744 };
/** v1's phone, for owner.main and maker.main. */
export const LEGACY_PHONE: BoxSize = { w: 390, h: 844 };
/** The Phase A legacy page's column for buyer.main: 480 wide at the phone's height. */
export const LEGACY_COLUMN: BoxSize = { w: 480, h: 844 };
/** Room kept around a legacy box inside the space the page gives it. */
export const LEGACY_PAD = 8;

/** The scale that fits a box into a space with LEGACY_PAD around it: scaled down to fit, never up. */
export function legacyScale(box: BoxSize, space: BoxSize, pad = LEGACY_PAD): number {
  const w = (space.w - 2 * pad) / box.w;
  const h = (space.h - 2 * pad) / box.h;
  const s = Math.min(1, w, h);
  return s > 0 && Number.isFinite(s) ? s : 1;
}
