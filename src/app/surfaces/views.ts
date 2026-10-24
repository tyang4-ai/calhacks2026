import type { SlotId, StudioView } from "../../core/featureTypes";

export type DrawerId = "ask" | "audit";

/** Each studio view's layout, fixed by the shell. A view with a side slot gives main two thirds. */
export const VIEW_SLOTS: Record<StudioView, { main: SlotId; side?: SlotId }> = {
  map: { main: "studio.map.main" },
  month: { main: "studio.month.main", side: "studio.month.side" },
  close: { main: "studio.close.main", side: "studio.close.side" },
  proof: { main: "studio.proof.main" },
  dashboard: { main: "studio.dashboard.main" },
};

/** The studio view each camera state shows (ui-contract.md, Camera states), for the I1 stage. */
export const CAMERA_VIEW = {
  buyer: null,
  "buyer-studio": "map",
  "studio-month": "month",
  "studio-catch": "month",
  "studio-owner": "month",
  "studio-close": "close",
  maker: "close",
  receipt: null,
} as const satisfies Record<string, StudioView | null>;
