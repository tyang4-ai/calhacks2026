// The Shop site (frame-buyer): every /shop page. It takes its page and drawer as props, so the
// stage can set them without a URL. I2-tour removed the Phase A legacy page /shop/legacy (D1-42).
import type { DrawerKind, ProcessId } from "../../core/events";
import { AppChrome } from "../chrome/AppChrome";
import { useSurfaceLang } from "../lang";
import { PUBLIC_SITE } from "../site";
import { SlotFor } from "../Slot";
import type { ShopPage, SlotContext } from "../slotProps";
import styles from "./surfaces.module.css";

/** What every surface takes from its route or the stage, besides its page. */
export interface FrameStateProps {
  drawer?: DrawerKind | null;
  /** ?ref=: the audit drawer's entity, or the approval /sell/approvals selects. */
  refId?: string;
  /** The open process view, or null. */
  processId?: ProcessId | null;
  onCloseDrawer?: () => void;
  /** False on the /demo stage, which draws the process view in its own panel (AppChrome). */
  processOverlay?: boolean;
}

export interface ShopSurfaceProps extends FrameStateProps {
  page: ShopPage;
  pieceId?: string;
  orderId?: string;
  communityId?: string;
  projectId?: string;
  searchParams?: { q?: string; k: string[] };
}

const noop = () => {};

function ShopPageBody({ ctx }: { ctx: SlotContext }) {
  switch (ctx.shopPage) {
    case "home":
      return (
        <div className={styles.stack}>
          <div className={styles.stackMain}>
            <SlotFor slot="shop.home.main" ctx={ctx} />
          </div>
          <div className={styles.stackSecond}>
            <SlotFor slot="shop.home.communities" ctx={ctx} />
          </div>
        </div>
      );
    case "search":
      return (
        <div className={styles.page}>
          <SlotFor slot="shop.search.main" ctx={ctx} />
        </div>
      );
    case "piece":
      return (
        <div className={styles.split}>
          <div className={styles.scrollCell}>
            <SlotFor slot="shop.piece.main" ctx={ctx} />
          </div>
          <div className={styles.scrollCell}>
            <SlotFor slot="shop.piece.side" ctx={ctx} />
          </div>
        </div>
      );
    case "community":
      return (
        <div className={styles.page}>
          <SlotFor slot="shop.community.main" ctx={ctx} />
        </div>
      );
    case "projects":
      return (
        <div className={styles.page}>
          <SlotFor slot="shop.projects.main" ctx={ctx} />
        </div>
      );
    case "receipt":
    default:
      return (
        <div className={styles.page}>
          <SlotFor slot="shop.receipt.main" ctx={ctx} />
        </div>
      );
  }
}

export function ShopSurface({ page, pieceId, orderId, communityId, projectId, searchParams, drawer, refId, processId, onCloseDrawer, processOverlay }: ShopSurfaceProps) {
  const lang = useSurfaceLang("buyer");
  const ctx: SlotContext = {
    surface: "buyer",
    lang,
    publicSite: PUBLIC_SITE,
    shopPage: page,
    pieceId: page === "piece" ? pieceId : undefined,
    orderId: page === "receipt" ? orderId : undefined,
    communityId: page === "community" ? communityId : undefined,
    projectId: page === "projects" ? projectId : undefined,
    searchParams: page === "search" ? (searchParams ?? { k: [] }) : undefined,
    refId,
    processId: processId ?? null,
  };
  return (
    <AppChrome frameTestId="frame-buyer" ctx={ctx} drawer={drawer ?? null} onCloseDrawer={onCloseDrawer ?? noop} processOverlay={processOverlay}>
      <ShopPageBody ctx={ctx} />
    </AppChrome>
  );
}
