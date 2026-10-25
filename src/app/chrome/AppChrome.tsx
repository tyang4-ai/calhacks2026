// The chrome every surface wears inside its PageFrame: the top bar (shell-topnav) with the word
// Cindia, the Shop and Sell switch, L1, Help, Ask Cindy on Sell views and the language toggle;
// the 64 px process bar band holding process.bar; then the page body with the page, the process
// overlay and the one drawer. The buttons call src/core/nav.ts, so they act the same on a route and
// on /demo, where the stage's navigator takes the calls.
import type { ReactNode } from "react";
import type { DrawerKind } from "../../core/events";
import { navigate, openDrawer, sellRoute, shopRoute } from "../../core/nav";
import { cycleLang, useCindia } from "../../core/store";
import { Button } from "../../ui/Button";
import { LangToggle } from "../../ui/LangToggle";
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
  const setting = useCindia((s) => s.lang);
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
          <LangToggle value={setting} resolved={lang} onToggle={() => cycleLang()} />
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
  children?: ReactNode;
}

export function AppChrome({ frameTestId, ctx, drawer, onCloseDrawer, children }: AppChromeProps) {
  return (
    <PageFrame testId={frameTestId} lang={ctx.lang}>
      <ShellTopNav surface={ctx.surface} lang={ctx.lang} />
      <div className={styles.band}>
        <SlotFor slot="process.bar" ctx={ctx} />
      </div>
      <div className={styles.body}>
        {children}
        {ctx.processId && <ProcessOverlay ctx={ctx} />}
        <Drawers ctx={ctx} drawer={drawer} onClose={onCloseDrawer} />
      </div>
    </PageFrame>
  );
}
