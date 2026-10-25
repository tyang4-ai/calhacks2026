// F-watch T5: B15's live feature spec (acceptance 13), run by the orchestrator as
// `npm run gate -- G5 b15-watch tests/features/watch-live.spec.ts`.
// In live mode with b15-watch healthy, the owner presses Scan now and B15 crawls the sandbox market:
// watch-engine reads "Apify crawl of the sandbox market", watch-checked lists every checked result
// with its verdict, each live hit carries L21, every event is valid (checked with the app's own
// validator, and the store warns on an invalid one, which watchPage fails on), and the store's
// sources mark b15-watch live, since the scripted fallback renders the same test IDs (lessons, G5).
// Skips with a named reason when /api/health doesn't list b15 or keys.apify is false, so G3 passes
// before B15 lands.
import { expect, test, type Page } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { CHECKED, ENGINE, L21, L22 } from "../../src/features/watch/strings";
import { watchPage } from "../smoke/lib";
import { WATCH_VIEWPORT, inFrame, openWatch, storeState } from "./watch-lib";

test.use({ viewport: WATCH_VIEWPORT });

/** B15's budget is 60 s (timeoutFor), plus the page's own time on a shared VM. */
const LIVE_TIMEOUT = 75_000;

interface LoggedEvent {
  id: string;
  type: string;
  at: number;
  source: string;
  key?: string;
  payload: Record<string, unknown>;
}

declare global {
  interface Window {
    cindiaWatchLive?: LoggedEvent[];
  }
}

test.beforeEach(async ({ page }) => {
  let routers: string[] = [];
  let apify = false;
  let reason = "";
  try {
    const res = await page.request.get("/api/health", { timeout: 5000 });
    if (res.ok()) {
      const body = (await res.json()) as { routers?: string[]; keys?: { apify?: boolean } };
      routers = body.routers ?? [];
      apify = body.keys?.apify === true;
    } else reason = `/api/health answered ${res.status()}`;
  } catch (err) {
    reason = `/api/health unreachable (${(err as Error).message.split("\n")[0]})`;
  }
  test.skip(!routers.includes("b15"), `B15 live path needs the API with b15 loaded: ${reason || `routers ${JSON.stringify(routers)}`}`);
  test.skip(!apify, "B15 live path needs keys.apify true in /api/health");
});

/** Logs every event the store takes in, through the same store module the app uses (dev server). */
async function startEventLog(page: Page) {
  await page.evaluate(async () => {
    const path = "/src/core/store.ts";
    const mod = (await import(/* @vite-ignore */ path)) as { onEvent(l: (e: LoggedEvent) => void): () => void; getState(): unknown };
    if (mod.getState() !== window.__cindia!.store.getState()) throw new Error("imported a second store instance");
    window.cindiaWatchLive = [];
    mod.onEvent((e) => window.cindiaWatchLive!.push({ id: e.id, type: e.type, at: e.at, source: e.source, key: e.key, payload: JSON.parse(JSON.stringify(e.payload)) }));
  });
}

/** Problems the app's own validator finds in the logged events. */
async function validationProblems(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const path = "/src/core/validate.ts";
    const mod = (await import(/* @vite-ignore */ path)) as { validateEvent(e: unknown): string[] };
    return window.cindiaWatchLive!.flatMap((e) => mod.validateEvent(e).map((p) => `${e.type} ${e.id}: ${p}`));
  });
}

test("13: in live mode Scan now crawls the sandbox market through B15, and every checked result shows with its verdict", async ({ page }) => {
  test.setTimeout(150_000);
  const watch = watchPage(page);
  await openWatch(page);
  await page.getByTestId("demo-mode-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
  await expect(page.locator('[data-testid="demo-mode-toggle"] [data-source-key="b15-watch"][data-healthy="true"]')).toHaveCount(1, { timeout: 15_000 });
  await startEventLog(page);

  await inFrame(page, "watch-scan").click();
  const scanId = (await storeState(page)).watch.latestScanId!;
  expect(scanId).toMatch(/^wsc_user_/);

  // B15's own scan: a live watch.scanned for the person's scan, from the Apify crawl.
  await expect
    .poll(() => page.evaluate(() => window.cindiaWatchLive!.filter((e) => e.type === "watch.scanned").map((e) => e.source)), { timeout: LIVE_TIMEOUT })
    .toEqual(["live"]);
  const events = await page.evaluate(() => window.cindiaWatchLive!);
  const scanned = events.find((e) => e.type === "watch.scanned")!.payload as unknown as Payloads["watch.scanned"];
  expect(scanned.scanId).toBe(scanId);
  expect(scanned.engine).toBe("apify");
  await expect(inFrame(page, "watch-engine")).toHaveText(ENGINE.apify.en);

  // Every checked result, in the order checked, with its verdict.
  const checked = inFrame(page, "watch-checked");
  await expect(checked.getByTestId(/^watch-checked-\d+$/)).toHaveCount(scanned.results.length);
  for (const [i, r] of scanned.results.entries()) {
    const row = checked.getByTestId(`watch-checked-${i + 1}`);
    await expect(row).toHaveAttribute("data-verdict", r.verdict);
    await expect(row.locator('[data-role="title"]')).toHaveText(r.title);
    if (r.verdict === "claim_only") await expect(row.getByTestId(`watch-claim-only-${i + 1}`)).toHaveText(L22.en);
    if (r.verdict === "possible_copy") await expect(row.locator('[data-role="verdict"]')).toHaveText(CHECKED.possibleCopy.en);
    if (r.verdict === "neither") await expect(row.locator('[data-role="verdict"]')).toHaveText(CHECKED.neither.en);
  }

  // Each live hit is on the scan, carries L21, and never takes cft_01.
  const hits = events.filter((e) => e.type === "counterfeit.flagged");
  expect(hits.length).toBe(scanned.results.filter((r) => r.verdict === "possible_copy").length);
  for (const h of hits) {
    expect(h.source).toBe("live");
    const p = h.payload as unknown as Payloads["counterfeit.flagged"];
    expect(p.scanId).toBe(scanId);
    expect(p.cftId).not.toBe("cft_01");
    await expect(inFrame(page, `watch-live-${p.cftId}`)).toHaveText(L21.en);
  }

  expect(await validationProblems(page)).toEqual([]);
  expect((await storeState(page)).sources["b15-watch"]).toBe("live");
  watch.expectClean();
});
