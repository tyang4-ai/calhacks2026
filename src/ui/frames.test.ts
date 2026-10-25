import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PROCESS_IDS, type ProcessStatus } from "../core/events";
import { navigate, registerNavigator, type CindiaNavigator } from "../core/nav";
import { Drawer } from "./Drawer";
import {
  countShown,
  drawerOffset,
  DRAWER_WIDTH,
  followLink,
  isDrawerCloseKey,
  isPlainClick,
  liveMarkShown,
  PROCESS_STATUS_LOOK,
  processBlockClass,
  PULSE_MS,
  pulseLevel,
} from "./frames";
import { Link } from "./Link";
import { UI_MS } from "./motion";
import { PAGE_HEIGHT, PAGE_WIDTH, PageFrame } from "./PageFrame";
import { ProcessBlock } from "./ProcessBlock";
import { SideSwitch } from "./SideSwitch";
import { STATUS_WORDS } from "./strings";
import { Tabs } from "./Tabs";
import { TopNav } from "./TopNav";

const STATUSES: ProcessStatus[] = ["idle", "working", "done", "attention"];

describe("page sizes", () => {
  it("is the 1440 by 900 desktop page", () => {
    expect(PAGE_WIDTH).toBe(1440);
    expect(PAGE_HEIGHT).toBe(900);
    expect(DRAWER_WIDTH).toBe(440);
  });
  it("puts the frame's test ID and size on its root", () => {
    const html = renderToStaticMarkup(createElement(PageFrame, { testId: "frame-buyer", lang: "en" }, "x"));
    expect(html).toMatch(/^<div class="c-page" data-testid="frame-buyer" lang="en" style="width:1440px;height:900px">x<\/div>$/);
  });
  it("puts the top bar's test ID on its root, with its three parts", () => {
    const html = renderToStaticMarkup(createElement(TopNav, { testId: "shell-topnav", left: "L", center: "C", right: "R" }));
    expect(html).toContain('data-testid="shell-topnav"');
    expect(html.indexOf(">L<")).toBeLessThan(html.indexOf(">C<"));
    expect(html.indexOf(">C<")).toBeLessThan(html.indexOf(">R<"));
  });
});

describe("process block status looks", () => {
  it("gives every status its own icon and tone, so color never carries it alone", () => {
    const icons = new Set(STATUSES.map((s) => PROCESS_STATUS_LOOK[s].icon));
    const tones = new Set(STATUSES.map((s) => PROCESS_STATUS_LOOK[s].tone));
    const threads = new Set(STATUSES.map((s) => PROCESS_STATUS_LOOK[s].thread));
    expect(icons.size).toBe(4);
    expect(tones.size).toBe(4);
    expect(threads.size).toBe(4);
    for (const s of STATUSES) {
      expect(STATUS_WORDS[s].en.length).toBeGreaterThan(0);
      expect(STATUS_WORDS[s].zh.length).toBeGreaterThan(0);
    }
  });
  it("pulses only while working", () => {
    expect(STATUSES.filter((s) => PROCESS_STATUS_LOOK[s].pulses)).toEqual(["working"]);
  });
  it("builds the class list from the status and selection", () => {
    expect(processBlockClass("attention")).toBe("c-pblock c-pblock--attention c-pblock--tone-seal");
    expect(processBlockClass("done", true)).toBe("c-pblock c-pblock--done c-pblock--tone-jade c-pblock--selected");
  });
  it("shows the Live mark only when live, and a count only when there is one", () => {
    expect(liveMarkShown(true)).toBe(true);
    expect(liveMarkShown(false)).toBe(false);
    expect(countShown(0)).toBe(true);
    expect(countShown("3")).toBe(true);
    expect(countShown(undefined)).toBe(false);
    expect(countShown("")).toBe(false);
  });
});

