// F-impact T1, on M-desktop's /sell/close at 1440 by 900: the three impact numbers (acceptance 1
// to 5). Expected values come from the timeline's impact.updated payload, never typed in, and every
// moment is read from the event's own time.
import { expect, test, type Page } from "@playwright/test";
import { formatBps } from "../../src/features/impact/formatBps";
import { UI } from "../../src/features/impact/strings";
import { SELL_VIEWPORT, openSell, waitForHooks, watchPage } from "./sell-views-lib";

// M-desktop: the close view on /sell/close at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

interface ImpactPayload {
  impactId: string;
  makerShareBps: number;
  daysCloseToPayout: number;
  daysCloseToPayoutBefore: number;
  bookkeepingHoursSaved: number;
  estimate: boolean;
}

const IDS = ["impact-maker-share", "impact-days-to-payout", "impact-hours-saved"] as const;

async function openClose(page: Page) {
  await openSell(page, "close");
  await page.evaluate(() => window.__cindia!.player.pause());
}

async function seekTo(page: Page, ms: number) {
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function scriptedImpact(page: Page): Promise<{ at: number; payload: ImpactPayload }> {
  const found = await page.evaluate(() => {
    const e = window.__cindia!.player.getTimeline()?.events.find((ev) => ev.type === "impact.updated");
    return e ? { at: e.at, payload: e.payload as ImpactPayload } : null;
  });
  expect(found, "an impact.updated in the timeline").not.toBeNull();
  return found!;
}

/** The big number in one block (its CountUp span). */
function numberIn(page: Page, id: string) {
  return page.getByTestId(id).locator('[data-role="value"]');
}

async function expectFinal(page: Page, p: ImpactPayload) {
  await expect(numberIn(page, "impact-maker-share")).toHaveText(formatBps(p.makerShareBps));
  await expect(numberIn(page, "impact-days-to-payout")).toHaveText(String(p.daysCloseToPayout));
  await expect(page.getByTestId("impact-days-to-payout")).toContainText(
    `${UI.before.en}${UI.colon.en}${p.daysCloseToPayoutBefore} ${UI.days.en}`,
  );
  await expect(numberIn(page, "impact-hours-saved")).toHaveText(String(p.bookkeepingHoursSaved));
}

test("formatBps keeps one decimal", () => {
  expect(formatBps(7400)).toBe("74.0%");
  expect(formatBps(7425)).toBe("74.3%");
  expect(formatBps(1000)).toBe("10.0%");
  expect(formatBps(5)).toBe("0.1%");
  expect(formatBps(0)).toBe("0.0%");
});

test("before impact.updated all three numbers show a dash", async ({ page }) => {
  const watch = watchPage(page);
  await openClose(page);
  const { at } = await scriptedImpact(page);
  await seekTo(page, at - 500);
  for (const id of IDS) {
    await expect(page.getByTestId(id)).toBeVisible();
    await expect(numberIn(page, id)).toHaveText(UI.dash.en);
  }
  watch.expectClean();
});

test("after a seek past impact.updated the three show the payload's values at once", async ({ page }) => {
  const watch = watchPage(page);
  await openClose(page);
  const { at, payload } = await scriptedImpact(page);
  await seekTo(page, at - 500);
  await expect(numberIn(page, "impact-maker-share")).toHaveText(UI.dash.en);
  // Seek just past the event: still inside where a count-up would run, but a seek shows final values.
  await seekTo(page, at + 10);
  await expectFinal(page, payload);
  watch.expectClean();
});

test("loading the page already past impact.updated shows the final values", async ({ page }) => {
  const watch = watchPage(page);
  await openClose(page);
  const { at, payload } = await scriptedImpact(page);
  await seekTo(page, at + 1000);
  await page.reload();
  await waitForHooks(page);
  await seekTo(page, at + 1000);
  await expectFinal(page, payload);
  watch.expectClean();
});

/** Player time after the event at which playAcross pauses, well inside the 900 ms count-up. */
const PAUSE_AFTER_MS = 300;

/** What playAcross saw: how far past the event the clock stopped, on the player clock. */
interface Stop {
  since: number;
}

/**
 * Plays (at 1x) across the event from 200 ms before it, and pauses on the first player frame at or
 * past PAUSE_AFTER_MS after it on which the maker share already shows a number. Sampling by the
 * player clock and by what is on screen, never by wall time: under load one frame can carry the
 * event and the 300 ms mark together, and pausing before React has rendered that frame would make
 * the number appear while paused (final at once, as a seek does). Waiting for the rendered number
 * means the count-up started while playing. Playing, not seek(), so the count-up runs.
 */
async function playAcross(page: Page, at: number): Promise<Stop> {
  await seekTo(page, at - 200);
  return page.evaluate(
    ({ eventAt, pauseAt }) =>
      new Promise<Stop>((resolve) => {
        // subscribe() and setSpeed() are on the real Player (src/core/player.ts) but not in the
        // narrower window.__cindia type in tests/smoke/lib.ts.
        const p = window.__cindia!.player as NonNullable<typeof window.__cindia>["player"] & {
          subscribe(listener: () => void): () => void;
          setSpeed(x: 1 | 2 | 4 | 8): void;
        };
        let done = false;
        const off = p.subscribe(() => {
          if (done || !p.isPlaying() || p.now() < pauseAt) return;
          const shown = document.querySelector('[data-testid="impact-maker-share"] [data-role="value"]')?.textContent ?? "";
          if (!/\d/.test(shown)) return; // the number hasn't rendered yet: wait a frame
          done = true;
          off();
          p.pause();
          resolve({ since: p.now() - eventAt });
        });
        p.setSpeed(1);
        p.play();
      }),
    { eventAt: at, pauseAt: at + PAUSE_AFTER_MS },
  );
}

test("with reduced motion, playing across impact.updated shows final values with no count-up", async ({ page }) => {
  const watch = watchPage(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openClose(page);
  const { at, payload } = await scriptedImpact(page);
  await playAcross(page, at);
  await expectFinal(page, payload);
  watch.expectClean();
});

test("playing across impact.updated counts up on the player clock and lands on the final values", async ({ page }) => {
  const watch = watchPage(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openClose(page);
  const { at, payload } = await scriptedImpact(page);
  const final = payload.makerShareBps / 100;
  // A count-up needs one player frame inside its 900 ms. On a starved machine a single frame can
  // be longer than that, so the run is tried up to three times; the claim checked is the same.
  let sample: { since: number; shown: number } | null = null;
  for (let attempt = 1; attempt <= 3 && sample === null; attempt++) {
    const { since } = await playAcross(page, at);
    expect(since, "paused this many ms of player time after impact.updated").toBeGreaterThanOrEqual(PAUSE_AFTER_MS);
    // Paused, the number on screen is the count at the paused player time.
    const shown = parseFloat((await numberIn(page, "impact-maker-share").textContent()) ?? "");
    if (shown > 0 && shown < final) sample = { since, shown };
  }
  expect(sample, "a paused frame inside the count-up showed a maker share between 0 and its final value").not.toBeNull();
  expect(sample!.shown, "maker share percent mid-count").toBeGreaterThan(0);
  expect(sample!.shown, "maker share percent mid-count").toBeLessThan(final);
  await page.evaluate(() => window.__cindia!.player.play());
  await page.waitForFunction((t) => window.__cindia!.player.now() >= t, at + 1000);
  await page.evaluate(() => window.__cindia!.player.pause());
  await expectFinal(page, payload);
  watch.expectClean();
});
