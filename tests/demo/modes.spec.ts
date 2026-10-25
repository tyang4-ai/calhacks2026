// The stage's modes on the tour, at 8x where the player clock allows it so the file finishes well
// inside the run beside it: presenter mode (?mode=present), ?start=<beatId> and ?start=catch, the
// end card at the end of plain /demo, video mode (?video=1) and reset. The cold open and the end
// card are real-time holds, so they keep their length. Every time comes from the timeline's
// beat.started events or seekToEvent(), never typed (D1-34).
import { expect, test, type Page } from "@playwright/test";
import { seekToEvent, shownFrameId, waitForHooks, watchPage } from "../smoke/lib";
import { openStage, screenshot } from "./harness";

const now = (page: Page) => page.evaluate(() => window.__cindia!.player.now());
const playing = (page: Page) => page.evaluate(() => window.__cindia!.player.isPlaying());
const stageCamera = (page: Page) => page.getByTestId("demo-stage").getAttribute("data-camera");
const beatId = (page: Page) => page.evaluate(() => (window.__cindia!.store.getState().demo as { beatId: string | null }).beatId);

/** Each beat's first beat.started, in order, from the loaded timeline. */
async function beatStarts(page: Page): Promise<{ beatId: string; at: number }[]> {
  return page.evaluate(() => {
    const out: { beatId: string; at: number }[] = [];
    for (const e of window.__cindia!.player.getTimeline()?.events ?? []) {
      if (e.type !== "beat.started") continue;
      const id = (e.payload as { beatId: string }).beatId;
      if (!out.some((b) => b.beatId === id)) out.push({ beatId: id, at: e.at });
    }
    return out.toSorted((a, b) => a.at - b.at);
  });
}

/** A beat's last millisecond: 1 ms before the next beat's first beat.started. */
function stopOf(beats: { beatId: string; at: number }[], id: string): number {
  const i = beats.findIndex((b) => b.beatId === id);
  return beats[i + 1].at - 1;
}

const startOf = (beats: { beatId: string; at: number }[], id: string) => beats.find((b) => b.beatId === id)!.at;

/** The opacity of an element and its ancestors, 0 when it isn't there. */
async function opacity(page: Page, testId: string): Promise<number> {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return 0;
    let o = 1;
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
    return o;
  }, testId);
}

