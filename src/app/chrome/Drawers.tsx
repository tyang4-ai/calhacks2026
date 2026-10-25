// The page's one drawer, in the kit's Drawer (440 px from the right, above the process overlay):
// Shop and store pages take ?drawer=support (shop.drawer.support), maker pages ?drawer=support
// (studio.drawer.support), and Sell views support, ask and audit.
import type { DrawerKind } from "../../core/events";
import { Drawer } from "../../ui/Drawer";
import { SlotFor } from "../Slot";
import type { SlotContext } from "../slotProps";
import { DRAWER_TITLES } from "../strings";
import { drawerKindsFor } from "../useDrawer";
import styles from "./chrome.module.css";
import { drawerSlot } from "./rules";

export function Drawers({ ctx, drawer, onClose }: { ctx: SlotContext; drawer: DrawerKind | null; onClose: () => void }) {
  const open = drawer && drawerKindsFor(ctx.surface).includes(drawer) ? drawer : null;
  if (!open) return null;
  return (
    // A new kind remounts the drawer, so it slides in again.
    <Drawer key={open} open onClose={onClose} title={DRAWER_TITLES[open]} lang={ctx.lang}>
      <div className={styles.drawerSlot} data-drawer={open}>
        <SlotFor slot={drawerSlot(ctx.surface, open)} ctx={ctx} />
      </div>
    </Drawer>
  );
}
