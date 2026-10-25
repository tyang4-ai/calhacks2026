// F-scenario, live path: the B05 upgrade answered in a browser. The other scenario specs prove the
// scripted answer and the request; this one proves the server's answer reaches the panel, since a
// failed live call falls back to the scripted sample and renders the same rows.
// Needs the API on 8000 with b05 and b01 loaded (through the dev server's /api proxy); skips with a
// reason when /api/health doesn't list them. Switches to live mode with demo-mode-toggle and waits
// for b05-scenario's health dot before any request. The player is paused and seeked before any
// click, because the registry's answers drop on an epoch change.
import { expect, test, type Page } from "@playwright/test";
import { scenarioId } from "../../src/mock/index";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";
import { SELL_VIEWPORT, storeModuleUrl } from "./sell-views-lib";

// M-desktop: the month view on /sell/month at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

interface LoggedEvent {
  type: string;
  source: string;
  key?: string;
  payload: { recordIds?: string[]; deltaCents?: number; expectedCents?: number; actualCents?: number; recordId?: string };
}

declare global {
  interface Window {
    cindiaLiveLog?: LoggedEvent[];
  }
}

const ANSWER_TIMEOUT = 10000;
const panel = (page: Page) => page.getByTestId("scenario-panel");
const results = (page: Page) => panel(page).getByTestId("scenario-results");
const fileInput = (page: Page) => panel(page).getByTestId("scenario-dropzone").locator("input[type=file]");

// A judge's own statement, in the CSV format of tests/server/b05_statement.csv: one fair line at the
// contract's 40%, one at 45%. Owed at 40%: 12000 + 6000 = 18000; the statement pays 17500.
const JUDGE_CSV =
  "date,orderId,pieceId,saleCents,commissionBps,netCents\n" +
  "2026-10-12,judge_ord_1,pc_02,20000,4000,12000\n" +
  "2026-10-14,judge_ord_2,pc_04,10000,4500,5500\n";
const BAD_CSV = "date,orderId,pieceId,saleCents,commissionBps,netCents\n2026-10-12,j1,pc_02,twelve,4000,7200\n";

test.beforeEach(async ({ page }) => {
  let routers: string[] = [];
  let reason = "";
  try {
    const res = await page.request.get("/api/health", { timeout: 5000 });
    if (res.ok()) routers = ((await res.json()) as { routers?: string[] }).routers ?? [];
    else reason = `/api/health answered ${res.status()}`;
  } catch (err) {
    reason = `/api/health unreachable (${(err as Error).message.split("\n")[0]})`;
  }
  test.skip(!routers.includes("b05") || !routers.includes("b01"), `B05 live path needs the API with b05 and b01 loaded: ${reason || `routers ${JSON.stringify(routers)}`}`);
});

/** Opens the month view paused at the end, switches to live mode and waits for b05's health. */
async function openLive(page: Page) {
  await page.goto("/sell/month");
  await waitForHooks(page);
  await waitForSlots(page);
  await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(p.durationMs());
  });
  await expect(panel(page).getByTestId("scenario-use-sample")).toBeVisible();
  await page.getByTestId("demo-mode-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
  await expect(page.locator('[data-testid="demo-mode-toggle"] [data-source-key="b05-scenario"][data-healthy="true"]')).toHaveCount(1, {
    timeout: ANSWER_TIMEOUT,
  });
  // The page's own store module, even after the dev server hot-updated it (sell-views-lib).
  const storeUrl = await storeModuleUrl(page);
  await page.evaluate(async (path) => {
    const mod = (await import(/* @vite-ignore */ path)) as { onEvent(l: (e: LoggedEvent) => void): () => void; getState(): unknown };
    if (mod.getState() !== window.__cindia!.store.getState()) throw new Error("imported a second store instance");
    window.cindiaLiveLog = [];
    mod.onEvent((e) => window.cindiaLiveLog!.push({ type: e.type, source: e.source, key: e.key, payload: { ...e.payload } }));
  }, storeUrl);
}

const b05Source = (page: Page) => page.evaluate(() => window.__cindia!.store.getState().sources["b05-scenario"]);
const logged = (page: Page, type: string) => page.evaluate((t) => window.cindiaLiveLog!.filter((e) => e.type === t), type);
/**
 * The flag.raised events in the log except B16's: with b16-bank-books live, B16 repeats the month's
 * own catch (flg_01) as a live twin keyed b16-bank-books (events.md, live twins). That twin is the
 * month's, never the scenario's, so it is the only flag set aside; every other flag still counts.
 */
const scenarioFlags = (page: Page) => logged(page, "flag.raised").then((fs) => fs.filter((f) => f.key !== "b16-bank-books"));

