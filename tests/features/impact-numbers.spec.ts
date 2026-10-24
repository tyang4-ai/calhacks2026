// F-impact T1: the three impact numbers (acceptance 1 to 5). Expected values come from the
// timeline's impact.updated payload, never typed in.
import { expect, test, type Page } from "@playwright/test";
import { formatBps } from "../../src/features/impact/formatBps";
import { UI } from "../../src/features/impact/strings";
import { waitForHooks, watchPage } from "../smoke/lib";

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
  await page.goto("/studio/close");
  await waitForHooks(page);
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

/**
 * Plays (at 1x) across the event from 200 ms before it, and pauses on the first player frame at
 * or past PAUSE_AFTER_MS after it. Playing, not seek(), so the count-up runs. Returns how far past
 * the event the clock stopped.
 */
async function playAcross(page: Page, at: number): Promise<number> {
  await seekTo(page, at - 200);
  return page.evaluate(
    ({ eventAt, pauseAt }) =>
      new Promise<number>((resolve) => {
        // subscribe() and setSpeed() are on the real Player (src/core/player.ts) but not in the
        // narrower window.__cindia type in tests/smoke/lib.ts.
        const p = window.__cindia!.player as NonNullable<typeof window.__cindia>["player"] & {
          subscribe(listener: () => void): () => void;
          setSpeed(x: 1 | 2 | 4 | 8): void;
        };
        let done = false;
        const off = p.subscribe(() => {
          if (done || !p.isPlaying() || p.now() < pauseAt) return;
          done = true;
          off();
          p.pause();
          resolve(p.now() - eventAt);
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
  const since = await playAcross(page, at);
  // The pause must land inside the 900 ms count-up, or the mid-count check below means nothing.
  expect(since, "paused this many ms of player time after impact.updated").toBeGreaterThanOrEqual(PAUSE_AFTER_MS);
  expect(since, "paused this many ms of player time after impact.updated").toBeLessThan(900);
  // Paused mid-count, the maker share is strictly between the start (0) and its final value.
  const shown = parseFloat((await numberIn(page, "impact-maker-share").textContent()) ?? "");
  expect(shown, "maker share percent mid-count").toBeGreaterThan(0);
  expect(shown, "maker share percent mid-count").toBeLessThan(payload.makerShareBps / 100);
  await page.evaluate(() => window.__cindia!.player.play());
  await page.waitForFunction((t) => window.__cindia!.player.now() >= t, at + 1000);
  await page.evaluate(() => window.__cindia!.player.pause());
  await expectFinal(page, payload);
  watch.expectClean();
});
