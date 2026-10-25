// The demo harness: opens /demo, plays the tour at 1x on the production build and checks every beat
// against tests/demo/beats.ts. Each beat's camera shows one frame (none for pitch), at full size,
// 1.35 for sell-catch, or 0.66 in the left two thirds under a process, with the process panel in
// the right third. Every test ID is looked up in its scope: inside the shown frame, never the first
// match in the document (all four frames stay mounted), inside the process panel for the process
// feature's IDs, or on the stage for the pitch cards. A recorder inside the page notes when each
// beat's first beat.started lands (its own `at`, the player clock and wall time) and which On
// screen test IDs showed during each beat. 300 ms before each beat ends the harness reads the
// screen in one go and saves artifacts/demo/<beat>.png. A beat fails when one of its On screen IDs
// or figures is rendered but scrolled, clipped or covered out of its frame's visible area at that
// moment. Figures that depend on the data come from the loaded timeline. demo.spec.ts and
// offline.spec.ts both run it.
import fs from "node:fs";
import path from "node:path";
import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { pieces } from "../../src/mock/catalog";
import { waitForHooks, waitForSlots } from "../smoke/lib";
import {
  ALLOWED_EMPTY_FALLBACKS,
  BEATS,
  FRAME_IDS,
  NATIVE_WIDTH,
  REQUIRED_KEYS,
  REQUIRED_SERVICES,
  SHOWN_MATCH_KINDS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  cameraFrames,
  cameraView,
  cutFeatures,
  cutMigrationSlugs,
  shownFrame,
  type Beat,
  type Figure,
  type FrameId,
} from "./beats";

export const ARTIFACTS_DEMO = path.join(process.env.CINDIA_ROOT ?? process.cwd(), "artifacts", "demo");

/** Live mode for G5, set by the gate through CINDIA_DEMO_MODE=live. */
export const DEMO_MODE: "scripted" | "live" = process.env.CINDIA_DEMO_MODE === "live" ? "live" : "scripted";

/** The upgrade under test in G5 (a source key like b01-match), set by the gate through CINDIA_DEMO_UPGRADE. */
export const DEMO_UPGRADE: string | null = process.env.CINDIA_DEMO_UPGRADE?.trim() || null;

/** How far a beat.started may land from its time in demo-script.md on the player clock, in ms. */
export const BEAT_TOLERANCE_MS = 100;

/**
 * How far a beat.started may land from its time in real time, in ms. Wider than the player clock's,
 * because the cloud VM runs other agents' checks at the same time (B1-27, logged in decisions.md).
 */
export const BEAT_WALL_TOLERANCE_MS = 250;

/** The run must end within the played timeline's own durationMs plus this, in real time (fix-plan 1.9). */
export const END_ALLOWANCE_MS = 500;

/**
 * The longest openStage waits in live mode for the adapters that can turn healthy (router loaded
 * and its key present) to report healthy. The wait ends as soon as they all do.
 */
const HEALTH_WAIT_MS = 15000;

/** Live-mode source health at the start of a run, as openStage found it. */
export interface SourceHealthAtStart {
  /** Upgrade prefixes /api/health listed, like "b01". */
  routers: string[];
  /** Source keys with an adapter file in src/sources/live/. */
  adapters: string[];
  /** /api/health's `keys`: which server keys are set. Null when the server didn't say. */
  keys: Record<string, boolean> | null;
  /** /api/health's `services`: whether SpacetimeDB answers and the trained model is on disk. Null when the server didn't say. */
  services: Record<string, boolean> | null;
  /** Adapters whose router is loaded but whose key (REQUIRED_KEYS in beats.ts) is missing: not waited for. */
  noKey: string[];
  /** Adapters whose router is loaded but whose service (REQUIRED_SERVICES in beats.ts) is down: not waited for. */
  noService: string[];
  /** Adapters whose router is loaded and whose key and service, if any, are there: these should turn healthy. */
  expected: string[];
  /** Keys whose demo-mode-toggle dot showed healthy when the run started (the registry's own health()). */
  healthy: string[];
}

const healthAtStart = new WeakMap<Page, SourceHealthAtStart>();

/** Source keys with a live adapter file, from the file names src/sources/live/bNN-<slug>.ts. */
function liveAdapterKeys(): string[] {
  const dir = path.join(process.env.CINDIA_ROOT ?? process.cwd(), "src", "sources", "live");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^b\d\d-[a-z0-9-]+\.ts$/.test(f) && !f.endsWith(".test.ts"))
    .map((f) => f.slice(0, -3));
}

/** Reads the registry's health from the mode toggle's dots, one per source key. */
async function healthyDots(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="demo-mode-toggle"] [data-source-key][data-healthy="true"]')].map((d) => d.getAttribute("data-source-key")!),
  );
}

/**
 * In live mode: asks /api/health which routers are loaded, which keys are set and which services
 * are up, waits until each adapter with a loaded router, its key (REQUIRED_KEYS) and its service
 * (REQUIRED_SERVICES) reports healthy, and keeps what it found for playDemo. Adapters missing their
 * key or service are skipped. G5's upgrade must have its key and service and be healthy.
 */
