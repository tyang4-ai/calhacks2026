// A maker's page (frame-maker): maker.main (two thirds) and maker.side (one third), with the
// studio.drawer.support drawer. English only, like every page.
import { AppChrome } from "../chrome/AppChrome";
import { useSurfaceLang } from "../lang";
import { PUBLIC_SITE } from "../site";
import { SlotFor } from "../Slot";
import type { SlotContext } from "../slotProps";
import type { FrameStateProps } from "./ShopSurface";
import styles from "./surfaces.module.css";

export interface MakerSurfaceProps extends FrameStateProps {
  /** From /maker/:makerId, and mkr_01 on /demo. */
  makerId: string;
}

const noop = () => {};

export function MakerSurface({ makerId, drawer, refId, processId, onCloseDrawer, processOverlay }: MakerSurfaceProps) {
  const lang = useSurfaceLang("maker", makerId);
  const ctx: SlotContext = { surface: "maker", lang, publicSite: PUBLIC_SITE, makerId, refId, processId: processId ?? null };
  return (
    <AppChrome frameTestId="frame-maker" ctx={ctx} drawer={drawer ?? null} onCloseDrawer={onCloseDrawer ?? noop} processOverlay={processOverlay}>
      <div className={styles.split}>
        <div className={styles.scrollCell}>
          <SlotFor slot="maker.main" ctx={ctx} />
        </div>
        <div className={styles.scrollCell}>
          <SlotFor slot="maker.side" ctx={ctx} />
        </div>
      </div>
    </AppChrome>
  );
}
