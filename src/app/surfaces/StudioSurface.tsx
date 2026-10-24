// The studio console: top bar, view rail, view area and two drawers. It takes its view and drawer
// as props, so the /demo stage sets the view from the camera without editing this file.
import { useEffect } from "react";
import { STUDIO_VIEWS, type SlotId, type StudioView } from "../../core/featureTypes";
import { VIEW_SLOTS, type DrawerId } from "./views";
import { cycleLang, useCindia } from "../../core/store";
import { Button } from "../../ui/Button";
import { ConsoleFrame } from "../../ui/ConsoleFrame";
import { LangToggle } from "../../ui/LangToggle";
import { useSurfaceLang } from "../lang";
import { Slot } from "../Slot";
import { SHELL, VIEW_LABELS } from "../strings";
import { studioName } from "../studioInfo";

export interface StudioSurfaceProps {
  view: StudioView;
  drawer?: DrawerId | null;
  /** The audit drawer's entity ID, passed to its slot as SlotProps.refId. */
  refId?: string;
  onViewChange?: (view: StudioView) => void;
  onOpenDrawer?: (drawer: DrawerId) => void;
  onCloseDrawer?: () => void;
  lang?: "en" | "zh";
}

const TOP_BAR = 56;
const RAIL = 88;
const DRAWER = 400;

function TopBar({ lang, onAsk }: { lang: "en" | "zh"; onAsk?: () => void }) {
  const name = studioName();
  const langSetting = useCindia((s) => s.lang);
  const latest = useCindia((s) => (s.agent.latestActId ? s.agent.acts[s.agent.latestActId]?.text ?? null : null));
  return (
    <header
      style={{
        height: TOP_BAR,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "var(--c-space-16)",
        padding: "0 var(--c-space-16)",
        borderBottom: "1px solid var(--c-color-line)",
        background: "var(--c-color-paper)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--c-space-8)", flexShrink: 0 }}>
        <span lang="zh" style={{ fontFamily: "var(--c-font-heading-zh)", fontWeight: 700, fontSize: "var(--c-text-18)" }}>
          {name.zh}
        </span>
        <span lang="en" style={{ fontFamily: "var(--c-font-heading-en)", fontWeight: 600, fontSize: "var(--c-text-18)" }}>
          {name.en}
        </span>
      </div>
      <div
        aria-live="polite"
        title={latest ? latest[lang] : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          color: latest ? "var(--c-color-ink)" : "var(--c-color-ink-soft)",
          fontSize: "var(--c-text-14)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <strong style={{ fontWeight: 600 }}>Cindy</strong> · {latest ? latest[lang] : SHELL.cindyIdle[lang]}
      </div>
      <Button variant="quiet" size="small" onClick={onAsk}>
        {SHELL.askCindy[lang]}
      </Button>
      <LangToggle value={langSetting} resolved={lang} onToggle={() => cycleLang()} />
    </header>
  );
}

function ViewRail({ view, lang, onViewChange }: { view: StudioView; lang: "en" | "zh"; onViewChange?: (v: StudioView) => void }) {
  return (
    <nav
      aria-label={SHELL.views[lang]}
      style={{
        width: RAIL,
        flexShrink: 0,
        borderRight: "1px solid var(--c-color-line)",
        display: "flex",
        flexDirection: "column",
        padding: "var(--c-space-8) 0",
        gap: "var(--c-space-4)",
        background: "var(--c-color-paper)",
      }}
    >
      {STUDIO_VIEWS.map((v) => {
        const on = v === view;
        return (
          <button
            key={v}
            type="button"
            aria-current={on ? "page" : undefined}
            data-view={v}
            onClick={() => onViewChange?.(v)}
            style={{
              font: "inherit",
              fontSize: "var(--c-text-14)",
              fontWeight: on ? 600 : 500,
              border: "none",
              borderLeft: `3px solid ${on ? "var(--c-color-ink)" : "transparent"}`,
              background: on ? "var(--c-color-mat)" : "transparent",
              color: "var(--c-color-ink)",
              padding: "var(--c-space-12) var(--c-space-8)",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            {VIEW_LABELS[v][lang]}
          </button>
        );
      })}
    </nav>
  );
}

function Drawer({ drawer, refId, lang, onClose }: { drawer: DrawerId; refId?: string; lang: "en" | "zh"; onClose?: () => void }) {
  const slot: SlotId = drawer === "ask" ? "studio.drawer.ask" : "studio.drawer.audit";
  return (
    <aside
      role="dialog"
      aria-label={drawer === "ask" ? SHELL.askCindy[lang] : undefined}
      data-drawer={drawer}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: DRAWER,
        background: "var(--c-color-paper)",
        borderLeft: "1px solid var(--c-color-line)",
        display: "flex",
        flexDirection: "column",
        zIndex: 4,
        animation: "c-drawer-in var(--c-motion-ui) ease-out",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "var(--c-space-8)" }}>
        <Button variant="quiet" size="small" onClick={onClose} aria-label={SHELL.close[lang]}>
          {SHELL.close[lang]} ✕
        </Button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <Slot slot={slot} surface="studio" lang={lang} refId={drawer === "audit" ? refId : undefined} />
      </div>
    </aside>
  );
}

export function StudioSurface({ view, drawer, refId, onViewChange, onOpenDrawer, onCloseDrawer, lang }: StudioSurfaceProps) {
  const resolved = useSurfaceLang("studio");
  const l = lang ?? resolved;
  const layout = VIEW_SLOTS[view];

  // Esc closes the open drawer.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseDrawer?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, onCloseDrawer]);

  return (
    <ConsoleFrame testId="frame-studio" lang={l}>
      <style>{"@keyframes c-drawer-in { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }"}</style>
      <TopBar lang={l} onAsk={() => onOpenDrawer?.("ask")} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>
        <ViewRail view={view} lang={l} onViewChange={onViewChange} />
        <main
          data-view={view}
          style={{
            flex: 1,
            minWidth: 0,
            display: "grid",
            gridTemplateColumns: layout.side ? "2fr 1fr" : "1fr",
            gap: "var(--c-space-16)",
            padding: "var(--c-space-16)",
            overflow: "auto",
          }}
        >
          <div style={{ minWidth: 0, minHeight: 0 }}>
            <Slot slot={layout.main} surface="studio" lang={l} />
          </div>
          {layout.side && (
            <div style={{ minWidth: 0, minHeight: 0 }}>
              <Slot slot={layout.side} surface="studio" lang={l} />
            </div>
          )}
        </main>
        {drawer && <Drawer drawer={drawer} refId={refId} lang={l} onClose={onCloseDrawer} />}
      </div>
    </ConsoleFrame>
  );
}
