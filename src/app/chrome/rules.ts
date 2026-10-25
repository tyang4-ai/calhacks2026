// The chrome's small rules, kept out of the component files.
import type { DrawerKind } from "../../core/events";
import type { SlotId } from "../../core/featureTypes";
import type { Side } from "../../ui/SideSwitch";
import type { FrameSurface } from "../slotProps";

/** Maker pages count as Sell and store pages as Shop. */
export function sideOf(surface: FrameSurface): Side {
  return surface === "studio" || surface === "maker" ? "sell" : "shop";
}

/** The slot a drawer kind opens on a surface: Help is shop.drawer.support on Shop and store pages, studio.drawer.support on Sell and maker pages. */
export function drawerSlot(surface: FrameSurface, drawer: DrawerKind): SlotId {
  if (drawer === "ask") return "studio.drawer.ask";
  if (drawer === "audit") return "studio.drawer.audit";
  return surface === "buyer" || surface === "store" ? "shop.drawer.support" : "studio.drawer.support";
}
