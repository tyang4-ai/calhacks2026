// The Sell site's view table. Pure, so the unit tests and the stage share it.
import { SELL_VIEWS, type SellView, type SlotId } from "../../core/featureTypes";

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
