// A maker's page (frame-maker): maker.main (two thirds) and maker.side (one third), with the
// studio.drawer.support drawer. It starts in the maker's own lang (English for mkr_01 to mkr_03),
// with Chinese through the toggle. With `legacy` (the stage in Phase A), maker.main sits in v1's
// 390 by 844 phone column.
import { AppChrome } from "../chrome/AppChrome";
import { useSurfaceLang } from "../lang";
import { PUBLIC_SITE } from "../site";
import { SlotFor } from "../Slot";
import type { SlotContext } from "../slotProps";
import { LegacyBox } from "./LegacyBox";
import type { FrameStateProps } from "./ShopSurface";
import { LEGACY_PHONE } from "./views";
import styles from "./surfaces.module.css";

export interface MakerSurfaceProps extends FrameStateProps {
  /** From /maker/:makerId, and mkr_01 on /demo. */
  makerId: string;
  legacy?: boolean;
}

const noop = () => {};

export function MakerSurface({ makerId, drawer, refId, processId, onCloseDrawer, legacy = false }: MakerSurfaceProps) {
  const lang = useSurfaceLang("maker", makerId);
  const ctx: SlotContext = { surface: "maker", lang, publicSite: PUBLIC_SITE, makerId, refId, processId: processId ?? null };
  return (
    <AppChrome frameTestId="frame-maker" ctx={ctx} drawer={drawer ?? null} onCloseDrawer={onCloseDrawer ?? noop}>
      <div className={styles.split}>
        {legacy ? (
          <div className={styles.cell}>
            <LegacyBox size={LEGACY_PHONE} kind="phone">
              <SlotFor slot="maker.main" ctx={ctx} />
            </LegacyBox>
          </div>
        ) : (
          <div className={styles.scrollCell}>
            <SlotFor slot="maker.main" ctx={ctx} />
          </div>
        )}
        <div className={styles.scrollCell}>
          <SlotFor slot="maker.side" ctx={ctx} />
        </div>
      </div>
    </AppChrome>
  );
}
