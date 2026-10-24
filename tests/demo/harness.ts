// The demo harness: opens /demo, plays the 60 seconds at 1x on the production build and checks
// every beat against tests/demo/beats.ts. A recorder inside the page notes when each beat.started
// lands (player clock and wall time) and which On screen test IDs showed during each beat. 300 ms
// before each beat ends the harness reads the screen in one go and saves artifacts/demo/<beat>.png.
// A beat fails when one of its On screen IDs or figures is rendered but scrolled, clipped or
// covered out of its frame's visible area at that moment. demo.spec.ts and offline.spec.ts both run it.
import fs from "node:fs";
import path from "node:path";
import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { waitForHooks, waitForSlots } from "../smoke/lib";
import { ALLOWED_EMPTY_FALLBACKS, BEATS, CAMERA_FRAMES, CAMERA_VIEW, FRAME_IDS, NATIVE_WIDTH, SHOWN_MATCH_KINDS, cutFeatures, type Beat, type FrameId } from "./beats";

export const ARTIFACTS_DEMO = path.join(process.env.CINDIA_ROOT ?? process.cwd(), "artifacts", "demo");

/** Live mode for G5, set by the gate through CINDIA_DEMO_MODE=live. */
export const DEMO_MODE: "scripted" | "live" = process.env.CINDIA_DEMO_MODE === "live" ? "live" : "scripted";

/** The upgrade under test in G5 (a source key like b01-match), set by the gate through CINDIA_DEMO_UPGRADE. */
export const DEMO_UPGRADE: string | null = process.env.CINDIA_DEMO_UPGRADE?.trim() || null;

/** How far a beat.started may land from its time in demo-script.md, in ms. */
export const BEAT_TOLERANCE_MS = 100;

/** How long openStage waits in live mode for every adapter whose router is loaded to report healthy. */
const HEALTH_WAIT_MS = 15000;

/** Live-mode source health at the start of a run, as openStage found it. */
export interface SourceHealthAtStart {
  /** Upgrade prefixes /api/health listed, like "b01". */
  routers: string[];
  /** Source keys with an adapter file in src/sources/live/. */
  adapters: string[];
  /** Adapters whose router is loaded: these should turn healthy. */
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
 * In live mode: asks /api/health which routers are loaded, waits for each adapter with a loaded
 * router to report healthy, and keeps what it found for playDemo. G5's upgrade must be healthy.
 */
async function captureSourceHealth(page: Page): Promise<SourceHealthAtStart> {
  const routers = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/health");
      if (!r.ok) return [] as string[];
      const body = (await r.json()) as { routers?: unknown };
      return Array.isArray(body.routers) ? body.routers.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [] as string[];
    }
  });
  const adapters = liveAdapterKeys();
  const expected = adapters.filter((k) => routers.includes(k.slice(0, 3)));
  await expect
    .poll(async () => {
      const h = await healthyDots(page);
      return expected.every((k) => h.includes(k));
    }, { timeout: HEALTH_WAIT_MS })
    .toBe(true)
    .catch(() => undefined);
  const healthy = await healthyDots(page);
  const found: SourceHealthAtStart = { routers, adapters, expected, healthy };
  healthAtStart.set(page, found);
  if (DEMO_UPGRADE) {
    expect(adapters, `G5 upgrade ${DEMO_UPGRADE}: an adapter file src/sources/live/${DEMO_UPGRADE}.ts`).toContain(DEMO_UPGRADE);
    expect(routers, `G5 upgrade ${DEMO_UPGRADE}: /api/health lists its router`).toContain(DEMO_UPGRADE.slice(0, 3));
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
}

interface ScreenShot {
  clock: number;
  beatId: string | null;
  camera: string | null;
  stageCamera: string | null;
  studioView: string | null;
  frames: Record<string, FrameShot>;
  ids: Record<string, ElementShot>;
  figures: FigureShot[];
  balanceCents: number | null;
}

/**
 * Reads the screen in one evaluate: each frame's opacity, scale and place, each test ID's state and
 * where each figure's text sits. An element is on its frame when part of it survives every clipping
 * ancestor (scroll areas, the phone and console frames, the stage and the window). It is covered
 * when most sample points of that visible part hit another element, or the beat label sits on it.
 */
