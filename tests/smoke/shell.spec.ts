// The shell's behavior: language resolution, the demo controls and their keys, video mode,
// and the live badge rule through window.__cindia.emit().
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "./lib";

async function frameLangs(page: Page) {
  const out: Record<string, string | null> = {};
  for (const f of ["buyer", "studio", "owner", "maker"]) out[f] = await page.getByTestId(`frame-${f}`).getAttribute("lang");
  return out;
}

const now = (page: Page) => page.evaluate(() => window.__cindia!.player.now());
const playing = (page: Page) => page.evaluate(() => window.__cindia!.player.isPlaying());

test("language: auto puts buyer and studio in English, owner and maker in Chinese, then the toggle cycles", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/demo");
  await waitForHooks(page);
  expect(await page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("auto");
  expect(await frameLangs(page)).toEqual({ buyer: "en", studio: "en", owner: "zh", maker: "zh" });
  await page.getByTestId("demo-lang-toggle").click();
  expect(await frameLangs(page)).toEqual({ buyer: "en", studio: "en", owner: "en", maker: "en" });
  await page.getByTestId("demo-lang-toggle").click();
  expect(await frameLangs(page)).toEqual({ buyer: "zh", studio: "zh", owner: "zh", maker: "zh" });
  await page.getByTestId("demo-lang-toggle").click();
  expect(await frameLangs(page)).toEqual({ buyer: "en", studio: "en", owner: "zh", maker: "zh" });
  // The placeholders follow their surface's language.
  await expect(page.getByTestId("slot-owner-main")).toHaveAttribute("lang", "zh");
  await expect(page.getByTestId("slot-buyer-main")).toHaveAttribute("lang", "en");
  watch.expectClean();
});

test("demo controls respond to clicks", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/demo");
  await waitForHooks(page);
  const controls = page.getByTestId("demo-controls");
  await expect(controls).toBeVisible();

  // Play and pause are one button: exactly one of the two test IDs is on screen.
  await expect(page.getByTestId("demo-play")).toBeVisible();
  await expect(page.getByTestId("demo-pause")).toHaveCount(0);
  await page.getByTestId("demo-play").click();
  await expect(page.getByTestId("demo-pause")).toBeVisible();
  await expect(page.getByTestId("demo-play")).toHaveCount(0);
  await expect.poll(() => now(page)).toBeGreaterThan(0);
  await page.getByTestId("demo-pause").click();
  await expect(page.getByTestId("demo-play")).toBeVisible();
  expect(await playing(page)).toBe(false);

  await expect(page.getByTestId("demo-speed")).toHaveText("1x");
  for (const x of ["2x", "4x", "8x", "1x"]) {
    await page.getByTestId("demo-speed").click();
    await expect(page.getByTestId("demo-speed")).toHaveText(x);
  }

  await page.getByTestId("demo-reset").click();
  expect(await now(page)).toBe(0);

  await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Scripted/);
  await page.getByTestId("demo-mode-toggle").click();
  await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Live/);
  expect(await page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
  // One dot per source key in live mode.
  await expect(page.getByTestId("demo-mode-toggle").locator("[data-source-key]")).toHaveCount(10);
  await page.getByTestId("demo-mode-toggle").click();
  await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Scripted/);

  await expect(page.getByTestId("demo-start-at-catch")).toBeVisible();
  await page.getByTestId("demo-start-at-catch").click();
  // demo-offline only shows while the browser has no network.
  await expect(page.getByTestId("demo-offline")).toHaveCount(0);
  await page.context().setOffline(true);
  await expect(page.getByTestId("demo-offline")).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByTestId("demo-offline")).toHaveCount(0);
  watch.expectClean();
});

