// A storefront (frame-store): store.main, full width, with the shop.drawer.support drawer. Store
// pages count as Shop.
import { AppChrome } from "../chrome/AppChrome";
import { useSurfaceLang } from "../lang";
import { PUBLIC_SITE } from "../site";
import { SlotFor } from "../Slot";
import type { SlotContext } from "../slotProps";
import type { FrameStateProps } from "./ShopSurface";
import styles from "./surfaces.module.css";

export interface StoreSurfaceProps extends FrameStateProps {
  slug: string;
}

const noop = () => {};

export function StoreSurface({ slug, drawer, refId, processId, onCloseDrawer }: StoreSurfaceProps) {
  const lang = useSurfaceLang("store");
  const ctx: SlotContext = { surface: "store", lang, publicSite: PUBLIC_SITE, slug, refId, processId: processId ?? null };
  return (
    <AppChrome frameTestId="frame-store" ctx={ctx} drawer={drawer ?? null} onCloseDrawer={onCloseDrawer ?? noop}>
      <div className={styles.page}>
        <SlotFor slot="store.main" ctx={ctx} />
      </div>
    </AppChrome>
  );
}