async function blurControls(page: Page) {
  await page.mouse.move(800, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

test("presenter mode: each beat pauses 1 ms before the next, Space and the arrows step, the end card after d12-receipt, the stop at the end", async ({ page }) => {
  test.setTimeout(120_000);
  const watch = watchPage(page);
  await page.goto("/demo?mode=present");
  await waitForHooks(page);
  await page.evaluate(() => window.__cindia!.player.setSpeed(8));
  const beats = await beatStarts(page);
  // p01-what plays and pauses by itself 1 ms before p02-why, with its card up.
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(stopOf(beats, "p01-what"));
  expect(await playing(page)).toBe(false);
  expect(await beatId(page)).toBe("p01-what");
  expect(await opacity(page, "pitch-card-what")).toBeGreaterThan(0.99);
  await blurControls(page);
  // Space plays the next beat, which pauses the same way.
  await page.keyboard.press("Space");
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(stopOf(beats, "p02-why"));
  expect(await beatId(page)).toBe("p02-why");
  await expect.poll(() => opacity(page, "pitch-card-why")).toBeGreaterThan(0.99);
  // The right arrow plays the next one.
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(stopOf(beats, "p03-how"));
  expect(await beatId(page)).toBe("p03-how");
  // The left arrow replays the current beat from its start.
  const clocks: number[] = [];
  await page.evaluate(() => {
    const w = window as unknown as { cindiaClocks: number[] };
    w.cindiaClocks = [];
    window.__cindia!.player.subscribe(() => w.cindiaClocks.push(window.__cindia!.player.now()));
  });
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(stopOf(beats, "p03-how"));
  clocks.push(...(await page.evaluate(() => (window as unknown as { cindiaClocks: number[] }).cindiaClocks)));
  expect(Math.min(...clocks)).toBe(startOf(beats, "p03-how"));
  expect(await playing(page)).toBe(false);

  // While a beat plays, the right arrow jumps to the next beat's start (d04-support is the longest beat).
  await seekToEvent(page, "beat.started", { beatId: "d04-support" });
  await page.keyboard.press("Space");
  await expect.poll(() => playing(page)).toBe(true);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => beatId(page)).toBe("d05-pay");
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(stopOf(beats, "d05-pay"));

  // After d12-receipt the end card shows and stays.
  await seekToEvent(page, "beat.started", { beatId: "d12-receipt" });
  await page.keyboard.press("Space");
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(stopOf(beats, "d12-receipt"));
  const card = page.getByTestId("demo-end-card");
  await expect(card).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(card).toBeVisible();
  await screenshot(page, "presenter-end-card");
  // The left arrow hides it and replays d12-receipt.
  await page.keyboard.press("ArrowLeft");
  await expect(card).toHaveCount(0);
  await expect.poll(() => beatId(page)).toBe("d12-receipt");
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(stopOf(beats, "d12-receipt"));
  await expect(card).toBeVisible();
  // The right arrow hides it and continues into d02-surprise.
  await page.keyboard.press("ArrowRight");
  await expect(card).toHaveCount(0);
  await expect.poll(() => beatId(page)).toBe("d02-surprise");
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(stopOf(beats, "d02-surprise"));

  // After the last beat the player stops at the end of the timeline.
  const last = beats.at(-1)!;
  await seekToEvent(page, "beat.started", { beatId: last.beatId });
  await page.keyboard.press("Space");
  const duration = await page.evaluate(() => window.__cindia!.player.durationMs());
  await expect.poll(() => now(page), { timeout: 20000 }).toBe(duration);
  expect(await playing(page)).toBe(false);
  expect(await beatId(page)).toBe(last.beatId);

  // The keys do nothing while focus is in a text field.
  await seekToEvent(page, "beat.started", { beatId: "d03-piece" });
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "presenter-input";
    document.body.appendChild(input);
  });
  await page.locator("#presenter-input").focus();
  const before = await now(page);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  expect(await now(page)).toBe(before);
  expect(await playing(page)).toBe(false);
  watch.expectClean();
});

test("?start=d14-watch starts there and plays on; with mode=present it pauses at its end; an unknown beat is ignored", async ({ page }) => {
  test.setTimeout(90_000);
  const watch = watchPage(page);
  await page.goto("/demo?start=d14-watch");
  await waitForHooks(page);
  const beats = await beatStarts(page);
  await expect.poll(() => beatId(page)).toBe("d14-watch");
  expect(await now(page)).toBeGreaterThanOrEqual(startOf(beats, "d14-watch"));
  expect(await stageCamera(page)).toBe("sell-watch");
  expect(await playing(page)).toBe(true);
  await page.evaluate(() => window.__cindia!.player.setSpeed(8));
  await expect.poll(() => beatId(page), { timeout: 15000 }).toBe("d16-store");

  await page.goto("/demo?start=d14-watch&mode=present");
  await waitForHooks(page);
  await page.evaluate(() => window.__cindia!.player.setSpeed(8));
  await expect.poll(() => now(page), { timeout: 15000 }).toBe(stopOf(beats, "d14-watch"));
  expect(await playing(page)).toBe(false);
  expect(await beatId(page)).toBe("d14-watch");

  await page.goto("/demo?start=no-such-beat");
  await waitForHooks(page);
  await expect(page.getByTestId("demo-stage")).toHaveAttribute("data-camera", "pitch");
  expect(await now(page)).toBe(0);
  expect(await playing(page)).toBe(false);
  watch.expectClean();
});

