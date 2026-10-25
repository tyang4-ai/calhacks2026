// The Sell site (frame-studio): a header with the co-op's name (English only), L2 beside it and
// Cindy's latest line; the left nav (shell-nav-<view>, 184 px) in route order; the view area; and
// the drawers support, ask and audit. It takes its view and drawer as props, so the stage sets
// them without a URL.
import { SELL_VIEWS, type SellView } from "../../core/featureTypes";
import { sellRoute } from "../../core/nav";
import { useCindia } from "../../core/store";
import { Link } from "../../ui/Link";
import { AppChrome } from "../chrome/AppChrome";
import { useSurfaceLang } from "../lang";
import { PUBLIC_SITE } from "../site";
import { SlotFor } from "../Slot";
import type { SlotContext } from "../slotProps";
import { L2, SELL_VIEW_LABELS, SHELL } from "../strings";
import { studioName } from "../studioInfo";
import type { FrameStateProps } from "./ShopSurface";
import { SELL_VIEW_SLOTS } from "./views";
import styles from "./surfaces.module.css";

export interface SellSurfaceProps extends FrameStateProps {
  view: SellView;
}

const noop = () => {};

function SellHeader({ lang }: { lang: "en" | "zh" }) {
  const name = studioName();
  const latest = useCindia((s) => (s.agent.latestActId ? (s.agent.acts[s.agent.latestActId]?.text ?? null) : null));
  const line = latest ? latest[lang] : SHELL.cindyIdle[lang];
  return (
    <div className={styles.sellHeader}>
      <div className={styles.coopName}>
        <span className={styles.coopEn} lang="en">
          {name.en}
        </span>
      </div>
      <p className={styles.l2}>{L2[lang]}</p>
      <div className={latest ? styles.cindy : styles.cindyIdle} aria-live="polite" title={line}>
        <strong style={{ fontWeight: 600 }}>Cindy</strong> · {line}
      </div>
    </div>
  );
}

function SellNav({ view, lang }: { view: SellView; lang: "en" | "zh" }) {
  return (
    <nav className={styles.sellNav} aria-label={SHELL.views[lang]}>
      {SELL_VIEWS.map((v) => (
        <Link key={v} to={sellRoute(v)} testId={`shell-nav-${v}`} variant="block" className={v === view ? styles.navItemOn : styles.navItem}>
          {SELL_VIEW_LABELS[v][lang]}
        </Link>
      ))}
    </nav>
  );
}

function ViewBody({ view, ctx }: { view: SellView; ctx: SlotContext }) {
  const layout = SELL_VIEW_SLOTS[view];
  return (
    <main data-view={view} className={styles.view} style={{ gridTemplateColumns: layout.side ? "2fr 1fr" : "1fr" }}>
      <div className={styles.cell}>
        <SlotFor slot={layout.main} ctx={ctx} />
      </div>
      {layout.side && (
        <div className={styles.cell}>
          <SlotFor slot={layout.side} ctx={ctx} />
        </div>
      )}
    </main>
  );
}

export function SellSurface({ view, drawer, refId, processId, onCloseDrawer, processOverlay }: SellSurfaceProps) {
  const lang = useSurfaceLang("studio");
  const ctx: SlotContext = { surface: "studio", lang, publicSite: PUBLIC_SITE, sellView: view, refId, processId: processId ?? null };
  return (
    <AppChrome frameTestId="frame-studio" ctx={ctx} drawer={drawer ?? null} onCloseDrawer={onCloseDrawer ?? noop} processOverlay={processOverlay}>
      <SellHeader lang={lang} />
      <div className={styles.sellRow}>
        <SellNav view={view} lang={lang} />
        <ViewBody view={view} ctx={ctx} />
      </div>
    </AppChrome>
  );
}