describe("process block pulse on the player clock", () => {
  it("is the same frame for the same player time", () => {
    expect(pulseLevel(345)).toBe(pulseLevel(345));
    expect(pulseLevel(345)).toBeCloseTo(pulseLevel(345 + PULSE_MS), 10);
  });
  it("moves while the clock moves, between 0.35 and 1", () => {
    expect(pulseLevel(0)).toBeCloseTo(1, 10);
    expect(pulseLevel(PULSE_MS / 2)).toBeCloseTo(0.35, 10);
    for (let t = 0; t < 3 * PULSE_MS; t += 37) {
      expect(pulseLevel(t)).toBeGreaterThanOrEqual(0.35 - 1e-9);
      expect(pulseLevel(t)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
  it("holds still under reduced motion", () => {
    for (const t of [0, 300, 600, 900, 5000]) expect(pulseLevel(t, true)).toBe(1);
  });
});

describe("process block markup", () => {
  const ids = {
    statusTestId: "process-block-status-reconcile",
    countTestId: "process-block-count-reconcile",
    liveTestId: "process-block-live-reconcile",
  };
  const label = { en: "Reconcile", zh: "对账" };

  it("shows no Live mark and no Simulated badge when not live", () => {
    const html = renderToStaticMarkup(
      createElement(ProcessBlock, { testId: "process-block-reconcile", label, lang: "en", status: "attention", count: 2, live: false, ...ids }),
    );
    expect(html).toContain('data-testid="process-block-reconcile"');
    expect(html).not.toContain(ids.liveTestId);
    expect(html).not.toContain("simulated-badge");
    expect(html).not.toContain("Simulated");
  });
  it("shows the Live mark inside liveTestId when live", () => {
    const html = renderToStaticMarkup(createElement(ProcessBlock, { label, lang: "en", status: "done", live: true, ...ids }));
    expect(html).toMatch(/data-testid="process-block-live-reconcile"[^>]*>.*Live<\/span><\/span>/);
    expect(html).not.toContain("simulated-badge");
  });
  it("puts the status icon and word inside statusTestId, and the count inside countTestId", () => {
    for (const lang of ["en", "zh"] as const) {
      const html = renderToStaticMarkup(createElement(ProcessBlock, { label, lang, status: "attention", count: 2, live: false, ...ids }));
      const status = html.indexOf(`data-testid="${ids.statusTestId}"`);
      const count = html.indexOf(`data-testid="${ids.countTestId}"`);
      const between = html.slice(status, count);
      expect(status).toBeGreaterThan(-1);
      expect(between).toContain("<svg");
      expect(between).toContain(`>${STATUS_WORDS.attention[lang]}<`);
      expect(html).toContain(`data-testid="${ids.countTestId}">2</span>`);
      expect(html).toContain(`>${label[lang]}<`);
    }
  });
  it("renders a working block, and no count element without a count", () => {
    const html = renderToStaticMarkup(createElement(ProcessBlock, { label, lang: "en", status: "working", live: false, ...ids }));
    expect(html).toContain('data-status="working"');
    expect(html).toContain(">Working<");
    expect(html).not.toContain(ids.countTestId);
  });
  it("renders every process with its own test IDs", () => {
    for (const id of PROCESS_IDS) {
      const html = renderToStaticMarkup(
        createElement(ProcessBlock, {
          testId: `process-block-${id}`,
          label,
          lang: "en",
          status: "idle",
          count: 0,
          live: true,
          statusTestId: `process-block-status-${id}`,
          countTestId: `process-block-count-${id}`,
          liveTestId: `process-block-live-${id}`,
        }),
      );
      for (const part of ["process-block-", "process-block-status-", "process-block-count-", "process-block-live-"]) {
        expect(html).toContain(`data-testid="${part}${id}"`);
      }
    }
  });
});

describe("drawer", () => {
  it("closes on Esc only", () => {
    expect(isDrawerCloseKey({ key: "Escape" })).toBe(true);
    expect(isDrawerCloseKey({ key: "Escape", defaultPrevented: false, isComposing: false })).toBe(true);
    for (const key of ["Enter", " ", "Esc", "e", "Tab", "ArrowRight"]) expect(isDrawerCloseKey({ key })).toBe(false);
  });
  it("leaves an Esc that something inside already handled, or one an input method is composing", () => {
    expect(isDrawerCloseKey({ key: "Escape", defaultPrevented: true })).toBe(false);
    expect(isDrawerCloseKey({ key: "Escape", isComposing: true })).toBe(false);
  });
  it("slides in over UI_MS on the player clock while playing, and is at rest otherwise", () => {
    expect(drawerOffset(1000, 1000, 440, true)).toBe(440);
    expect(drawerOffset(1000 + UI_MS / 2, 1000, 440, true)).toBeGreaterThan(0);
    expect(drawerOffset(1000 + UI_MS / 2, 1000, 440, true)).toBeLessThan(440);
    expect(drawerOffset(1000 + UI_MS, 1000, 440, true)).toBe(0);
    expect(drawerOffset(9000, 1000, 440, true)).toBe(0);
    expect(drawerOffset(1000, 1000, 440, false)).toBe(0);
    expect(drawerOffset(1000, 1000, 440, true, true)).toBe(0);
    expect(drawerOffset(500, 1000, 440, true)).toBe(0);
  });
  it("renders nothing while closed, and its title and close button while open", () => {
    const props = { testId: "support-drawer", onClose: () => {}, title: { en: "Help", zh: "客服" }, lang: "en" as const };
    expect(renderToStaticMarkup(createElement(Drawer, { ...props, open: false }))).toBe("");
    const html = renderToStaticMarkup(createElement(Drawer, { ...props, open: true, closeTestId: "x-close" }, "body"));
    expect(html).toContain('data-testid="support-drawer"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain("width:440px");
    expect(html).toContain(">Help<");
    expect(html).toContain('data-testid="x-close"');
    expect(html).toContain(">Close<");
    expect(html).toContain(">body<");
    const zh = renderToStaticMarkup(createElement(Drawer, { ...props, lang: "zh", open: true }));
    expect(zh).toContain(">客服<");
    expect(zh).toContain(">关闭<");
  });
});

type ClickOver = Partial<{ button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean }>;

function click(over: ClickOver = {}) {
  return { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, preventDefault: vi.fn(), ...over };
}

function spyNavigator() {
  const nav = { navigate: vi.fn<(path: string) => void>(), setProcess: vi.fn(), openDrawer: vi.fn() };
  return nav satisfies CindiaNavigator;
}

describe("link plain-click rule", () => {
  let unregister: (() => void) | null = null;
  afterEach(() => {
    unregister?.();
    unregister = null;
  });


  it("calls navigate once on a plain click and stops the page load", () => {
    const nav = spyNavigator();
    unregister = registerNavigator(nav);
    const e = click();
    expect(isPlainClick(e)).toBe(true);
    expect(followLink(e, "/sell/month", navigate)).toBe(true);
    expect(nav.navigate).toHaveBeenCalledTimes(1);
    expect(nav.navigate).toHaveBeenCalledWith("/sell/month");
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
  });
  it("keeps the browser's own behavior with a modifier key or another button", () => {
    const nav = spyNavigator();
    unregister = registerNavigator(nav);
    const others = [click({ ctrlKey: true }), click({ metaKey: true }), click({ shiftKey: true }), click({ altKey: true }), click({ button: 1 }), click({ button: 2 }), click({ defaultPrevented: true })];
    for (const e of others) {
      expect(isPlainClick(e)).toBe(false);
      expect(followLink(e, "/sell/month", navigate)).toBe(false);
      expect(e.preventDefault).not.toHaveBeenCalled();
    }
    expect(nav.navigate).not.toHaveBeenCalled();
  });
  it("never throws with no navigator registered", () => {
    expect(() => followLink(click(), "/shop", navigate)).not.toThrow();
  });
  it("renders a real anchor to the path", () => {
    const html = renderToStaticMarkup(createElement(Link, { to: "/sell/month", testId: "x-link" }, "Month"));
    expect(html).toBe('<a href="/sell/month" data-testid="x-link" class="c-link c-link--text">Month</a>');
  });
});

describe("switch and tabs", () => {
  it("marks the selected side and carries each side's test ID", () => {
    const html = renderToStaticMarkup(
      createElement(SideSwitch, {
        value: "sell",
        onChange: () => {},
        labels: { shop: { en: "Shop", zh: "选购" }, sell: { en: "Sell", zh: "售卖" } },
        testIds: { shop: "shell-side-shop", sell: "shell-side-sell" },
        lang: "en",
      }),
    );
    expect(html).toMatch(/data-testid="shell-side-shop" aria-pressed="false"[^>]*>Shop</);
    expect(html).toMatch(/c-sideswitch__opt--on" data-testid="shell-side-sell" aria-pressed="true"[^>]*>Sell</);
  });
  it("marks the selected tab and gives each tab its test ID when asked", () => {
    const html = renderToStaticMarkup(
      createElement(Tabs, {
        testId: "x-tabs",
        tabs: [
          { id: "a", label: { en: "One", zh: "一" } },
          { id: "b", label: { en: "Two", zh: "二" } },
        ],
        value: "b",
        onChange: () => {},
        lang: "zh",
        tabTestIdPrefix: "x-tab-",
      }),
    );
    expect(html).toContain('data-testid="x-tabs"');
    expect(html).toMatch(/aria-selected="false"[^>]*data-testid="x-tab-a"[^>]*>一</);
    expect(html).toMatch(/aria-selected="true"[^>]*data-testid="x-tab-b"[^>]*>二</);
  });
});
