// F-scenario T2: "Use the sample statement" and the results. Clicking the sample emits
// scenario.loaded (source "user") with the sample's file name and scn_ record IDs; the registry
// answers 1.2 s later in real time with the sample's records, matches and flag, which
// scenario-results and scenario-flag show. The answer is a wall-clock timer that drops itself when
// the player's epoch changes, so the player is paused and seeked before any click, never after.
// Selects by test ID only (rows are found by the data-record-id inside each row).
import { expect, test, type Page } from "@playwright/test";
import { sampleFileName, sampleRecordIds, scenarioCsv, scenarioId, scenarioReplies } from "../../src/mock/index";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";
import { hideB05 } from "./scenario-lib";
import { SELL_VIEWPORT, boxOf, expectInsideFrame, expectReadableText, storeModuleUrl } from "./sell-views-lib";

// M-desktop: the month view on /sell/month at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

interface LoggedEvent {
  type: string;
  source: string;
  key?: string;
  payload: { scenarioId?: string; fileName?: string; recordIds?: string[]; content?: string };
}

declare global {
  interface Window {
    cindiaScenarioLog?: LoggedEvent[];
  }
}

/** Playwright's default expect timeout (B1-27): arrival is never held to a tighter window. */
const ANSWER_TIMEOUT = 10000;
const panel = (page: Page) => page.getByTestId("scenario-panel");
const results = (page: Page) => panel(page).getByTestId("scenario-results");

const replyRecords = scenarioReplies.filter((e) => e.type === "record.arrived").map((e) => (e.payload as { recordId: string }).recordId);
const replyMatches = scenarioReplies.filter((e) => e.type === "match.made").map((e) => e.payload as { recordIds: string[] });
const replyFlags = scenarioReplies.filter((e) => e.type === "flag.raised").map((e) => e.payload as { recordIds: string[] });

function expectedState(recordId: string): "matched" | "flagged" | "pending" {
  if (replyFlags.some((f) => f.recordIds.includes(recordId))) return "flagged";
  if (replyMatches.some((m) => m.recordIds.includes(recordId))) return "matched";
  return "pending";
}

/** Opens the month view with the player paused at the end of its timeline. */
async function openAtEnd(page: Page) {
  await page.goto("/sell/month");
  await waitForHooks(page);
  await waitForSlots(page);
  await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(p.durationMs());
  });
  await expect(panel(page).getByTestId("scenario-use-sample")).toBeVisible();
}

/** Logs every event the store takes in, through the same store module the app uses (dev server). */
async function startEventLog(page: Page) {
  // The page's own store module, even after the dev server hot-updated it (sell-views-lib).
  const storeUrl = await storeModuleUrl(page);
  await page.evaluate(async (path) => {
    const mod = (await import(/* @vite-ignore */ path)) as {
      onEvent(l: (e: LoggedEvent) => void): () => void;
      getState(): unknown;
    };
    if (mod.getState() !== window.__cindia!.store.getState()) throw new Error("imported a second store instance");
    window.cindiaScenarioLog = [];
    mod.onEvent((e) =>
      window.cindiaScenarioLog!.push({
        type: e.type,
        source: e.source,
        key: e.key,
        payload: { scenarioId: e.payload.scenarioId, fileName: e.payload.fileName, recordIds: e.payload.recordIds, content: e.payload.content },
      }),
    );
  }, storeUrl);
}

/** The parts of the state the sample must never change. */
const septemberSlices = (page: Page) =>
  page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      month: { closed: unknown; ledgerEntryIds: string[]; monthId: string | null };
      proof: unknown;
      close: unknown;
    };
    return JSON.stringify({ closed: s.month.closed, ledger: s.month.ledgerEntryIds, monthId: s.month.monthId, proof: s.proof, close: s.close });
  });

async function expectAllRows(page: Page) {
  await expect(results(page)).toBeVisible({ timeout: ANSWER_TIMEOUT });
  for (const id of replyRecords) {
    await expect(results(page).locator(`[data-record-id="${id}"]`)).toHaveCount(1, { timeout: ANSWER_TIMEOUT });
  }
  await expect(results(page).locator("[data-record-id]")).toHaveCount(replyRecords.length);
}

test("the month view shows the sample button and the Simulated badge in scripted mode", async ({ page }) => {
  const watch = watchPage(page);
  await openAtEnd(page);
  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  expect(sources["b05-scenario"]).toBe("scripted");
  await expect(panel(page).getByTestId("simulated-badge")).toBeVisible();
  await expect(results(page)).toHaveCount(0);
  watch.expectClean();
});

