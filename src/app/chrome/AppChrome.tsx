// The chrome every surface wears inside its PageFrame: the beam (design/layout.md), which is the
// top bar (shell-topnav) with the word Cindia, the Shop and Sell switch, then at the right L1 on two
// lines, Ask Cindy on Sell views and Help (English only, so no language toggle), and the 64 px
// process bar band holding process.bar; then the page body on the ground with the page, the process
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
import { makerName } from "../studioInfo";
import { Drawers } from "./Drawers";
import { ProcessOverlay } from "./ProcessOverlay";
import styles from "./chrome.module.css";

function ShellTopNav({ surface, lang, makerId }: { surface: FrameSurface; lang: "en" | "zh"; makerId?: string }) {
  // A maker page names its maker in the center of the top bar (design/changes.md, shell).
  const maker = surface === "maker" ? makerName(makerId) : undefined;
  return (
    <TopNav
      testId="shell-topnav"
      lang={lang}
      center={maker ? `${maker[lang]} · ${SHELL.maker[lang]}` : undefined}
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
          {surface === "studio" && (
            <Button variant="quiet" size="small" onClick={() => openDrawer("ask")}>
              {SHELL.askCindy[lang]}
            </Button>
          )}
          <Button variant="quiet" size="small" testId="shell-help" onClick={() => openDrawer("support")}>
            {SHELL.help[lang]}
          </Button>
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
      <ShellTopNav surface={ctx.surface} lang={ctx.lang} makerId={ctx.makerId} />
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
