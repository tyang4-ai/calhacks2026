// Feature module types from docs/common/ui-contract.md. Features import these from src/core/.
import type { ComponentType } from "react";

export type SurfaceId = "buyer" | "studio" | "owner" | "maker";

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
  | "maker.main";

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
];

export interface SlotProps {
  surface: SurfaceId;
  /** Already resolved by the shell. Features never read the store's lang. */
  lang: "en" | "zh";
  /** The maker surface only: from /maker/:makerId, and mkr_01 on /demo. */
  makerId?: string;
  /** The audit drawer only: from ?drawer=audit&ref=<entity id>. */
  refId?: string;
}

export interface FeatureModule {
  /** The feature's slug, the same as its folder name. */
  id: string;
  slots: Partial<Record<SlotId, ComponentType<SlotProps>>>;
}

/** The eight camera states in ui-contract.md. */
export type CameraId =
  | "buyer"
  | "buyer-studio"
  | "studio-month"
  | "studio-catch"
  | "studio-owner"
  | "studio-close"
  | "maker"
  | "receipt";

export const CAMERA_IDS: readonly CameraId[] = [
  "buyer",
  "buyer-studio",
  "studio-month",
  "studio-catch",
  "studio-owner",
  "studio-close",
  "maker",
  "receipt",
];

export type StudioView = "map" | "month" | "close" | "proof" | "dashboard";

export const STUDIO_VIEWS: readonly StudioView[] = ["map", "month", "close", "proof", "dashboard"];

/** Converts a slot ID to its placeholder test ID suffix: "studio.month.side" to "studio-month-side". */
export function slotTestId(slot: SlotId): string {
  return slot.replace(/\./g, "-");
}