test("using the sample emits a user scenario.loaded, then lists its records, matches and flag", async ({ page }) => {
  const watch = watchPage(page);
  await openAtEnd(page);
  await startEventLog(page);

  const started = Date.now();
  await panel(page).getByTestId("scenario-use-sample").click();

  const load = await page.evaluate(
    (id) => (window.__cindia!.store.getState() as unknown as { scenario: { loads: Record<string, { fileName: string; recordIds?: string[] }> } }).scenario.loads[id],
    scenarioId,
  );
  expect(load.fileName).toBe(sampleFileName);
  expect(load.recordIds).toEqual(sampleRecordIds);
  const log = await page.evaluate(() => window.cindiaScenarioLog!);
  const req = log.find((e) => e.type === "scenario.loaded");
  expect(req?.source).toBe("user");
  expect(req?.key).toBeUndefined();
  expect(req?.payload.fileName).toBe(sampleFileName);
  expect(req?.payload.recordIds).toEqual(sampleRecordIds);

  await expectAllRows(page);
  expect(Date.now() - started).toBeGreaterThanOrEqual(1000);
  await expect(panel(page).getByTestId("scenario-flag")).toBeVisible({ timeout: ANSWER_TIMEOUT });

  for (const id of replyRecords) {
    await expect(results(page).locator("tr", { has: page.locator(`[data-record-id="${id}"]`) })).toHaveAttribute("data-state", expectedState(id));
  }
  // Every row has its amount from the mock.
  await expect(results(page).locator("tbody tr .c-money")).toHaveCount(replyRecords.length);
  // Scripted mode with the sample: no fallback note from the results.
  await expect(panel(page).getByTestId("scenario-note")).toHaveCount(0);
  watch.expectClean();
});

test("the drop zone, the sample's results and its flag fit the month view's right third, inside the frame", async ({ page }) => {
  const watch = watchPage(page);
  await openAtEnd(page);
  await expectInsideFrame(page, ["scenario-dropzone", "scenario-use-sample"]);
  await panel(page).getByTestId("scenario-use-sample").click();
  await expectAllRows(page);
  await expect(panel(page).getByTestId("scenario-flag")).toBeVisible({ timeout: ANSWER_TIMEOUT });
  // The panel fills its third and no more; the results scroll inside it, the flag first.
  await expectInsideFrame(page, ["scenario-panel", "scenario-dropzone", "scenario-use-sample"]);
  // The G3 screen rule: no text under 14 px, none cut with an ellipsis or clipped, at 1440 by 900.
  await expectReadableText(page, '[data-slot="studio.month.side"]');
  const panelBox = (await boxOf(page, "scenario-panel"))!;
  const flagBox = (await boxOf(page, "scenario-flag"))!;
  expect(flagBox.y, "the flag starts inside the panel").toBeGreaterThanOrEqual(panelBox.y);
  expect(flagBox.y + 48, "the flag's reason line shows without a scroll").toBeLessThanOrEqual(panelBox.y + panelBox.height);
  // The panel and its results keep to the side slot: the right third, beside reconcile.
  const side = (await page.locator('[data-slot="studio.month.side"]').boundingBox())!;
  const main = (await page.locator('[data-slot="studio.month.main"]').boundingBox())!;
  expect(side.x).toBeGreaterThan(main.x + main.width - 1);
  for (const id of ["scenario-panel", "scenario-results", "scenario-flag"]) {
    const b = (await boxOf(page, id))!;
    expect(b.x, `${id} starts inside the right third`).toBeGreaterThanOrEqual(side.x - 1);
    expect(b.x + b.width, `${id} ends inside the right third`).toBeLessThanOrEqual(side.x + side.width + 1);
  }
  // No sideways scroll inside the results.
  expect(await results(page).evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  watch.expectClean();
});

test("using the sample twice shows each record once", async ({ page }) => {
  const watch = watchPage(page);
  await openAtEnd(page);
  await startEventLog(page);
  await panel(page).getByTestId("scenario-use-sample").click();
  await expectAllRows(page);
  await expect(panel(page).getByTestId("scenario-flag")).toBeVisible({ timeout: ANSWER_TIMEOUT });
  await panel(page).getByTestId("scenario-use-sample").click();
  // The second answer re-delivers every reply, the flag last; wait until it has.
  await expect
    .poll(() => page.evaluate(() => window.cindiaScenarioLog!.filter((e) => e.type === "flag.raised").length), { timeout: ANSWER_TIMEOUT })
    .toBe(2 * replyFlags.length);
  await expectAllRows(page);
  await expect(panel(page).getByTestId("scenario-flag")).toHaveCount(1);
  watch.expectClean();
});

test("the sample never changes September's totals, the proof score or the close", async ({ page }) => {
  const watch = watchPage(page);
  await openAtEnd(page);
  const before = await septemberSlices(page);
  await panel(page).getByTestId("scenario-use-sample").click();
  await expectAllRows(page);
  await expect(panel(page).getByTestId("scenario-flag")).toBeVisible({ timeout: ANSWER_TIMEOUT });
  expect(await septemberSlices(page)).toBe(before);
  watch.expectClean();
});

test("live mode: an own file answered by the scripted fallback says these are the sample's results", async ({ page }) => {
  const watch = watchPage(page);
  await openAtEnd(page);
  // The fallback is what this case tests, so b05 is hidden from health (scenario-live.spec.ts tests the live answer).
  await hideB05(page);
  await page.getByTestId("demo-mode-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
  await page.evaluate(
    ({ id, content }) => {
      window.__cindia!.emit({
        id: "evt_user_9901",
        type: "scenario.loaded",
        at: Math.round(window.__cindia!.player.now()),
        source: "user",
        payload: { scenarioId: id, fileName: "judge-statement.csv", recordIds: [], content },
      });
    },
    { id: scenarioId, content: scenarioCsv },
  );
  await expectAllRows(page);
  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  expect(sources["b05-scenario"]).toBe("scripted");
  await expect(panel(page).getByTestId("scenario-note")).toBeVisible({ timeout: ANSWER_TIMEOUT });
  // Live mode may call the local API for other upgrades; only requests beyond localhost count here.
  expect(watch.remote).toEqual([]);
});
