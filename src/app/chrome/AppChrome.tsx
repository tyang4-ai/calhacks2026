// The chrome every surface wears inside its PageFrame: the top bar (shell-topnav) with the word
// Cindia, the Shop and Sell switch, L1, Help and Ask Cindy on Sell views (English only, so no
// language toggle);
// the 64 px process bar band holding process.bar; then the page body with the page, the process
// overlay and the one drawer. The buttons call src/core/nav.ts, so they act the same on a route and
// on /demo, where the stage's navigator takes the calls.
import type { ReactNode } from "react";
import type { DrawerKind } from "../../core/events";
import { navigate, openDrawer, sellRoute, shopRoute } from "../../core/nav";
import { Button } from "../../ui/Button";
import { PageFrame } from "../../ui/PageFrame";
import { SideSwitch } from "../../ui/SideSwitch";
import { TopNav } from "../../ui/TopNav";
import { SlotFor } from "../Slot";
import type { FrameSurface, SlotContext } from "../slotProps";
import { sideOf } from "./rules";
import { L1, SHELL } from "../strings";
import { Drawers } from "./Drawers";
import { ProcessOverlay } from "./ProcessOverlay";
import styles from "./chrome.module.css";

function ShellTopNav({ surface, lang }: { surface: FrameSurface; lang: "en" | "zh" }) {
  return (
    <TopNav
      testId="shell-topnav"
      lang={lang}
      left={
        <>
          <span className={styles.wordmark} lang="en">
            Cindia
          </span>
          <SideSwitch
            value={sideOf(surface)}
            onChange={(side) => navigate(side === "shop" ? shopRoute() : sellRoute("overview"))}
            labels={{ shop: SHELL.shop, sell: SHELL.sell }}
            testIds={{ shop: "shell-side-shop", sell: "shell-side-sell" }}
            lang={lang}
          />
        </>
      }
      right={
        <>
          <span className={styles.notice}>{L1[lang]}</span>
          <Button variant="quiet" size="small" testId="shell-help" onClick={() => openDrawer("support")}>
            {SHELL.help[lang]}
          </Button>
          {surface === "studio" && (
            <Button variant="quiet" size="small" onClick={() => openDrawer("ask")}>
              {SHELL.askCindy[lang]}
            </Button>
          )}
        </>
      }
    />
  );
}

export interface AppChromeProps {
  frameTestId: string;
  /** The page the frame shows, with its surface and resolved language. */
  ctx: SlotContext;
  drawer: DrawerKind | null;
  onCloseDrawer: () => void;
  /**
   * False on the /demo stage, which shows the process view in its own panel beside the frame, so the
   * frame keeps the open process for its process bar but draws no overlay. True on routes.
   */
  processOverlay?: boolean;
  children?: ReactNode;
}

export function AppChrome({ frameTestId, ctx, drawer, onCloseDrawer, processOverlay = true, children }: AppChromeProps) {
  return (
    <PageFrame testId={frameTestId} lang={ctx.lang}>
      <ShellTopNav surface={ctx.surface} lang={ctx.lang} />
      <div className={styles.band}>
        <SlotFor slot="process.bar" ctx={ctx} />
      </div>
      <div className={styles.body}>
        {children}
        {processOverlay && ctx.processId && <ProcessOverlay ctx={ctx} />}
        <Drawers ctx={ctx} drawer={drawer} onClose={onCloseDrawer} />
      </div>
    </PageFrame>
  );
}
