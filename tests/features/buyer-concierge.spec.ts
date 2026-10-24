// F-buyer T1: the concierge input and the curated grid. Acceptance 1, 7, 8 (ask step) and 9.
// Expected values come from the demo timeline and the store, not typed in here.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";

const D01_ASK_END = 4000;

interface SeenEvent {
  type: string;
  source: string;
  payload: Record<string, unknown>;
}

declare global {
  interface Window {
    cindiaT1Events?: SeenEvent[];
  }
}

async function openAt(page: Page, ms: number) {
  await page.goto("/buyer");
  await waitForSlots(page);
  await waitForHooks(page);
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, ms);
}

/**
 * Records every event the store applies, with its source. On the dev server the store module is
 * reachable at its source URL, the same instance the app uses. Returns false where it isn't (a
 * production build), and the tests then check the store state alone.
 */
async function recordEvents(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    try {
      const url: string = "/src/core/store.ts";
      const mod = (await import(/* @vite-ignore */ url)) as {
        onEvent?: (l: (e: SeenEvent) => void) => () => void;
      };
      if (typeof mod.onEvent !== "function") return false;
      window.cindiaT1Events = [];
      mod.onEvent((e) => window.cindiaT1Events!.push({ type: e.type, source: e.source, payload: e.payload }));
      return true;
    } catch {
      return false;
    }
  });
}

const seen = (page: Page) => page.evaluate(() => window.cindiaT1Events ?? []);

/** The demo timeline's own concierge request and answer. */
async function timelineConcierge(page: Page) {
  return page.evaluate(() => {
    const events = window.__cindia!.player.getTimeline()!.events;
    const asked = events.find((e) => e.type === "concierge.asked")!.payload as { query: string };
    const answered = events.find((e) => e.type === "concierge.answered")!.payload as {
      pieceIds: string[];
      reasons: Record<string, { en: string; zh: string }>;
    };
    return { query: asked.query, pieceIds: answered.pieceIds, reasons: answered.reasons };
  });
}

const resultIds = (page: Page) =>
  page
    .getByTestId("buyer-concierge-results")
    .locator('[data-testid^="buyer-result-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));

test.describe("buyer concierge @T1", () => {
  test("end of d01-ask shows the request and three curated pieces with reasons @T1", async ({ page }) => {
    const watch = watchPage(page);
    await openAt(page, D01_ASK_END - 300);
    const tl = await timelineConcierge(page);
    expect(tl.query).toBe("a gift under $200 for my mom, she loves peonies");
    expect(tl.pieceIds).toEqual(["pc_01", "pc_07", "pc_11"]);

    await expect(page.getByTestId("buyer-concierge-input")).toHaveValue(tl.query);
    const results = page.getByTestId("buyer-concierge-results").locator('[data-testid^="buyer-result-"]');
    await expect(results).toHaveCount(3);
    expect(await resultIds(page)).toEqual(tl.pieceIds.map((id) => `buyer-result-${id}`));
    for (const id of tl.pieceIds) {
      const row = page.getByTestId(`buyer-result-${id}`);
      await expect(row).toContainText(tl.reasons[id].en);
      await expect(row).toContainText("$");
      await expect(row.locator("img")).toHaveCount(1);
    }
    watch.expectClean();
  });

  test("the ask step fits the phone with nothing scrolled out of view @T1", async ({ page }) => {
    await openAt(page, D01_ASK_END - 300);
    const phone = await page.getByTestId("frame-buyer").boundingBox();
    expect(phone).toBeTruthy();
    for (const id of ["buyer-concierge-input", "buyer-result-pc_01", "buyer-result-pc_07", "buyer-result-pc_11"]) {
      const el = page.getByTestId(id);
      await expect(el, `${id} in view`).toBeInViewport({ ratio: 1 });
      const box = await el.boundingBox();
      expect(box!.y, `${id} top inside the phone`).toBeGreaterThanOrEqual(phone!.y - 1);
      expect(box!.y + box!.height, `${id} bottom inside the phone`).toBeLessThanOrEqual(phone!.y + phone!.height + 1);
    }
    await page.getByTestId("frame-buyer").screenshot({ path: "artifacts/screens/buyer-concierge-d01-ask.png" });
  });

  test("tapping a curated piece emits a user piece.opened @T1", async ({ page }) => {
    const watch = watchPage(page);
    await openAt(page, D01_ASK_END - 300);
    const recording = await recordEvents(page);
    // The dev server always serves the store module, so there the source check must run.
    if (new URL(page.url()).port === "5173") expect(recording, "event recorder attached").toBe(true);
    await page.getByTestId("buyer-result-pc_07").click();

    await expect
      .poll(() => page.evaluate(() => (window.__cindia!.store.getState().buyer as { openPieceId: string | null }).openPieceId))
      .toBe("pc_07");
    if (recording) {
      const opened = (await seen(page)).filter((e) => e.type === "piece.opened");
      expect(opened).toEqual([{ type: "piece.opened", source: "user", payload: { pieceId: "pc_07" } }]);
    }
    // The story card is T2's component; the lead's flow spec covers its contents.
    const card = page.getByTestId("buyer-story-card");
    if ((await card.count()) > 0) await expect(card).toBeVisible();
    watch.expectClean();
  });

  test("a typed request is asked by the user and answered with the curated set @T1", async ({ page }) => {
    const watch = watchPage(page);
    // Before the timeline's answer (1800 ms), with the player paused so it never arrives.
    await openAt(page, 1000);
    const tl = await timelineConcierge(page);
    await expect(page.getByTestId("buyer-concierge-results")).toHaveCount(0);
    const recording = await recordEvents(page);
    // The dev server always serves the store module, so there the source check must run.
    if (new URL(page.url()).port === "5173") expect(recording, "event recorder attached").toBe(true);

    const typed = "a silk gift for my sister who likes blue";
    const input = page.getByTestId("buyer-concierge-input");
    await input.fill(typed);
    await expect(input).toHaveValue(typed);
    await input.press("Enter");

    const buyer = () =>
      page.evaluate(() => window.__cindia!.store.getState().buyer as { conciergeQuery: string | null; concierge: { query: string } | null });
    await expect.poll(async () => (await buyer()).conciergeQuery).toBe(typed);
    await expect(input).toHaveValue(typed);
    if (recording) {
      const asked = (await seen(page)).filter((e) => e.type === "concierge.asked");
      expect(asked).toEqual([{ type: "concierge.asked", source: "user", payload: { query: typed, lang: "en" } }]);
    }

    await expect(page.getByTestId("buyer-concierge-results")).toBeVisible({ timeout: 3000 });
    expect(await resultIds(page)).toEqual(tl.pieceIds.map((id) => `buyer-result-${id}`));
    expect((await buyer()).concierge?.query).toBe(typed);
    watch.expectClean();
  });
});