async function captureSourceHealth(page: Page): Promise<SourceHealthAtStart> {
  const { routers, keys, services } = await page.evaluate(async () => {
    const flags = (v: unknown) =>
      v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, x === true])) : null;
    try {
      const r = await fetch("/api/health");
      if (!r.ok) return { routers: [] as string[], keys: null, services: null };
      const body = (await r.json()) as { routers?: unknown; keys?: unknown; services?: unknown };
      const listed = Array.isArray(body.routers) ? body.routers.filter((x): x is string => typeof x === "string") : [];
      return { routers: listed, keys: flags(body.keys), services: flags(body.services) };
    } catch {
      return { routers: [] as string[], keys: null, services: null };
    }
  });
  const adapters = liveAdapterKeys();
  const loaded = adapters.filter((k) => routers.includes(k.slice(0, 3)));
  // When /api/health doesn't report keys or services, assume they're there and wait as before.
  const hasKey = (k: string) => {
    const need = REQUIRED_KEYS[k];
    return !need || keys === null || keys[need] === true;
  };
  const hasService = (k: string) => {
    const need = REQUIRED_SERVICES[k];
    return !need || services === null || services[need] === true;
  };
  const noKey = loaded.filter((k) => !hasKey(k));
  const noService = loaded.filter((k) => hasKey(k) && !hasService(k));
  const expected = loaded.filter((k) => hasKey(k) && hasService(k));
  if (DEMO_UPGRADE) {
    expect(adapters, `G5 upgrade ${DEMO_UPGRADE}: an adapter file src/sources/live/${DEMO_UPGRADE}.ts`).toContain(DEMO_UPGRADE);
    expect(routers, `G5 upgrade ${DEMO_UPGRADE}: /api/health lists its router`).toContain(DEMO_UPGRADE.slice(0, 3));
    expect(noKey, `G5 upgrade ${DEMO_UPGRADE}: /api/health reports the ${REQUIRED_KEYS[DEMO_UPGRADE] ?? ""} key it needs`).not.toContain(DEMO_UPGRADE);
    expect(noService, `G5 upgrade ${DEMO_UPGRADE}: /api/health reports the ${REQUIRED_SERVICES[DEMO_UPGRADE] ?? ""} service it needs is down`).not.toContain(DEMO_UPGRADE);
  }
  // Ends as soon as every adapter that can turn healthy has.
  await expect
    .poll(async () => {
      const h = await healthyDots(page);
      return expected.every((k) => h.includes(k));
    }, { timeout: HEALTH_WAIT_MS, intervals: [100] })
    .toBe(true)
    .catch(() => undefined);
  const healthy = await healthyDots(page);
  const found: SourceHealthAtStart = { routers, adapters, keys, services, noKey, noService, expected, healthy };
  healthAtStart.set(page, found);
  if (DEMO_UPGRADE) {
    expect(healthy, `G5 upgrade ${DEMO_UPGRADE}: its adapter's health() is true at the start of the run`).toContain(DEMO_UPGRADE);
  }
  return found;
}

export async function screenshot(page: Page, name: string, dir = ARTIFACTS_DEMO) {
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
}

/** Opens /demo and checks the stage, frames and controls. Switches to live mode when the gate asks. */
export async function openStage(page: Page, url = "/demo") {
  await page.goto(url);
  await waitForHooks(page);
  await expect(page.getByTestId("demo-stage")).toBeVisible();
  for (const f of FRAME_IDS) await expect(page.getByTestId(f)).toBeAttached();
  // The stage and the four frames are the 1440 by 900 desktop page, in their own (unscaled) pixels.
  const sizes = await page.evaluate((ids) => {
    const size = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      return el ? [el.offsetWidth, el.offsetHeight] : null;
    };
    return Object.fromEntries(["demo-stage", ...ids].map((id) => [id, size(`[data-testid="${id}"]`)]));
  }, FRAME_IDS);
  for (const [id, wh] of Object.entries(sizes)) expect(wh, `${id} is ${STAGE_WIDTH} by ${STAGE_HEIGHT}`).toEqual([STAGE_WIDTH, STAGE_HEIGHT]);
  await waitForSlots(page);
  if (!url.includes("video=1")) {
    await expect(page.getByTestId("demo-controls")).toBeVisible();
    if (DEMO_MODE === "live") {
      await page.getByTestId("demo-mode-toggle").click();
      await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Live/);
      await captureSourceHealth(page);
    }
  }
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

/** A tour test's timeout: the page's own durationMs plus 90 seconds, since the config's 150 seconds is shorter than the tour. */
export async function tourTimeout(page: Page): Promise<number> {
  const d = await page.evaluate(() => window.__cindia!.player.durationMs());
  return d + 90_000;
}

/** Where a test ID is looked up: the frame the beat shows, the stage's process panel, or the stage. */
type Scope = "frame" | "panel" | "stage";

interface Lookup {
  id: string;
  scope: Scope;
}

interface ElementShot {
  present: boolean;
  visible: boolean;
  /** Some of it survives its frame and every clipping ancestor: not scrolled out, clipped or off the stage. */
  onFrame: boolean;
  /** What covers most of its visible part (a test ID or a tag name), or null. */
  covered: string | null;
  text: string;
}

interface FigureShot {
  /** The element holds the text somewhere. */
  found: boolean;
  /** At least one place holding the text is on its frame and not covered. */
  inView: boolean;
}