test("live: the sample statement is answered by the server, the badge goes and the flag is $8.50", async ({ page }) => {
  const watch = watchPage(page);
  await openLive(page);
  await expect(panel(page).getByTestId("simulated-badge")).toBeVisible();

  await panel(page).getByTestId("scenario-use-sample").click();
  await expect.poll(() => b05Source(page), { timeout: ANSWER_TIMEOUT }).toBe("live");
  await expect(panel(page).getByTestId("simulated-badge")).toHaveCount(0);
  await expect(results(page)).toBeVisible({ timeout: ANSWER_TIMEOUT });
  await expect(panel(page).getByTestId("scenario-flag")).toHaveCount(1, { timeout: ANSWER_TIMEOUT });
  await expect(panel(page).getByTestId("scenario-flag")).toContainText("$8.50");
  await expect(results(page).locator('[data-record-id="scn_stm_01"]')).toHaveCount(1);
  // The panel's flag and matches came from the live source, never the scripted fallback.
  const flags = await scenarioFlags(page);
  expect(flags.length).toBeGreaterThan(0);
  expect(flags.every((f) => f.source === "live" && f.key === "b05-scenario")).toBe(true);
  expect(flags[0].payload.deltaCents).toBe(850);
  expect((await logged(page, "match.made")).every((m) => m.source === "live")).toBe(true);
  await expect(panel(page).getByTestId("scenario-note")).toHaveCount(0);
  watch.expectClean();
});

test("live: a judge's own CSV comes back as a stm_scn_ statement with its computed flag", async ({ page }) => {
  const watch = watchPage(page);
  await openLive(page);

  await fileInput(page).setInputFiles({ name: "judge-gallery.csv", mimeType: "text/csv", buffer: Buffer.from(JUDGE_CSV) });
  await expect(panel(page).getByTestId("scenario-file")).toHaveText("judge-gallery.csv");
  await expect.poll(() => b05Source(page), { timeout: ANSWER_TIMEOUT }).toBe("live");

  const stmRow = results(page).locator('[data-record-id^="stm_scn_"]');
  await expect(stmRow).toHaveCount(1, { timeout: ANSWER_TIMEOUT });
  const sid = await stmRow.getAttribute("data-record-id");
  expect(sid).toMatch(/^stm_scn_\d+$/);
  await expect(results(page).locator("tr", { has: page.locator(`[data-record-id="${sid}"]`) })).toHaveAttribute("data-state", "flagged");

  const flags = (await logged(page, "flag.raised")).filter((f) => f.payload.recordIds?.includes(sid!));
  expect(flags).toHaveLength(1);
  expect(flags[0].source).toBe("live");
  expect([flags[0].payload.expectedCents, flags[0].payload.actualCents, flags[0].payload.deltaCents]).toEqual([18000, 17500, 500]);
  const matches = (await logged(page, "match.made")).filter((m) => m.payload.recordIds?.includes(sid!));
  expect(matches.map((m) => m.payload.recordIds)).toEqual([[sid, "judge_ord_1"]]);

  await expect(panel(page).getByTestId("scenario-flag")).toHaveCount(1);
  await expect(panel(page).getByTestId("scenario-flag")).toContainText("$5.00");
  // The server answered, so no fallback note and no Simulated badge.
  await expect(panel(page).getByTestId("scenario-note")).toHaveCount(0);
  await expect(panel(page).getByTestId("simulated-badge")).toHaveCount(0);
  const loads = (await logged(page, "scenario.loaded")).filter((e) => e.source === "live");
  expect(loads).toHaveLength(1);
  expect(loads[0].payload).toMatchObject({ scenarioId });
  watch.expectClean();
});

test("live: a bad file gets the server's 400, a readable note and no crash", async ({ page }) => {
  const watch = watchPage(page);
  const answers: number[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/b05/scenario")) answers.push(r.status());
  });
  await openLive(page);

  await fileInput(page).setInputFiles({ name: "broken.csv", mimeType: "text/csv", buffer: Buffer.from(BAD_CSV) });
  await expect(panel(page).getByTestId("scenario-file")).toHaveText("broken.csv");
  await expect.poll(() => answers, { timeout: ANSWER_TIMEOUT }).toEqual([400]);

  // The registry plays the sample's scripted answer, and the panel says so in plain words.
  const note = panel(page).getByTestId("scenario-note");
  await expect(note).toBeVisible({ timeout: ANSWER_TIMEOUT });
  await expect(note).toContainText(/\S{3,}/);
  await expect(results(page)).toBeVisible();
  expect(await b05Source(page)).toBe("scripted");
  await expect(panel(page).getByTestId("simulated-badge")).toBeVisible();
  // The note shows while the scripted answer is still playing, so wait for its flag. A later
  // scripted event keyed b05-scenario would otherwise flip the source back after the sample's
  // live answer.
  await expect.poll(() => scenarioFlags(page).then((f) => f.length), { timeout: ANSWER_TIMEOUT }).toBeGreaterThan(0);
  expect(await scenarioFlags(page).then((f) => f.every((e) => e.source === "scripted"))).toBe(true);

  // The panel still works: the sample still goes live afterwards.
  await panel(page).getByTestId("scenario-use-sample").click();
  await expect.poll(() => b05Source(page), { timeout: ANSWER_TIMEOUT }).toBe("live");

  // The 400 (as a response and as Chromium's own console line) and the registry's fallback warning
  // are expected here; nothing else may fail.
  const expected = [/HTTP 400: .*\/api\/b05\/scenario/, /^console\.error: Failed to load resource: .*status of 400/, /^console\.warn: \[cindia\].*b05/i];
  const unexpected = watch.errors.filter((e) => !expected.some((re) => re.test(e)));
  expect(unexpected).toEqual([]);
  expect(watch.errors.some((e) => e.startsWith("pageerror"))).toBe(false);
  expect(watch.remote).toEqual([]);
});
