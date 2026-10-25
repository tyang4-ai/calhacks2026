// Feature module types from docs/common/ui-contract.md. Features import these from src/core/.
import type { ComponentType } from "react";
import type { ProcessId } from "./events";

/**
 * The surfaces. `owner` stays a SurfaceId so the approvals feature can tell where it renders, but in
 * v2 it has no frame or route of its own: owner.main renders as the Sell site's approvals view.
 */
export type SurfaceId = "buyer" | "studio" | "owner" | "maker" | "store";

export type SlotId =
  | "buyer.main"
  | "studio.map.main"
  | "studio.month.main"
  | "studio.month.side"
  | "studio.close.main"
  | "studio.close.side"
  | "studio.proof.main"
  | "studio.dashboard.main"
  | "studio.drawer.ask"
  | "studio.drawer.audit"
  | "owner.main"
  | "maker.main"
  | "process.bar"
  | "process.view"
  | "shop.home.main"
  | "shop.home.communities"
  | "shop.search.main"
  | "shop.piece.main"
  | "shop.piece.side"
  | "shop.community.main"
  | "shop.projects.main"
  | "shop.receipt.main"
  | "shop.drawer.support"
  | "store.main"
  | "studio.overview.main"
  | "studio.listings.main"
  | "studio.storefront.main"
  | "studio.projects.main"
  | "studio.proof.side"
  | "studio.watch.main"
  | "studio.drawer.support"
  | "maker.side";

export const SLOT_IDS: readonly SlotId[] = [
  "buyer.main",
  "studio.map.main",
  "studio.month.main",
  "studio.month.side",
  "studio.close.main",
  "studio.close.side",
  "studio.proof.main",
  "studio.dashboard.main",
  "studio.drawer.ask",
  "studio.drawer.audit",
  "owner.main",
  "maker.main",
  "process.bar",
  "process.view",
  "shop.home.main",
  "shop.home.communities",
  "shop.search.main",
  "shop.piece.main",
  "shop.piece.side",
  "shop.community.main",
  "shop.projects.main",
  "shop.receipt.main",
  "shop.drawer.support",
  "store.main",
  "studio.overview.main",
  "studio.listings.main",
  "studio.storefront.main",
  "studio.projects.main",
  "studio.proof.side",
  "studio.watch.main",
  "studio.drawer.support",
  "maker.side",
];

export interface SlotProps {
  surface: SurfaceId;
  /** Already resolved by the shell. Features never read the store's lang. */
  lang: "en" | "zh";
  /** The maker page (from /maker/:makerId, mkr_01 on /demo), and studio.drawer.support on a maker page. */
  makerId?: string;
  /** The audit drawer (?drawer=audit&ref=<entity id>), and owner.main from /sell/approvals?ref=<approvalId>. */
  refId?: string;
  /** process.bar (the open process) and process.view. */
  processId?: ProcessId;
  /** The piece page, and shop.drawer.support while a piece page is open. */
  pieceId?: string;
  communityId?: string;
  /** A prj_ or a wip_ ID on /shop/projects/:id. */
  projectId?: string;
  /** The receipt page, and shop.drawer.support while a receipt is open. */
  orderId?: string;
  /** The storefront page, and shop.drawer.support on a store page. */
  slug?: string;
  side?: "buyer" | "seller";
  /** /shop/search: ?q= and every ?k=. k is always an array, empty when the URL has none. */
  searchParams?: { q?: string; k: string[] };
  /** True on every slot of the public build only. */
  publicSite?: boolean;
}

export interface FeatureModule {
  /** The feature's slug, the same as its folder name. */
  id: string;
  slots: Partial<Record<SlotId, ComponentType<SlotProps>>>;
}

/** The tour's camera states (ui-contract.md, Camera states). */
export type TourCameraId =
  | "pitch"
  | "shop-home"
  | "shop-search"
  | "shop-piece"
  | "shop-receipt"
  | "sell-map"
  | "sell-month"
  | "sell-approvals"
  | "sell-close"
  | "sell-proof"
  | "sell-watch"
  | "sell-listings"
  | "sell-storefront"
  | "sell-catch"
  | "maker"
  | "store";

export const TOUR_CAMERA_IDS: readonly TourCameraId[] = [
  "pitch",
  "shop-home",
  "shop-search",
  "shop-piece",
  "shop-receipt",
  "sell-map",
  "sell-month",
  "sell-approvals",
  "sell-close",
  "sell-proof",
  "sell-watch",
  "sell-listings",
  "sell-storefront",
  "sell-catch",
  "maker",
  "store",
];

/** The cameras beat.started carries: the tour's only, since I2-tour. */
export type CameraId = TourCameraId;

/** Every camera ID once. validate.ts checks beat.started.camera against it. */
export const CAMERA_IDS: readonly CameraId[] = TOUR_CAMERA_IDS;

/** The eleven Sell views, in route order. */
export type SellView =
  | "overview"
  | "listings"
  | "storefront"
  | "projects"
  | "map"
  | "month"
  | "close"
  | "proof"
  | "dashboard"
  | "approvals"
  | "watch";

export const SELL_VIEWS: readonly SellView[] = [
  "overview",
  "listings",
  "storefront",
  "projects",
  "map",
  "month",
  "close",
  "proof",
  "dashboard",
  "approvals",
  "watch",
];

/** Converts a slot ID to its placeholder test ID suffix: "studio.month.side" to "studio-month-side". */
export function slotTestId(slot: SlotId): string {
  return slot.replace(/\./g, "-");
}