interface FrameShot {
  opacity: number;
  scale: number;
  inStage: boolean;
  /** Its box in stage pixels. */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface PanelShot {
  /** The process.view slot outside every frame, on the stage. */
  present: boolean;
  /** Its box in stage pixels, and its opacity. */
  left: number;
  right: number;
  top: number;
  bottom: number;
  opacity: number;
}

interface PitchShot {
  id: string;
  opacity: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface ScreenShot {
  clock: number;
  beatId: string | null;
  camera: string | null;
  process: string | null;
  drawer: string | null;
  stageCamera: string | null;
  studioView: string | null;
  frames: Record<string, FrameShot>;
  panel: PanelShot;
  pitch: PitchShot[];
  ids: Record<string, ElementShot>;
  figures: FigureShot[];
  balanceCents: number | null;
}

/**
 * Reads the screen in one evaluate: each frame's opacity, scale and place, the process panel and
 * the pitch cards, each test ID's state and where each figure's text sits. Test IDs and figures are
 * looked up in their scope: inside the shown frame (`frameId`), never the first match in the
 * document since all four frames stay mounted; inside the stage's process panel (the process.view
 * slot outside every frame); or on the stage (the pitch cards). An element is on its frame when part
 * of it survives every clipping ancestor (scroll areas, the frame, the panel, the stage and the
 * window). It is covered when most sample points of that visible part hit another element, or the
 * beat label sits on it.
 */
async function readScreen(page: Page, frameId: FrameId | null, lookups: Lookup[], figures: (Figure & { scope: Scope })[]): Promise<ScreenShot> {
  return page.evaluate(
    ({ ids, figs, frameIds, nativeWidth, shownId, stageWidth }) => {
      const stage = document.querySelector('[data-testid="demo-stage"]') as HTMLElement;
      const sr = stage.getBoundingClientRect();
      const k = sr.width / stageWidth;
      const inFrame = (el: Element) => el.closest('[data-testid^="frame-"]') !== null;
      const panelSlot = [...stage.querySelectorAll('[data-slot="process.view"]')].find((el) => !inFrame(el)) ?? null;
      const frameRoot = shownId ? stage.querySelector(`[data-testid="${shownId}"]`) : null;
      const scopeRoot = (s: string): ParentNode | null => (s === "panel" ? panelSlot : s === "stage" ? stage : (frameRoot ?? stage));
      const opacityOf = (el: Element) => {
        let o = 1;
        for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.visibility === "hidden" || cs.display === "none") return 0;
          o *= Number(cs.opacity);
        }
        return o;
      };
      type Box = { left: number; top: number; right: number; bottom: number };
      const meet = (a: Box, b: Box): Box => ({
        left: Math.max(a.left, b.left),
        top: Math.max(a.top, b.top),
        right: Math.min(a.right, b.right),
        bottom: Math.min(a.bottom, b.bottom),
      });
      const real = (b: Box) => b.right - b.left > 1 && b.bottom - b.top > 1;
      const area = (b: Box) => (real(b) ? (b.right - b.left) * (b.bottom - b.top) : 0);
      const stageBox = (r: DOMRect) => ({ left: (r.left - sr.left) / k, right: (r.right - sr.left) / k, top: (r.top - sr.top) / k, bottom: (r.bottom - sr.top) / k });
      /** The part of el's box inside its frame, every clipping ancestor, the stage and the window. */
      const shownPart = (el: Element): Box => {
        const frame = el.closest('[data-testid^="frame-"]');
        let b: Box = meet(el.getBoundingClientRect(), frame ? frame.getBoundingClientRect() : sr);
        b = meet(meet(b, sr), { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight });
        for (let e: Element | null = el.parentElement; e && e !== document.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.overflowX !== "visible" || cs.overflowY !== "visible") b = meet(b, e.getBoundingClientRect());
        }
        return b;
      };
      const label = document.querySelector('[data-testid="demo-beat-label"]');
      const labelBox = label && opacityOf(label) > 0.05 ? label.getBoundingClientRect() : null;
      /**
       * What covers most of a visible box, or null. SVG shapes are thin, so only the beat label counts
       * for them. Anything inside `holder` (the test ID a figure belongs to) doesn't cover it: a card's
       * own transparent click target over its text, such as the kit PieceCard's action button.
       */
      const coverOf = (el: Element, b: Box, holder: Element = el): string | null => {
        if (labelBox && area(meet(b, labelBox)) > 0.25 * area(b)) return "demo-beat-label";
        if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) return null;
        const hits: Record<string, number> = {};
        let blocked = 0;
        for (const fx of [0.2, 0.5, 0.8])
          for (const fy of [0.2, 0.5, 0.8]) {
            const hit = document.elementFromPoint(b.left + (b.right - b.left) * fx, b.top + (b.bottom - b.top) * fy);
            if (!hit || el.contains(hit) || hit.contains(el) || holder.contains(hit)) continue;
            blocked++;
            const owner = hit.closest("[data-testid]");
            const name = owner ? owner.getAttribute("data-testid")! : hit.tagName.toLowerCase();
            hits[name] = (hits[name] ?? 0) + 1;
          }
        if (blocked < 5) return null;
        return Object.entries(hits).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      };
      const frames: Record<string, FrameShot> = {};
      for (const f of frameIds) {
        const el = document.querySelector(`[data-testid="${f}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        frames[f] = {
          opacity: opacityOf(el),
          scale: r.width / k / nativeWidth[f],
          inStage: r.left >= sr.left - 2 && r.right <= sr.right + 2 && r.top >= sr.top - 2 && r.bottom <= sr.bottom + 2,
          ...stageBox(r),
        };
      }
      const panelRect = panelSlot ? stageBox(panelSlot.getBoundingClientRect()) : { left: 0, right: 0, top: 0, bottom: 0 };
      const panel = { present: panelSlot !== null, ...panelRect, opacity: panelSlot ? opacityOf(panelSlot) : 0 };
      const pitch = [...stage.querySelectorAll('[data-testid^="pitch-card-"]')].map((el) => ({
        id: el.getAttribute("data-testid")!,
        opacity: opacityOf(el),
        ...stageBox(el.getBoundingClientRect()),
      }));
      const out: Record<string, ElementShot> = {};
      for (const { id, scope } of ids) {
        const root = scopeRoot(scope);
        const el = root?.querySelector(`[data-testid="${id}"]`) ?? null;
        if (!el) {
          out[id] = { present: false, visible: false, onFrame: false, covered: null, text: "" };
          continue;
        }
        const r = el.getBoundingClientRect();
        const visible = r.width > 0 && r.height > 0 && opacityOf(el) > 0.05;
        const shown = shownPart(el);
        const onFrame = visible && real(shown);
        out[id] = { present: true, visible, onFrame, covered: onFrame ? coverOf(el, shown) : null, text: (el.textContent ?? "").replace(/\s+/g, " ") };
      }
      const norm = (t: string | null) => (t ?? "").replace(/\s+/g, " ");
      const figShots = figs.map(({ testId, text, scope }) => {
        const root = scopeRoot(scope)?.querySelector(`[data-testid="${testId}"]`);
        if (!root || !norm(root.textContent).includes(text)) return { found: false, inView: false };
        // The smallest elements holding the text: none of their children holds it alone.
        const holders: Element[] = [];
        const walk = (e: Element) => {
          const inner = [...e.children].filter((c) => norm(c.textContent).includes(text));
          if (inner.length === 0) holders.push(e);
          else inner.forEach(walk);
        };
        walk(root);
        const inView = holders.some((h) => {
          if (opacityOf(h) <= 0.05) return false;
          const shown = shownPart(h);
          return real(shown) && coverOf(h, shown, root) === null;
        });
        return { found: true, inView };
      });
      const s = window.__cindia!.store.getState() as unknown as {
        demo: { beatId: string | null; camera: string | null; process: string | null; drawer: string | null };
        money: { accounts: Record<string, { balanceCents: number }>; latestAccountId: string | null };
      };
      const acct = s.money.latestAccountId ? s.money.accounts[s.money.latestAccountId] : undefined;
      const studioMain = document.querySelector('[data-testid="frame-studio"] main[data-view]');
      return {
        clock: window.__cindia!.player.now(),
        beatId: s.demo.beatId,
        camera: s.demo.camera,
        process: s.demo.process,
        drawer: s.demo.drawer,
        stageCamera: stage.getAttribute("data-camera"),
        studioView: studioMain ? studioMain.getAttribute("data-view") : null,
        frames,
        panel,
        pitch,
        ids: out,
        figures: figShots,
        balanceCents: acct ? acct.balanceCents : null,
      };
    },
    { ids: lookups, figs: figures, frameIds: FRAME_IDS, nativeWidth: NATIVE_WIDTH, shownId: frameId, stageWidth: STAGE_WIDTH },
  );
}

/**
 * Starts the in-page recorder: the first beat.started of each beat, with its own `at` from the
 * store's log, the player clock and wall time when it landed, and IDs seen on the stage during each
 * beat, each looked up in its scope (the beat's frame, the process panel or the stage).
 */
async function startRecorder(page: Page, lookupsByBeat: Record<string, Lookup[]>, frameByBeat: Record<string, FrameId | null>) {
  await page.evaluate(({ expected, frames }) => {
    const w = window as unknown as { cindiaDemoRun?: unknown };
    const run = {
      startWall: null as number | null,
      endWall: null as number | null,
      beats: [] as { beatId: string; at: number | null; clock: number; wall: number }[],
      seen: {} as Record<string, Record<string, boolean>>,
      lastBeat: null as string | null,
      /** Every change of the store's sources map during the run, with the player clock. */
      // `cause` is the registry warning logged just before the change in the same task (the registry
      // logs, then emits the scripted event synchronously), or null when no warning explains it.
      sourceChanges: [] as { key: string; to: string; clock: number; cause: string | null }[],
    };
    w.cindiaDemoRun = run;
    const hooks = window.__cindia!;
    const pendingWarn: Record<string, string> = {};
    const origWarn = console.warn.bind(console);
    console.warn = (...args: unknown[]) => {
      const m = typeof args[0] === "string" ? /^\[cindia sources\] (b\d\d-[a-z0-9-]+) (?:failed for|returned nothing for) /.exec(args[0]) : null;
      if (m) {
        const key = m[1];
        pendingWarn[key] = args[0] as string;
        queueMicrotask(() => {
          if (pendingWarn[key] === args[0]) delete pendingWarn[key];
        });
      }
      origWarn(...args);
    };
    let lastSources = { ...(hooks.store.getState() as unknown as { sources: Record<string, string> }).sources };
    hooks.store.subscribe(() => {
      const now = (hooks.store.getState() as unknown as { sources: Record<string, string> }).sources;
      for (const [key, to] of Object.entries(now))
        if (lastSources[key] !== to) {
          run.sourceChanges.push({ key, to, clock: hooks.player.now(), cause: pendingWarn[key] ?? null });
          delete pendingWarn[key];
        }
      lastSources = { ...now };
    });
    hooks.player.subscribe(() => {
      const p = hooks.player;
      if (run.startWall === null && p.isPlaying()) run.startWall = performance.now();
      if (run.startWall !== null && run.endWall === null && !p.isPlaying() && p.now() >= p.durationMs()) run.endWall = performance.now();
    });
    hooks.store.subscribe(() => {
      const st = hooks.store.getState() as unknown as { demo: { beatId: string | null }; log: { entries: { type: string; at: number }[] } };
      const beat = st.demo.beatId;
      if (beat && beat !== run.lastBeat) {
        run.lastBeat = beat;
        let at: number | null = null;
        for (let i = st.log.entries.length - 1; i >= 0; i--)
          if (st.log.entries[i].type === "beat.started") {
            at = st.log.entries[i].at;
            break;
          }
        run.beats.push({ beatId: beat, at, clock: hooks.player.now(), wall: performance.now() });
      }
    });
    const stage = document.querySelector('[data-testid="demo-stage"]') as HTMLElement;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      const sr = stage.getBoundingClientRect();
      if (Math.min(r.right, sr.right) - Math.max(r.left, sr.left) <= 1 || Math.min(r.bottom, sr.bottom) - Math.max(r.top, sr.top) <= 1) return false;
      let o = 1;
      for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
      return o > 0.05;
    };
    const sample = () => {
      const beat = run.lastBeat;
      if (beat && expected[beat]) {
        const seen = (run.seen[beat] ??= {});
        const frameId = frames[beat];
        const panel = [...stage.querySelectorAll('[data-slot="process.view"]')].find((el) => el.closest('[data-testid^="frame-"]') === null) ?? null;
        const frameRoot = frameId ? stage.querySelector(`[data-testid="${frameId}"]`) : null;
        for (const { id, scope } of expected[beat]) {
          if (seen[id]) continue;
          const root: ParentNode | null = scope === "panel" ? panel : scope === "stage" ? stage : (frameRoot ?? stage);
          const el = root?.querySelector(`[data-testid="${id}"]`);
          if (el && visible(el)) seen[id] = true;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, { expected: lookupsByBeat, frames: frameByBeat });
}

export interface BeatResult {
  beat: string;
  cut: string[];
  /** The `at` of the beat's first beat.started, read from the store's log when it landed. */
  firedAt: number | null;
  firedAtClock: number | null;
  firedAtWall: number | null;
  /** The store's camera, process and drawer at the screenshot. */
  camera: string | null;
  process: string | null;
  drawer: string | null;
  /** The camera demo-stage's data-camera shows, and that camera's frame. */
  stageCamera: string | null;
  frame: string | null;
  missing: string[];
  /** On screen IDs rendered but scrolled, clipped or off the stage at the screenshot. Fails the beat. */
  offFrame: string[];
  /** On screen IDs on the frame but mostly under another element, as "id under cover". Fails the beat. */
  covered: string[];
  /** Rendered IDs allowed out of frame (ordinary match rows in d07), kept as notes. */
  offFrameNotes: string[];
  onlySeenEarlier: string[];
  figuresMissing: string[];
  frameProblems: string[];
}

/** One source key in report.json. */
export interface SourceResult {
  /** The store's sources[key] after the run. */
  final: string;
  /** Its adapter's health() was true when the run started (live mode only). */
  healthyAtStart: boolean;
  /** The demo timeline has events with this key. */
  inTimeline: boolean;
  /** Live mode, healthy and in the timeline: the run must meet its rule. */
  asserted: boolean;
  /** The tour plays its keyed events scripted (ALLOWED_EMPTY_FALLBACKS' tourScripted): it need not go live. */
  tourScripted: boolean;
  /** Player clock when the key first turned live, or null. */
  firstLiveAtClock: number | null;
  /** How many times it went from live back to scripted during the run. */
  backToScripted: number;
  /** The registry's warnings each time the adapter failed or returned nothing and the scripted event played. */
  fallbacks: string[];
  /** Event types this key may return nothing for in the tour (ALLOWED_EMPTY_FALLBACKS in beats.ts). */
  allowedEmptyTypes: string[];
  /** The fallbacks that are allowed: "returned nothing" for one of allowedEmptyTypes. */
  allowedFallbacks: string[];
  /** Every other fallback: a throw, a timeout, or nothing returned for another type. */
  disallowedFallbacks: string[];
  /** Times it went from live back to scripted without an allowed fallback just before. */
  unexplainedBackToScripted: number;
  /** Its rule held: v1's (went live, every return explained) or tourScripted's (every fallback allowed). */
  liveOk: boolean;
}

/** What a beat checks, with the parts that come from the loaded timeline. */
interface ExpectedIds {
  /** Every ID the beat checks, with where it's looked up. */
  all: Lookup[];
  /** IDs that only need to be rendered and visible: being out of frame is a note, not a failure. */
  noteOnly: Set<string>;
  /** Figures, the beat's own and the timeline's, each with its feature and scope. */
  figures: (Figure & { feature: string | null; scope: Scope })[];
}

/** The data-dependent parts of each beat, read from the loaded timeline at run time. */
interface TimelineFacts {
  /** match.made per beat, as test IDs with their match kind. */
  matches: Record<string, { testId: string; kind: string }[]>;
  /** qry_01's keywords, in order (figure 11). */
  queryKeywords: string[];
  /** The gallery comparison's maker share from split.shown pc_01, in cents (figure 16). */
  compareCents: number | null;
  /** run_01's check step IDs. */
  run01Checks: string[];
  /** The check IDs of the tour's listing.drafted. */
  listingChecks: string[];
  /** The piece surprise.drawn drew (figure 12). */
  surprisePieceId: string | null;
  /** proof.search_scored's systems, when the model report exists. */
  searchSystems: string[];
  /** counterfeit.flagged cft_01's similarity (figure 14). */
  cftSimilarity: number | null;
  /** question.answered qst_01's words. */
  makerAnswer: string | null;
}

async function timelineFacts(page: Page): Promise<TimelineFacts> {
  const events = await page.evaluate(() => (window.__cindia!.player.getTimeline()?.events ?? []).map((e) => ({ type: e.type, at: e.at, payload: e.payload as Record<string, unknown> })));
  const find = (type: string, match: Record<string, unknown> = {}) => events.find((e) => e.type === type && Object.entries(match).every(([k, v]) => e.payload[k] === v));
  const matches: Record<string, { testId: string; kind: string }[]> = {};
  const made = events.filter((e) => e.type === "match.made");
  for (const b of BEATS) matches[b.id] = made.filter((e) => e.at >= b.start && e.at < b.end).map((e) => ({ testId: `reconcile-match-${e.payload.matchId as string}`, kind: e.payload.kind as string }));
  const split = find("split.shown", { pieceId: "pc_01" });
  const compare = split?.payload.compare as { makerShareCents?: number } | undefined;
  const drafted = find("listing.drafted");
  const scored = find("proof.search_scored");
  const cft = find("counterfeit.flagged", { cftId: "cft_01" });
  const answer = find("question.answered", { questionId: "qst_01" });
  return {
    matches,
    queryKeywords: (find("search.queried", { queryId: "qry_01" })?.payload.keywords as string[] | undefined) ?? [],
    compareCents: compare?.makerShareCents ?? null,
    run01Checks: events.filter((e) => e.type === "swarm.step" && e.payload.runId === "run_01" && e.payload.kind === "check").map((e) => e.payload.stepId as string),
    listingChecks: ((drafted?.payload.checks as { checkId: string }[] | undefined) ?? []).map((c) => c.checkId),
    surprisePieceId: (find("surprise.drawn")?.payload.pieceId as string | undefined) ?? null,
    searchSystems: ((scored?.payload.systems as { system: string }[] | undefined) ?? []).map((s) => s.system),
    cftSimilarity: (cft?.payload.similarity as number | undefined) ?? null,
    makerAnswer: (answer?.payload.text as string | undefined) ?? null,
  };
}

const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The IDs and figures a beat checks: its On screen column, and what the loaded timeline adds (d01's
 * chips, d04's check step, d15's checks, d07's matches, d02's piece, d13's systems, d14's text match,
 * d17's answer). For reconcile, the kinds SHOWN_MATCH_KINDS names must be in frame and ordinary
 * one-to-one rows may scroll out.
 */
function expectedIds(beat: Beat, cut: Set<string>, facts: TimelineFacts): ExpectedIds {
  const onScreen: Record<string, string[]> = Object.fromEntries(Object.entries(beat.onScreen).map(([f, ids]) => [f, [...ids]]));
  const figures: (Figure & { feature: string | null })[] = beat.figures.map((fig) => ({
    ...fig,
    feature: Object.entries(beat.onScreen).find(([, list]) => list.includes(fig.testId))?.[0] ?? null,
  }));
  const add = (feature: string, ids: string[]) => (onScreen[feature] = [...(onScreen[feature] ?? []), ...ids]);
  const fig = (feature: string, testId: string, text: string) => figures.push({ testId, text, feature });
  if (beat.id === "d01-vibe") {
    const chips = facts.queryKeywords.map((_, i) => `search-chip-${i + 1}`);
    add("search", chips);
    facts.queryKeywords.forEach((k, i) => fig("search", `search-chip-${i + 1}`, k));
  }
  if (beat.id === "d03-piece" && facts.compareCents !== null) fig("buyer", "buyer-split-compare", dollars(facts.compareCents));
  if (beat.id === "d04-support") add("process", facts.run01Checks.map((id) => `process-swarm-step-${id}`));
  if (beat.id === "d15-listing") add("seller-hub", facts.listingChecks.map((id) => `seller-listing-check-${id}`));
  if (beat.id === "d02-surprise" && facts.surprisePieceId) {
    const piece = pieces.find((p) => p.id === facts.surprisePieceId);
    if (piece) fig("search", "search-surprise-result", piece.title.en);
  }
  if (beat.id === "d13-proof") {
    if (facts.searchSystems.length > 0) add("search", facts.searchSystems.map((s) => `search-proof-row-${s}`));
    else fig("search", "search-proof", "Not trained yet");
  }
  if (beat.id === "d14-watch" && facts.cftSimilarity !== null) fig("watch", "watch-similarity-cft_01", facts.cftSimilarity.toFixed(2));
  if (beat.id === "d17-ask-maker" && facts.makerAnswer) fig("support", "support-maker-answer-qst_01", facts.makerAnswer);

  // Under a process, the process feature's view root shows in the panel (its placeholder when F-process is cut).
  if (beat.process) add("process", [`process-pane-${beat.process}`]);
  const scopeOf = (feature: string | null): Scope => (feature === "process" ? "panel" : feature === "stage" ? "stage" : "frame");
  const all: Lookup[] = [];
  const noteOnly = new Set<string>();
  for (const [feature, list] of Object.entries(onScreen)) {
    if (cut.has(feature)) continue;
    for (const id of list) all.push({ id, scope: scopeOf(feature) });
    if (feature === "reconcile")
      for (const m of facts.matches[beat.id] ?? []) {
        all.push({ id: m.testId, scope: "frame" });
        if (!SHOWN_MATCH_KINDS.includes(m.kind)) noteOnly.add(m.testId);
      }
  }
  return {
    all,
    noteOnly,
    figures: figures.filter((f) => !(f.feature && cut.has(f.feature))).map((f) => ({ ...f, scope: scopeOf(f.feature) })),
  };
}

/**
 * Plays the whole tour at 1x and checks every beat. Saves one screenshot per beat and report.json
 * in `dir` (artifacts/demo/ for the demo test).
 */
export async function playDemo(page: Page, dir = ARTIFACTS_DEMO): Promise<BeatResult[]> {
  const cut = cutFeatures();
  const cutMigrations = cutMigrationSlugs();
  const facts = await timelineFacts(page);
  const expected: Record<string, ExpectedIds> = {};
  for (const b of BEATS) expected[b.id] = expectedIds(b, cut, facts);
  const recorded: Record<string, Lookup[]> = {};
  const frameByBeat: Record<string, FrameId | null> = {};
  for (const b of BEATS) {
    recorded[b.id] = expected[b.id].all;
    frameByBeat[b.id] = shownFrame(b.camera);
  }

  // The registry warns each time a live adapter fails or returns nothing and the scripted event plays.
  const fallbacks: Record<string, string[]> = {};
  const onConsole = (msg: ConsoleMessage) => {
    const m = /^\[cindia sources\] (b\d\d-[a-z0-9-]+) (failed for|returned nothing for|start\(\) failed)/.exec(msg.text());
    if (m) (fallbacks[m[1]] ??= []).push(msg.text());
  };
  page.on("console", onConsole);

  // Start from a clean reset at 1x.
  await page.getByTestId("demo-reset").click();
  expect(await page.evaluate(() => window.__cindia!.player.now())).toBe(0);
  expect(await page.evaluate(() => window.__cindia!.player.getSpeed())).toBe(1);
  await startRecorder(page, recorded, frameByBeat);
  await page.getByTestId("demo-play").click();
  // Move the pointer off the controls and drop their focus, so they collapse and stay out of the screenshots.
  await page.mouse.move(800, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  const results: BeatResult[] = [];
  for (const beat of BEATS) {
    const shotAt = beat.end - 300;
    await page.waitForFunction((t) => window.__cindia!.player.now() >= t, shotAt, { polling: "raf", timeout: beat.end - beat.start + 15000 });
    const want = expected[beat.id];
    const listed = new Set(want.all.map((l) => l.id));
    const extra: Lookup[] = want.figures.filter((f) => !listed.has(f.testId)).map((f) => ({ id: f.testId, scope: f.scope }));
    // A cut feature's slot shows its placeholder; a cut migration's v1 version may fill it instead.
    const slotIds = Object.entries(beat.slots)
      .filter(([f]) => cut.has(f))
      .map(([f, s]) => ({ feature: f, lookup: { id: `slot-${s.replace(/\./g, "-")}`, scope: (f === "process" ? "panel" : "frame") as Scope } }));
    const frame = frameByBeat[beat.id];
    const screen = await readScreen(page, frame, [...want.all, ...extra, ...slotIds.map((s) => s.lookup)], want.figures);
    await screenshot(page, beat.id, dir);

    const r: BeatResult = {
      beat: beat.id,
      cut: Object.keys(beat.onScreen).filter((f) => cut.has(f)),
      firedAt: null,
      firedAtClock: null,
      firedAtWall: null,
      camera: screen.camera,
      process: screen.process,
      drawer: screen.drawer,
      stageCamera: screen.stageCamera,
      frame,
      missing: [],
      offFrame: [],
      covered: [],
      offFrameNotes: [],
      onlySeenEarlier: [],
      figuresMissing: [],
      frameProblems: [],
    };
    // Still in this beat when the screen was read, on its camera, process and drawer.
    expect(screen.beatId, `${beat.id}: the beat on screen 300 ms before its end`).toBe(beat.id);
    expect(screen.camera, `${beat.id}: camera`).toBe(beat.camera);
    expect(screen.process, `${beat.id}: process`).toBe(beat.process);
    expect(screen.drawer, `${beat.id}: drawer`).toBe(beat.drawer);
    expect(screen.stageCamera, `${beat.id}: the stage follows the camera`).toBe(beat.camera);
    const view = cameraView(beat.camera);
    if (view) expect(screen.studioView, `${beat.id}: Sell view`).toBe(view);

    // Frames: the camera's one frame shown at full size (sell-catch at 1.35, 0.66 in the left two
    // thirds under a process) and inside the stage; the rest hidden. pitch shows no frame.
    const frameScales = cameraFrames(beat.camera, beat.process);
    for (const f of FRAME_IDS) {
      const got = screen.frames[f];
      const scale = frameScales[f];
      if (scale === undefined) {
        if (got.opacity > 0.01) r.frameProblems.push(`${f} should be hidden, opacity ${got.opacity.toFixed(2)}`);
        continue;
      }
      if (got.opacity < 0.99) r.frameProblems.push(`${f} should show at full opacity, opacity ${got.opacity.toFixed(2)}`);
      if (Math.abs(got.scale - scale) > 0.01) r.frameProblems.push(`${f} scale ${got.scale.toFixed(3)}, want ${scale}`);
      if (beat.camera !== "sell-catch" && !got.inStage) r.frameProblems.push(`${f} runs off the stage`);
      if (beat.process && got.right > (STAGE_WIDTH * 2) / 3 + 2) r.frameProblems.push(`${f} runs past the left two thirds (right edge ${got.right.toFixed(0)})`);
    }
    // The process panel: under a process, the process.view slot outside every frame fills the right
    // third, with process-pane-<processId> in it (or slot-process-view when F-process is cut).
    if (beat.process) {
      const p = screen.panel;
      if (!p.present) r.frameProblems.push("the process panel's process.view slot is missing");
      else {
        if (p.opacity < 0.99) r.frameProblems.push(`the process panel shows at opacity ${p.opacity.toFixed(2)}`);
        const third = STAGE_WIDTH / 3;
        if (Math.abs(p.left - (STAGE_WIDTH - third)) > 2 || Math.abs(p.right - STAGE_WIDTH) > 2 || Math.abs(p.top) > 2 || Math.abs(p.bottom - STAGE_HEIGHT) > 2)
          r.frameProblems.push(`the process panel doesn't fill the right third: ${p.left.toFixed(0)} to ${p.right.toFixed(0)}, ${p.top.toFixed(0)} to ${p.bottom.toFixed(0)}`);
      }
    } else if (screen.panel.present && screen.panel.opacity > 0.01) r.frameProblems.push("the process panel shows in a beat without a process");
    // The pitch cards: the beat's own fills the stage; every other card is hidden.
    if (beat.camera === "pitch") {
      const own = beat.onScreen.stage?.[0];
      for (const c of screen.pitch) {
        if (c.id === own) {
          if (c.opacity < 0.99) r.frameProblems.push(`${c.id} shows at opacity ${c.opacity.toFixed(2)}`);
          if (Math.abs(c.left) > 2 || Math.abs(c.top) > 2 || Math.abs(c.right - STAGE_WIDTH) > 2 || Math.abs(c.bottom - STAGE_HEIGHT) > 2)
            r.frameProblems.push(`${c.id} doesn't fill the stage`);
        } else if (c.opacity > 0.01) r.frameProblems.push(`${c.id} should be hidden`);
      }
    } else for (const c of screen.pitch) if (c.opacity > 0.01) r.frameProblems.push(`${c.id} shows outside the pitch camera`);

