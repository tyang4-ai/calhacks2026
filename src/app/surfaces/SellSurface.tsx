// The Sell site (frame-studio): a header with the co-op's name in both languages, L2 beside it
// and Cindy's latest line; the left nav (shell-nav-<view>, 184 px) in route order; the view area;
// and the drawers support, ask and audit. It takes its view and drawer as props, so the stage sets
// them without a URL. With `legacy` (the stage in Phase A), v1's five console views sit in the
// 1192 by 744 legacy box and owner.main in the 390 by 844 column.
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
import { LegacyBox } from "./LegacyBox";
import type { FrameStateProps } from "./ShopSurface";
import { LEGACY_CONSOLE, LEGACY_PHONE, SELL_VIEW_SLOTS, isStudioView } from "./views";
import styles from "./surfaces.module.css";

export interface SellSurfaceProps extends FrameStateProps {
  view: SellView;
  /** The stage's Phase A legacy boxes. Routes never set it. */
  legacy?: boolean;
}

const noop = () => {};

function SellHeader({ lang }: { lang: "en" | "zh" }) {
  const name = studioName();
  const latest = useCindia((s) => (s.agent.latestActId ? (s.agent.acts[s.agent.latestActId]?.text ?? null) : null));
  const line = latest ? latest[lang] : SHELL.cindyIdle[lang];
  return (
    <div className={styles.sellHeader}>
      <div className={styles.coopName}>
        <span className={styles.coopZh} lang="zh">
          {name.zh}
        </span>
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

function ViewBody({ view, ctx, legacy }: { view: SellView; ctx: SlotContext; legacy: boolean }) {
  const layout = SELL_VIEW_SLOTS[view];
  if (legacy && isStudioView(view)) {
    return (
      <main data-view={view} className={styles.viewLegacy}>
        <LegacyBox size={LEGACY_CONSOLE} kind="console" side={Boolean(layout.side)}>
          <div className={styles.legacyCell}>
            <SlotFor slot={layout.main} ctx={ctx} />
          </div>
          {layout.side && (
            <div className={styles.legacyCell}>
              <SlotFor slot={layout.side} ctx={ctx} />
            </div>
          )}
        </LegacyBox>
      </main>
    );
  }
  if (legacy && view === "approvals") {
    return (
      <main data-view={view} className={styles.viewLegacy}>
        <LegacyBox size={LEGACY_PHONE} kind="phone">
          <SlotFor slot={layout.main} ctx={ctx} />
        </LegacyBox>
      </main>
    );
  }
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

export function SellSurface({ view, drawer, refId, processId, onCloseDrawer, legacy = false }: SellSurfaceProps) {
  const lang = useSurfaceLang("studio");
  const ctx: SlotContext = { surface: "studio", lang, publicSite: PUBLIC_SITE, sellView: view, refId, processId: processId ?? null };
  return (
    <AppChrome frameTestId="frame-studio" ctx={ctx} drawer={drawer ?? null} onCloseDrawer={onCloseDrawer ?? noop}>
      <SellHeader lang={lang} />
      <div className={styles.sellRow}>
        <SellNav view={view} lang={lang} />
        <ViewBody view={view} ctx={ctx} legacy={legacy} />
      </div>
    </AppChrome>
  );
}