test("demo controls respond to their keys, except in a text input", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/studio/map");
  await waitForHooks(page);
  await page.locator("body").click({ position: { x: 5, y: 5 } });

  await page.keyboard.press("Space");
  await expect(page.getByTestId("demo-pause")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("demo-play")).toBeVisible();

  await page.keyboard.press("s");
  await expect(page.getByTestId("demo-speed")).toHaveText("2x");
  await page.keyboard.press("m");
  await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Live/);
  await page.keyboard.press("m");
  await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Scripted/);
  await page.keyboard.press("l");
  expect(await page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("en");
  await page.keyboard.press("l");
  await page.keyboard.press("l");
  expect(await page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("auto");
  await page.keyboard.press("Space");
  await expect.poll(() => now(page)).toBeGreaterThan(0);
  await page.keyboard.press("r");
  await expect(page.getByTestId("demo-play")).toBeVisible();
  expect(await now(page)).toBe(0);
  // c starts at the catch: seek to d07-catch's beat.started and play. With no catch beat loaded it does nothing.
  const [catchAt, nextBeatAt] = await page.evaluate(() => {
    const beats = (window.__cindia!.player.getTimeline()?.events ?? []).filter((e) => e.type === "beat.started");
    const i = beats.findIndex((e) => (e.payload as { beatId: string }).beatId === "d07-catch");
    if (i < 0) return [null, null] as const;
    return [beats[i].at, beats[i + 1]?.at ?? Number.POSITIVE_INFINITY] as const;
  });
  await page.keyboard.press("c");
  if (catchAt === null) {
    expect(await now(page)).toBe(0);
    expect(await playing(page)).toBe(false);
  } else {
    await expect(page.getByTestId("demo-pause")).toBeVisible();
    expect(await playing(page)).toBe(true);
    await expect.poll(() => now(page)).toBeGreaterThanOrEqual(catchAt);
    // Pause, so the input check below proves Space typed in an input doesn't start the player.
    await page.keyboard.press("Space");
    await expect(page.getByTestId("demo-play")).toBeVisible();
    expect(await playing(page)).toBe(false);
    const pausedAt = await now(page);
    expect(pausedAt).toBeGreaterThanOrEqual(catchAt);
    // It landed in d07-catch, not somewhere later in the demo.
    expect(pausedAt).toBeLessThan(nextBeatAt!);
  }

  // While a text input has focus, the keys are left alone.
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "smoke-input";
    document.body.appendChild(input);
  });
  await page.locator("#smoke-input").focus();
  await page.keyboard.press("s");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("demo-speed")).toHaveText("2x");
  await expect(page.locator("#smoke-input")).toHaveValue("s ");
  expect(await playing(page)).toBe(false);
  watch.expectClean();
});

test("the controls drive the same player on every route", async ({ page }) => {
  const watch = watchPage(page);
  for (const path of ["/buyer", "/owner", "/maker/mkr_01", "/studio/close"]) {
    await page.goto(path);
    await waitForHooks(page);
    await expect(page.getByTestId("demo-controls")).toBeVisible();
    const id = await page.evaluate(() => window.__cindia!.player.getTimeline()?.id ?? null);
    expect(id).toBe("demo");
  }
  watch.expectClean();
});

test("video mode hides the demo controls", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/demo?video=1");
  await expect(page.getByTestId("demo-stage")).toBeVisible();
  await expect(page.getByTestId("demo-controls")).toHaveCount(0);
  watch.expectClean();
});

test("start=catch does nothing while no timeline has the catch beat, and seeks to it when one does", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/demo?start=catch");
  await waitForHooks(page);
  const catchAt = await page.evaluate(
    () =>
      window.__cindia!.player.getTimeline()?.events.find(
        (e) => e.type === "beat.started" && (e.payload as { beatId: string }).beatId === "d07-catch",
      )?.at ?? null,
  );
  if (catchAt === null) {
    expect(await now(page)).toBe(0);
    expect(await playing(page)).toBe(false);
  } else {
    await expect.poll(() => now(page)).toBeGreaterThanOrEqual(catchAt);
  }
  watch.expectClean();
});

test("a live account.synced clears only the b04-bank source", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/demo");
  await waitForHooks(page);
  const sources = await page.evaluate(() => {
    window.__cindia!.emit({
      id: "evt_live_0001",
      type: "account.synced",
      at: 0,
      source: "live",
      key: "b04-bank",
      payload: { accountId: "acct_studio", balanceCents: 15648, asOf: "2026-09-01" },
    });
    return window.__cindia!.store.getState().sources;
  });
  expect(sources["b04-bank"]).toBe("live");
  const others = Object.entries(sources).filter(([k]) => k !== "b04-bank");
  expect(others).toHaveLength(9);
  for (const [, v] of others) expect(v).toBe("scripted");
  watch.expectClean();
});