async function readScreen(page: Page, testIds: string[], figures: { testId: string; text: string }[]): Promise<ScreenShot> {
  return page.evaluate(
    ({ ids, figs, frameIds, nativeWidth }) => {
      const stage = document.querySelector('[data-testid="demo-stage"]') as HTMLElement;
      const sr = stage.getBoundingClientRect();
      const k = sr.width / 1600;
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
      /** What covers most of a visible box, or null. SVG shapes are thin, so only the beat label counts for them. */
      const coverOf = (el: Element, b: Box): string | null => {
        if (labelBox && area(meet(b, labelBox)) > 0.25 * area(b)) return "demo-beat-label";
        if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) return null;
        const hits: Record<string, number> = {};
        let blocked = 0;
        for (const fx of [0.2, 0.5, 0.8])
          for (const fy of [0.2, 0.5, 0.8]) {
            const hit = document.elementFromPoint(b.left + (b.right - b.left) * fx, b.top + (b.bottom - b.top) * fy);
            if (!hit || el.contains(hit) || hit.contains(el)) continue;
            blocked++;
            const owner = hit.closest("[data-testid]");
            const name = owner ? owner.getAttribute("data-testid")! : hit.tagName.toLowerCase();
            hits[name] = (hits[name] ?? 0) + 1;
          }
        if (blocked < 5) return null;
        return Object.entries(hits).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      };
      const frames: Record<string, { opacity: number; scale: number; inStage: boolean }> = {};
      for (const f of frameIds) {
        const el = document.querySelector(`[data-testid="${f}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        frames[f] = {
          opacity: opacityOf(el),
          scale: r.width / k / nativeWidth[f],
          inStage: r.left >= sr.left - 2 && r.right <= sr.right + 2 && r.top >= sr.top - 2 && r.bottom <= sr.bottom + 2,
        };
      }
      const out: Record<string, { present: boolean; visible: boolean; onFrame: boolean; covered: string | null; text: string }> = {};
      for (const id of ids) {
        const el = document.querySelector(`[data-testid="${id}"]`);
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
      const figShots = figs.map(({ testId, text }) => {
        const root = document.querySelector(`[data-testid="${testId}"]`);
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
          return real(shown) && coverOf(h, shown) === null;
        });
        return { found: true, inView };
      });
      const s = window.__cindia!.store.getState() as unknown as {
        demo: { beatId: string | null; camera: string | null };
        money: { accounts: Record<string, { balanceCents: number }>; latestAccountId: string | null };
      };
      const acct = s.money.latestAccountId ? s.money.accounts[s.money.latestAccountId] : undefined;
      const studioMain = document.querySelector('[data-testid="frame-studio"] main[data-view]');
      return {
        clock: window.__cindia!.player.now(),
        beatId: s.demo.beatId,
        camera: s.demo.camera,
        stageCamera: stage.getAttribute("data-camera"),
        studioView: studioMain ? studioMain.getAttribute("data-view") : null,
        frames,
        ids: out,
        figures: figShots,
        balanceCents: acct ? acct.balanceCents : null,
      };
    },
    { ids: testIds, figs: figures, frameIds: FRAME_IDS, nativeWidth: NATIVE_WIDTH },
  );
}

/** Starts the in-page recorder: beat arrivals with clock and wall time, and IDs seen on the stage during each beat. */
async function startRecorder(page: Page, idsByBeat: Record<string, string[]>) {
  await page.evaluate((expected) => {
    const w = window as unknown as { cindiaDemoRun?: unknown };
    const run = {
      startWall: null as number | null,
      endWall: null as number | null,
      beats: [] as { beatId: string; clock: number; wall: number }[],
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
      const beat = (hooks.store.getState() as unknown as { demo: { beatId: string | null } }).demo.beatId;
      if (beat && beat !== run.lastBeat) {
        run.lastBeat = beat;
        run.beats.push({ beatId: beat, clock: hooks.player.now(), wall: performance.now() });
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
        for (const id of expected[beat]) {
          if (seen[id]) continue;
          const el = document.querySelector(`[data-testid="${id}"]`);
          if (el && visible(el)) seen[id] = true;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, idsByBeat);
}

export interface BeatResult {
  beat: string;
  cut: string[];
  firedAtClock: number | null;
  firedAtWall: number | null;
  camera: string | null;
  missing: string[];
  /** On screen IDs rendered but scrolled, clipped or off the stage at the screenshot. Fails the beat. */
  offFrame: string[];
  /** On screen IDs on the frame but mostly under another element, as "id under cover". Fails the beat. */
  covered: string[];
  /** Rendered IDs allowed out of frame (ordinary match rows in d06), kept as notes. */
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
  /** Live mode, healthy and in the timeline: the run must deliver it live. */
  asserted: boolean;
  /** Player clock when the key first turned live, or null. */
  firstLiveAtClock: number | null;
  /** How many times it went from live back to scripted during the run. */
  backToScripted: number;
  /** The registry's warnings each time the adapter failed or returned nothing and the scripted event played. */
  fallbacks: string[];
  /** Event types this key may return nothing for in the demo (ALLOWED_EMPTY_FALLBACKS in beats.ts). */
  allowedEmptyTypes: string[];
  /** The fallbacks that are allowed: "returned nothing" for one of allowedEmptyTypes. */
  allowedFallbacks: string[];
  /** Every other fallback: a throw, a timeout, or nothing returned for another type. */
  disallowedFallbacks: string[];
  /** Times it went from live back to scripted without an allowed fallback just before. */
  unexplainedBackToScripted: number;
  /** Went live at least once, every return to scripted came from an allowed fallback, and no other fallback. */
  liveOk: boolean;
}

interface ExpectedIds {
  /** Every ID the beat checks. */
  all: string[];
  /** IDs that only need to be rendered and visible: being out of frame is a note, not a failure. */
  noteOnly: Set<string>;
}

/** The match.made events of each beat, from the loaded timeline, as test IDs with their match kind. */
async function matchesByBeat(page: Page): Promise<Record<string, { testId: string; kind: string }[]>> {
  const events = await page.evaluate(() =>
    (window.__cindia!.player.getTimeline()?.events ?? [])
      .filter((e) => e.type === "match.made")
      .map((e) => {
        const p = e.payload as { matchId: string; kind: string };
        return { at: e.at, id: p.matchId, kind: p.kind };
      }),
  );
  const out: Record<string, { testId: string; kind: string }[]> = {};
  for (const b of BEATS) out[b.id] = events.filter((e) => e.at >= b.start && e.at < b.end).map((e) => ({ testId: `reconcile-match-${e.id}`, kind: e.kind }));
  return out;
}

/**
 * The IDs a beat checks. A group in the On screen column expands to its specific IDs: for
 * reconcile, every match.made in the beat, where the kinds the Figures column names (bundled,
 * refund netted, carried over) must be in frame and ordinary one-to-one rows may scroll out.
 */
function expectedIds(beat: Beat, cut: Set<string>, matches: Record<string, { testId: string; kind: string }[]>): ExpectedIds {
  const all: string[] = [];
  const noteOnly = new Set<string>();
  for (const [feature, list] of Object.entries(beat.onScreen)) {
    if (cut.has(feature)) continue;
    all.push(...list);
    if (feature === "reconcile")
      for (const m of matches[beat.id] ?? []) {
        all.push(m.testId);
        if (!SHOWN_MATCH_KINDS.includes(m.kind)) noteOnly.add(m.testId);
      }
  }
  return { all, noteOnly };
}

/**
 * Plays the whole demo at 1x and checks every beat. Saves one screenshot per beat and report.json
 * in `dir` (artifacts/demo/ for the demo test).
 */
export async function playDemo(page: Page, dir = ARTIFACTS_DEMO): Promise<BeatResult[]> {
  const cut = cutFeatures();
  const matches = await matchesByBeat(page);
  const expected: Record<string, ExpectedIds> = {};
  for (const b of BEATS) expected[b.id] = expectedIds(b, cut, matches);
  const recorded: Record<string, string[]> = {};
  for (const b of BEATS) recorded[b.id] = expected[b.id].all;

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
  await startRecorder(page, recorded);
  await page.getByTestId("demo-play").click();
  // Move the pointer off the controls and drop their focus, so they collapse and stay out of the screenshots.
  await page.mouse.move(800, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  const results: BeatResult[] = [];
  for (const beat of BEATS) {
    const shotAt = beat.end - 300;
    await page.waitForFunction((t) => window.__cindia!.player.now() >= t, shotAt, { polling: "raf", timeout: beat.end - beat.start + 15000 });
    const want = expected[beat.id];
    const extra = beat.figures.map((f) => f.testId).filter((id) => !want.all.includes(id));
    const slotIds = Object.entries(beat.slots)
      .filter(([f]) => cut.has(f))
      .map(([, s]) => `slot-${s.replace(/\./g, "-")}`);
    // Figures of cut features are set aside.
    const figures = beat.figures.filter((fig) => {
      const feature = Object.entries(beat.onScreen).find(([, list]) => list.includes(fig.testId))?.[0];
      return !(feature && cut.has(feature));
    });
    const screen = await readScreen(page, [...want.all, ...extra, ...slotIds], figures);
    await screenshot(page, beat.id, dir);

    const r: BeatResult = {
      beat: beat.id,
      cut: Object.keys(beat.onScreen).filter((f) => cut.has(f)),
      firedAtClock: null,
      firedAtWall: null,
      camera: screen.camera,
      missing: [],
      offFrame: [],
      covered: [],
      offFrameNotes: [],
      onlySeenEarlier: [],
      figuresMissing: [],
      frameProblems: [],
    };
    // Still in this beat when the screen was read.
    expect(screen.beatId, `${beat.id}: the beat on screen 300 ms before its end`).toBe(beat.id);
    expect(screen.camera, `${beat.id}: camera`).toBe(beat.camera);
    expect(screen.stageCamera, `${beat.id}: the stage follows the camera`).toBe(beat.camera);
    const view = CAMERA_VIEW[beat.camera];
    if (view) expect(screen.studioView, `${beat.id}: studio view`).toBe(view);

    // Frames: the camera's frames shown at their scale and inside the stage; the rest hidden.
    const frameScales = CAMERA_FRAMES[beat.camera];
    for (const f of FRAME_IDS) {
      const got = screen.frames[f];
      const scale = frameScales[f as FrameId];
      if (scale === undefined) {
        if (got.opacity > 0.01) r.frameProblems.push(`${f} should be hidden, opacity ${got.opacity.toFixed(2)}`);
        continue;
      }
      if (got.opacity < 0.2) r.frameProblems.push(`${f} should show, opacity ${got.opacity.toFixed(2)}`);
      if (Math.abs(got.scale - scale) > 0.01) r.frameProblems.push(`${f} scale ${got.scale.toFixed(3)}, want ${scale}`);
      if (beat.camera !== "studio-catch" && !got.inStage) r.frameProblems.push(`${f} runs off the stage`);
    }

    // Test IDs: in frame and uncovered now. A listed transient ID may instead have shown earlier in
    // the beat. Ordinary match rows only need to be rendered.
    const seen = await page.evaluate((b) => (window as unknown as { cindiaDemoRun: { seen: Record<string, Record<string, boolean>> } }).cindiaDemoRun.seen[b] ?? {}, beat.id);
    for (const id of want.all) {
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
    for (const id of slotIds) if (!screen.ids[id]?.visible) r.missing.push(id);

    // Figures: the text is in the element, and at least one place holding it is in view.
    figures.forEach((fig, i) => {
      const f = screen.figures[i];
      if (!f.found) r.figuresMissing.push(`${fig.testId} "${fig.text}"`);
      else if (!f.inView) r.figuresMissing.push(`${fig.testId} "${fig.text}" is rendered but out of frame or covered`);
    });
    if (beat.id === "d05-money" && !cut.has("money-map")) {
      const cents = screen.balanceCents;
      const text = screen.ids["money-map-balance"]?.text ?? "";
      const dollars = cents === null ? null : `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (!dollars || !text.includes(dollars)) r.figuresMissing.push(`money-map-balance "${dollars ?? "no account.synced"}"`);
    }
    results.push(r);
  }

  // The run ends at 60.0 and the player stops by itself.
  await page.waitForFunction(() => !window.__cindia!.player.isPlaying() && window.__cindia!.player.now() >= window.__cindia!.player.durationMs(), undefined, {
    polling: "raf",
    timeout: 10000,
  });
  const run = await page.evaluate(() => {
    const r = (window as unknown as { cindiaDemoRun: { startWall: number | null; endWall: number | null; beats: { beatId: string; clock: number; wall: number }[] } }).cindiaDemoRun;
    return { startWall: r.startWall, beats: r.beats, endWall: r.endWall ?? performance.now() };
  });
  expect(run.startWall, "the recorder saw play start").not.toBeNull();
  for (const r of results) {
    const b = BEATS.find((x) => x.id === r.beat)!;
    const hit = run.beats.find((x) => x.beatId === r.beat);
    if (hit) {
      r.firedAtClock = Math.round(hit.clock);
      r.firedAtWall = Math.round(hit.wall - run.startWall!);
    }
    expect(hit, `${r.beat}: beat.started fired`).toBeTruthy();
    expect(Math.abs(hit!.clock - b.start), `${r.beat}: beat.started on the player clock`).toBeLessThanOrEqual(BEAT_TOLERANCE_MS);
    expect(Math.abs(hit!.wall - run.startWall! - b.start), `${r.beat}: beat.started in real time`).toBeLessThanOrEqual(BEAT_TOLERANCE_MS);
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
    // Every return to scripted is explained by an allowed fallback, so a key may end on scripted
    // only when its last change was one of those.
    const liveOk =
      firstLiveAtClock !== null &&
      disallowedFallbacks.length === 0 &&
      unexplainedBackToScripted === 0 &&
      (final === "live" || allowedFallbacks.length > 0);
    sources[key] = {
      final,
      healthyAtStart: healthy,
      inTimeline,
      asserted: DEMO_MODE === "live" && healthy && inTimeline,
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
  const report = {
    mode: DEMO_MODE,
    storeMode: end.mode,
    upgrade: DEMO_UPGRADE,
    health,
    allowedEmptyFallbacks: ALLOWED_EMPTY_FALLBACKS,
    sources,
    cut: [...cut],
    endedAtWallMs: Math.round(run.endWall - run.startWall!),
    beats: results,
  };
  fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify(report, null, 2));
  const notes = results.flatMap((r) => [
    ...r.offFrameNotes.map((id) => `${r.beat}: ${id} is rendered but scrolled or clipped outside its frame (allowed)`),
    ...r.onlySeenEarlier.map((id) => `${r.beat}: ${id} showed earlier in the beat, gone at the screenshot`),
    ...r.cut.map((f) => `${r.beat}: ${f} is CUT, its slot placeholder checked instead`),
  ]);
  for (const n of notes) test.info().annotations.push({ type: "note", description: n });

  // The run ended by 60.5 s of real time.
  expect(run.endWall - run.startWall!, "the run ends by 60.5 s").toBeLessThanOrEqual(60500);

  // Live mode: every key with a healthy adapter and keyed events in the timeline played live, with
  // no scripted fallback, except "returned nothing" for the types ALLOWED_EMPTY_FALLBACKS lists for
  // its key (such a key must still go live at least once). G5's upgrade must be one of them.
  if (DEMO_MODE === "live") {
    expect(end.mode, "the store is in live mode after the run").toBe("live");
    if (DEMO_UPGRADE) {
      expect(sources[DEMO_UPGRADE], `G5 upgrade ${DEMO_UPGRADE} is a source key`).toBeTruthy();
      if (!sources[DEMO_UPGRADE].inTimeline)
        test.info().annotations.push({ type: "note", description: `${DEMO_UPGRADE} has no keyed events in the demo timeline, so the demo cannot show it live` });
    }
    const sourceProblems = Object.entries(sources)
      .filter(([, s]) => s.asserted)
      .flatMap(([key, s]) => [
        ...(s.firstLiveAtClock === null ? [`${key}: healthy at the start, but never went live during the run`] : []),
        ...(s.final === "live" || (s.firstLiveAtClock !== null && s.allowedFallbacks.length > 0 && s.unexplainedBackToScripted === 0)
          ? []
          : [`${key}: healthy at the start, but the store's sources says ${s.final} after the run`]),
        ...(s.unexplainedBackToScripted
          ? [`${key}: went back to scripted ${s.unexplainedBackToScripted} time(s) during the run without an allowed fallback`]
          : []),
        ...s.disallowedFallbacks.map((f) => `${key}: ${f}`),
      ]);
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
