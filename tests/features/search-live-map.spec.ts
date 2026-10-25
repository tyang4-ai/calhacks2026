// F-search acceptance 17, B11's live feature spec: in live mode with b11-embed live, a person's own
// search gets a live search.mapped for that query's queryId, from the trained model through B12's
// adapter, and every event is valid. Run as
// `npm run gate -- G5 b11-embed tests/features/search-live-map.spec.ts`.
// It skips with a named reason while /api/health doesn't list b11 and b12 or services.model is
// false, so G3 passes before B11 and B12 land. The tour stays scripted: this is a person's request.
import { expect, test, type Page } from "@playwright/test";
import { openPage, slot, userQueries } from "./search-lib";

interface Recorded {
  type: string;
  source: string;
  key?: string;
  queryId?: string;
  surpriseId?: string;
  pieceId?: string;
  modelId?: string;
  approx?: boolean;
  method?: string;
  points?: number;
}

declare global {
  interface Window {
    searchLiveLog?: Recorded[];
  }
}

const LIVE_TIMEOUT = 30_000;
const HEALTH_TIMEOUT = 90_000;

test.beforeEach(async ({ page }) => {
  let routers: string[] = [];
  let model = false;
  let reason = "";
  try {
    const res = await page.request.get("/api/health", { timeout: 5000 });
    if (res.ok()) {
      const body = (await res.json()) as { routers?: string[]; services?: { model?: boolean } };
      routers = body.routers ?? [];
      model = body.services?.model === true;
    } else reason = `/api/health answered ${res.status()}`;
  } catch (err) {
    reason = `/api/health unreachable (${(err as Error).message.split("\n")[0]})`;
  }
  const missing = ["b11", "b12"].filter((r) => !routers.includes(r));
  test.skip(
    Boolean(reason) || missing.length > 0 || !model,
    `B11's live map needs the API with b11 and b12 loaded and services.model true: ${reason || `routers ${JSON.stringify(routers)}, services.model ${model}`}`,
  );
});

/** Records every event with the fields this spec checks, through the dev server's own store module. */
async function recordEvents(page: Page) {
  await page.evaluate(async () => {
    const path = "/src/core/store.ts";
    const mod = (await import(/* @vite-ignore */ path)) as {
      onEvent(l: (e: { type: string; source: string; key?: string; payload: Record<string, unknown> }) => void): () => void;
      getState(): unknown;
    };
    if (mod.getState() !== window.__cindia!.store.getState()) throw new Error("imported a second store instance");
    window.searchLiveLog = [];
    mod.onEvent((e) => {
      const p = e.payload ?? {};
      window.searchLiveLog!.push({
        type: e.type,
        source: e.source,
        key: e.key,
        queryId: p.queryId as string | undefined,
        surpriseId: p.surpriseId as string | undefined,
        pieceId: p.pieceId as string | undefined,
        modelId: p.modelId as string | undefined,
        approx: p.approx as boolean | undefined,
        method: p.method as string | undefined,
        points: Array.isArray(p.points) ? p.points.length : undefined,
      });
    });
  });
}

/** Switches to live mode and waits until the given keys' adapters are healthy. */
async function goLive(page: Page, keys: string[]) {
  await page.getByTestId("demo-mode-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
  for (const key of keys) {
    await expect(page.locator(`[data-testid="demo-mode-toggle"] [data-source-key="${key}"][data-healthy="true"]`)).toHaveCount(1, {
      timeout: HEALTH_TIMEOUT,
    });
  }
}

test("17: a person's own search gets a live search.mapped from the trained model, and every event is valid", async ({ page }) => {
  test.setTimeout(180_000);
  const invalid: string[] = [];
  page.on("console", (msg) => {
    if (/\[cindia\] invalid event/.test(msg.text())) invalid.push(msg.text());
  });
  await openPage(page, "/shop");
  await goLive(page, ["b12-search", "b11-embed"]);
  await recordEvents(page);

  const home = slot(page, "shop.home.main");
  await home.getByTestId("search-input").fill("a calm blue clay jar for a quiet shelf");
  await home.getByTestId("search-submit").click();
  await expect.poll(async () => (await userQueries(page)).length).toBe(1);
  const [query] = await userQueries(page);

  await expect
    .poll(() => page.evaluate((id) => (window.searchLiveLog ?? []).filter((e) => e.type === "search.mapped" && e.queryId === id && e.source === "live").length, query.queryId), {
      timeout: LIVE_TIMEOUT,
    })
    .toBeGreaterThan(0);
  const mapped = await page.evaluate((id) => (window.searchLiveLog ?? []).find((e) => e.type === "search.mapped" && e.queryId === id && e.source === "live")!, query.queryId);
  expect(mapped.modelId, "the map names the model that made it").toBeTruthy();
  expect(mapped.method).toBe("pca");
  expect(mapped.approx, "a live map is the model's, never the scripted approximation").not.toBe(true);
  expect(mapped.points ?? 0).toBeGreaterThan(0);
  const stored = await page.evaluate((id) => {
    const s = window.__cindia!.store.getState() as unknown as { search: { maps: Record<string, { modelId: string }> } };
    return s.search.maps[id] ?? null;
  }, query.queryId);
  expect(stored?.modelId).toBe(mapped.modelId);
  expect(invalid, "every event is valid").toEqual([]);
});