test("?start=catch and demo-start-at-catch both start at d08-catch, as ?start=d08-catch does", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/demo?start=catch");
  await waitForHooks(page);
  const beats = await beatStarts(page);
  const at = startOf(beats, "d08-catch");
  await expect.poll(() => beatId(page)).toBe("d08-catch");
  expect(await now(page)).toBeGreaterThanOrEqual(at);
  expect(await stageCamera(page)).toBe("sell-catch");
  await page.evaluate(() => window.__cindia!.player.pause());
  expect(await now(page)).toBeLessThan(stopOf(beats, "d08-catch"));

  await openStage(page);
  await page.getByTestId("demo-start-at-catch").click();
  await expect.poll(() => beatId(page)).toBe("d08-catch");
  expect(await now(page)).toBeGreaterThanOrEqual(at);
  expect(await playing(page)).toBe(true);
  await expect.poll(() => shownFrameId(page)).toBe("frame-studio");
  await page.evaluate(() => window.__cindia!.player.pause());
  watch.expectClean();
});

test("plain /demo ends on the end card, which stays", async ({ page }) => {
  test.setTimeout(60_000);
  const watch = watchPage(page);
  await openStage(page);
  const beats = await beatStarts(page);
  const last = beats.at(-1)!;
  await seekToEvent(page, "beat.started", { beatId: last.beatId });
  await expect(page.getByTestId("demo-end-card")).toHaveCount(0);
  await page.evaluate(() => {
    window.__cindia!.player.setSpeed(8);
    window.__cindia!.player.play();
  });
  const card = page.getByTestId("demo-end-card");
  await expect(card).toBeVisible({ timeout: 20000 });
  await expect(card).toContainText("Cindy's agents fill three seats: bookkeeper, collections and support. A person approves anything that moves money.");
  await expect(card).toContainText("Describe the vibe. Gift the piece. Pay the person.");
  await expect(card).toContainText("Caught 4 of 4 planted errors");
  await expect(card).toContainText("Live means a real service answered in this run. Nessie is a sandbox bank, so no real money moved.");
  await expect(card).toContainText("Every community, maker and story here is fictional. The crafts are real traditions.");
  await expect(card).toContainText("github.com/tyang4-ai/calhacks2026");
  await expect(card).toContainText("Demo. Every maker, community and story here is fictional. Nothing is for sale.");
  await expect(card).toContainText("Checkout: demo only, no real charge");
  await page.waitForTimeout(2000);
  await expect(card).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await screenshot(page, "end-card-plain");
  // A reset hides it.
  await page.getByTestId("demo-reset").click();
  await expect(card).toHaveCount(0);
  watch.expectClean();
});