    // Test IDs: in frame and uncovered now. A listed transient ID may instead have shown earlier in
    // the beat. Ordinary match rows only need to be rendered.
    const seen = await page.evaluate((b) => (window as unknown as { cindiaDemoRun: { seen: Record<string, Record<string, boolean>> } }).cindiaDemoRun.seen[b] ?? {}, beat.id);
    for (const { id } of want.all) {
      const s = screen.ids[id];
      const inView = s.visible && s.onFrame && s.covered === null;
      if (inView) continue;
      if (beat.transient?.[id] && seen[id]) {
        r.onlySeenEarlier.push(id);
        continue;
      }
      if (!s.visible) {
        r.missing.push(id);
        continue;
      }
      if (want.noteOnly.has(id)) {
        r.offFrameNotes.push(id);
        continue;
      }
      if (!s.onFrame) r.offFrame.push(id);
      else r.covered.push(`${id} under ${s.covered}`);
    }
    for (const { feature, lookup } of slotIds) {
      if (screen.ids[lookup.id]?.visible) continue;
      // A cut migration's v1 version may still fill the slot (B1-24).
      if (cutMigrations.has(feature)) continue;
      r.missing.push(lookup.id);
    }

    // Figures: the text is in the element, and at least one place holding it is in view.
    want.figures.forEach((fig, i) => {
      const f = screen.figures[i];
      if (!f.found) r.figuresMissing.push(`${fig.testId} "${fig.text}"`);
      else if (!f.inView) r.figuresMissing.push(`${fig.testId} "${fig.text}" is rendered but out of frame or covered`);
    });
    if (beat.id === "d06-money" && !cut.has("money-map")) {
      const cents = screen.balanceCents;
      const text = screen.ids["money-map-balance"]?.text ?? "";
      const shown = cents === null ? null : dollars(cents);
      if (!shown || !text.includes(shown)) r.figuresMissing.push(`money-map-balance "${shown ?? "no account.synced"}"`);
    }
    results.push(r);
  }

  // The run ends at durationMs and the player stops by itself, on the end card, which stays.
  await page.waitForFunction(() => !window.__cindia!.player.isPlaying() && window.__cindia!.player.now() >= window.__cindia!.player.durationMs(), undefined, {
    polling: "raf",
    timeout: 10000,
  });
  const run = await page.evaluate(() => {
    const r = (window as unknown as { cindiaDemoRun: { startWall: number | null; endWall: number | null; beats: { beatId: string; at: number | null; clock: number; wall: number }[] } }).cindiaDemoRun;
    return { startWall: r.startWall, beats: r.beats, endWall: r.endWall ?? performance.now() };
  });
  await expect(page.getByTestId("demo-end-card"), "the end card shows after the last beat").toBeVisible();
  await screenshot(page, "end-card", dir);
  expect(run.startWall, "the recorder saw play start").not.toBeNull();
  for (const r of results) {
    const b = BEATS.find((x) => x.id === r.beat)!;
    const hit = run.beats.find((x) => x.beatId === r.beat);
    if (hit) {
      r.firedAt = hit.at;
      r.firedAtClock = Math.round(hit.clock);
      r.firedAtWall = Math.round(hit.wall - run.startWall!);
    }
    expect(hit, `${r.beat}: beat.started fired`).toBeTruthy();
    // The event's own time, so a late frame can't fail it.
    expect(hit!.at, `${r.beat}: its first beat.started's at`).not.toBeNull();
    expect(Math.abs(hit!.at! - b.start), `${r.beat}: beat.started on the player clock`).toBeLessThanOrEqual(BEAT_TOLERANCE_MS);
    expect(Math.abs(hit!.wall - run.startWall! - b.start), `${r.beat}: beat.started in real time`).toBeLessThanOrEqual(BEAT_WALL_TOLERANCE_MS);
  }
  // In order, each beat once.
  expect(run.beats.map((x) => x.beatId)).toEqual(BEATS.map((b) => b.id));

  // Which source delivered each key: the store's sources map after the run, its changes during the
  // run, and the registry's fallback warnings.
  page.off("console", onConsole);
  const end = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as { sources: Record<string, string>; mode: string };
    const events = (window.__cindia!.player.getTimeline()?.events ?? []) as unknown as { key?: string }[];
    const keys = [...new Set(events.map((e) => e.key).filter((k): k is string => typeof k === "string" && k.length > 0))];
    const changes = (window as unknown as { cindiaDemoRun: { sourceChanges: { key: string; to: string; clock: number; cause: string | null }[] } }).cindiaDemoRun.sourceChanges;
    return { sources: s.sources, mode: s.mode, timelineKeys: keys as string[], changes };
  });
  const health = DEMO_MODE === "live" ? healthAtStart.get(page) ?? null : null;
  const sources: Record<string, SourceResult> = {};
  for (const [key, final] of Object.entries(end.sources)) {
    const changes = end.changes.filter((c) => c.key === key);
    const healthy = health?.healthy.includes(key) ?? false;
    const inTimeline = end.timelineKeys.includes(key);
    const tourScripted = ALLOWED_EMPTY_FALLBACKS[key]?.tourScripted === true;
    const allowedEmptyTypes = [...(ALLOWED_EMPTY_FALLBACKS[key]?.types ?? [])];
    const isAllowed = (w: string | null) => w !== null && allowedEmptyTypes.some((t) => w.startsWith(`[cindia sources] ${key} returned nothing for ${t}, `));
    const keyFallbacks = fallbacks[key] ?? [];
    const allowedFallbacks = keyFallbacks.filter((w) => isAllowed(w));
    const disallowedFallbacks = keyFallbacks.filter((w) => !isAllowed(w));
    let lastLive = false;
    let backToScripted = 0;
    let unexplainedBackToScripted = 0;
    for (const c of changes) {
      if (c.to === "live") lastLive = true;
      else if (lastLive) {
        backToScripted++;
        if (!isAllowed(c.cause)) unexplainedBackToScripted++;
        lastLive = false;
      }
    }
    const firstLiveAtClock = changes.find((c) => c.to === "live")?.clock ?? null;
    // v1's rule: every return to scripted is explained by an allowed fallback, so a key may end on
    // scripted only when its last change was one of those. A tourScripted key needn't go live.
    const liveOk = tourScripted
      ? disallowedFallbacks.length === 0 && unexplainedBackToScripted === 0
      : firstLiveAtClock !== null && disallowedFallbacks.length === 0 && unexplainedBackToScripted === 0 && (final === "live" || allowedFallbacks.length > 0);
    sources[key] = {
      final,
      healthyAtStart: healthy,
      inTimeline,
      asserted: DEMO_MODE === "live" && healthy && inTimeline,
      tourScripted,
      firstLiveAtClock,
      backToScripted,
      fallbacks: keyFallbacks,
      allowedEmptyTypes,
      allowedFallbacks,
      disallowedFallbacks,
      unexplainedBackToScripted,
      liveOk,
    };
  }

  fs.mkdirSync(dir, { recursive: true });
  // The player's own length for the timeline that played, so neither this check nor the gate's time rule guesses it.
  const durationMs = await page.evaluate(() => window.__cindia!.player.durationMs());
  const report = {
    mode: DEMO_MODE,
    storeMode: end.mode,
    upgrade: DEMO_UPGRADE,
    health,
    allowedEmptyFallbacks: ALLOWED_EMPTY_FALLBACKS,
    sources,
    cut: [...cut],
    endedAtWallMs: Math.round(run.endWall - run.startWall!),
    durationMs,
    beats: results,
  };
  fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify(report, null, 2));
  const notes = results.flatMap((r) => [
    ...r.offFrameNotes.map((id) => `${r.beat}: ${id} is rendered but scrolled or clipped outside its frame (allowed)`),
    ...r.onlySeenEarlier.map((id) => `${r.beat}: ${id} showed earlier in the beat, gone at the screenshot`),
    ...r.cut.map((f) => `${r.beat}: ${f} is CUT, its slot placeholder checked instead`),
  ]);
  for (const n of notes) test.info().annotations.push({ type: "note", description: n });

  // The run ended within the timeline's own durationMs plus END_ALLOWANCE_MS of real time (fix-plan 1.9).
  expect(durationMs, "the player knows the timeline's length").toBeGreaterThan(0);
  expect(run.endWall - run.startWall!, `the run ends within durationMs (${durationMs} ms) plus ${END_ALLOWANCE_MS} ms`).toBeLessThanOrEqual(durationMs + END_ALLOWANCE_MS);

  // Live mode: every key with a healthy adapter and keyed events in the timeline met its rule. v1's
  // keys played live, with no scripted fallback except "returned nothing" for the types
  // ALLOWED_EMPTY_FALLBACKS lists (such a key must still go live at least once). A tourScripted key
  // passes when every fallback was an allowed "returned nothing". G5's upgrade must be one of them.
  if (DEMO_MODE === "live") {
    expect(end.mode, "the store is in live mode after the run").toBe("live");
    if (DEMO_UPGRADE) {
      expect(sources[DEMO_UPGRADE], `G5 upgrade ${DEMO_UPGRADE} is a source key`).toBeTruthy();
      if (!sources[DEMO_UPGRADE].inTimeline)
        test.info().annotations.push({ type: "note", description: `${DEMO_UPGRADE} has no keyed events in the demo timeline, so the demo cannot show it live` });
    }
    const sourceProblems = Object.entries(sources)
      .filter(([, s]) => s.asserted)
      .flatMap(([key, s]) =>
        s.tourScripted
          ? [
              ...(s.unexplainedBackToScripted
                ? [`${key}: went back to scripted ${s.unexplainedBackToScripted} time(s) during the run without an allowed fallback`]
                : []),
              ...s.disallowedFallbacks.map((f) => `${key}: ${f}`),
            ]
          : [
              ...(s.firstLiveAtClock === null ? [`${key}: healthy at the start, but never went live during the run`] : []),
              ...(s.final === "live" || (s.firstLiveAtClock !== null && s.allowedFallbacks.length > 0 && s.unexplainedBackToScripted === 0)
                ? []
                : [`${key}: healthy at the start, but the store's sources says ${s.final} after the run`]),
              ...(s.unexplainedBackToScripted
                ? [`${key}: went back to scripted ${s.unexplainedBackToScripted} time(s) during the run without an allowed fallback`]
                : []),
              ...s.disallowedFallbacks.map((f) => `${key}: ${f}`),
            ],
      );
    expect(sourceProblems, "healthy live sources that fell back to scripted").toEqual([]);
  }
  // Collect every beat's problems first, so one run reports them all.
  const problems = results.flatMap((r) => [
    ...r.missing.map((x) => `${r.beat}: missing ${x}`),
    ...r.offFrame.map((x) => `${r.beat}: out of frame ${x}`),
    ...r.covered.map((x) => `${r.beat}: covered ${x}`),
    ...r.figuresMissing.map((x) => `${r.beat}: figure ${x}`),
    ...r.frameProblems.map((x) => `${r.beat}: frame ${x}`),
  ]);
  expect(problems, "beats with On screen IDs, figures or frames not in view").toEqual([]);
  return results;
}