test("video mode: the cold open on the catch, the spine with 10-second pitch cards, no controls or label, then the end card", async ({ page }) => {
  test.setTimeout(120_000);
  const watch = watchPage(page);
  await page.goto("/demo?video=1");
  await waitForHooks(page);
  const beats = await beatStarts(page);
  const t0 = Date.now();
  // Cold open: paused on the last millisecond of d08-catch, on sell-catch, the flag and v1's line on screen.
  const coldOpen = page.locator('[data-video-phase="cold-open"]');
  await expect(coldOpen).toBeVisible();
  await expect(coldOpen).toContainText("The gallery paid $340 less than the contract says.");
  expect(await now(page)).toBe(stopOf(beats, "d08-catch"));
  expect(await playing(page)).toBe(false);
  expect(await stageCamera(page)).toBe("sell-catch");
  expect(await shownFrameId(page)).toBe("frame-studio");
  await expect(page.getByTestId("frame-studio").getByTestId("reconcile-flag")).toBeVisible();
  await expect(page.getByTestId("frame-studio").getByTestId("reconcile-explanation")).toBeVisible();
  await expect(page.getByTestId("demo-controls")).toHaveCount(0);
  await expect(page.getByTestId("demo-beat-label")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await screenshot(page, "video-cold-open");
  // Record the clock on every player change, to prove the pitch holds.
  await page.evaluate(() => {
    const w = window as unknown as { cindiaClocks: number[] };
    w.cindiaClocks = [];
    window.__cindia!.player.subscribe(() => w.cindiaClocks.push(window.__cindia!.player.now()));
    window.__cindia!.player.setSpeed(8);
  });

  // The run starts from p01-what after about 5 seconds.
  await expect(coldOpen).toHaveCount(0, { timeout: 8000 });
  const coldMs = Date.now() - t0;
  expect(coldMs).toBeGreaterThanOrEqual(4000);
  expect(coldMs).toBeLessThan(7500);
  await expect(page.getByTestId("demo-controls")).toHaveCount(0);
  await expect(page.getByTestId("demo-beat-label")).toHaveCount(0);

  // The end card after d12-receipt, for about 5 seconds.
  const card = page.getByTestId("demo-end-card");
  await expect(card).toBeVisible({ timeout: 60000 });
  const shown = Date.now();
  expect(await now(page)).toBe(stopOf(beats, "d12-receipt"));
  expect(await playing(page)).toBe(false);
  await expect(card).toContainText("github.com/tyang4-ai/calhacks2026");
  await expect(card).toContainText("Caught 4 of 4");
  await expect(card).toContainText("Cindy's agents fill three seats");
  await screenshot(page, "video-end-card");
  await expect(card).toHaveCount(0, { timeout: 8000 });
  const cardMs = Date.now() - shown;
  expect(cardMs).toBeGreaterThanOrEqual(4000);
  expect(cardMs).toBeLessThan(7500);

  // Each pitch card held 10 seconds on the player clock, then the player sought to the next beat:
  // no clock fell in the last 10 seconds of a pitch beat. Chapter 2 never played.
  const clocks = await page.evaluate(() => (window as unknown as { cindiaClocks: number[] }).cindiaClocks);
  const run = clocks.slice(clocks.findIndex((c) => c < 1000));
  for (const id of ["p01-what", "p02-why", "p03-how"]) {
    const start = startOf(beats, id);
    const skipped = run.filter((c) => c > start + 10000 + 8 * 40 && c < start + 20000);
    expect(skipped, `${id} holds 10 seconds`).toEqual([]);
  }
  // It ended on d12-receipt's last millisecond, and never played into chapter 2 beyond one 8x frame.
  expect(run.at(-1)).toBe(stopOf(beats, "d12-receipt"));
  expect(Math.max(...run)).toBeLessThan(startOf(beats, "d02-surprise") + 8 * 100);
  watch.expectClean();
});

test("reset at any point: clock 0, the store empty, the pitch camera up with the first card", async ({ page }) => {
  const watch = watchPage(page);
  await openStage(page);
  await seekToEvent(page, "approval.granted", { approvalId: "apr_02" });
  await expect.poll(() => stageCamera(page)).toBe("sell-approvals");
  await expect.poll(() => shownFrameId(page)).toBe("frame-studio");
  await page.getByTestId("demo-play").click();
  await page.getByTestId("demo-reset").click();
  expect(await now(page)).toBe(0);
  const s = await page.evaluate(() => {
    const st = window.__cindia!.store.getState() as unknown as {
      demo: { beatId: string | null; camera: string | null };
      buyer: { orderIds: string[] };
      money: { moveIds: string[] };
      month: { matchIds: string[]; flagIds: string[] };
      approvals: { approvalIds: string[] };
    };
    return { demo: st.demo, counts: [st.buyer.orderIds.length, st.money.moveIds.length, st.month.matchIds.length, st.month.flagIds.length, st.approvals.approvalIds.length] };
  });
  expect(s.counts).toEqual([0, 0, 0, 0, 0]);
  expect(s.demo.beatId).toBeNull();
  expect(await stageCamera(page)).toBe("pitch");
  await expect.poll(() => shownFrameId(page)).toBeNull();
  await expect.poll(() => opacity(page, "pitch-card-what")).toBeGreaterThan(0.99);
  await expect(page.getByTestId("demo-play")).toBeVisible();
  watch.expectClean();
});
