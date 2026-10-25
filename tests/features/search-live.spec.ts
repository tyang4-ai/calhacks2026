// F-search acceptance 18, B12's live feature spec: in live mode with b12-search live, a person's own
// search gets a live search.answered and search.mapped, and their Surprise me a live surprise.drawn;
// search-results and search-surprise-result render them, and every event is valid. Run as
// `npm run gate -- G5 b12-search tests/features/search-live.spec.ts`.
// It skips with a named reason while /api/health doesn't list b12 or services.model is false, so G3
// passes before B12 lands. The tour stays scripted: these are a person's own requests.
import { expect, test, type Page } from "@playwright/test";
import { pieces } from "../../src/mock/index";
import { openPage, searchState, slot, userQueries } from "./search-lib";

interface Recorded {
  type: string;
  source: string;
  key?: string;
  queryId?: string;
  surpriseId?: string;
  pieceId?: string;
  engine?: string;
}

declare global {
  interface Window {
    searchLiveLog2?: Recorded[];
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
  test.skip(
    Boolean(reason) || !routers.includes("b12") || !model,
    `B12's live search needs the API with b12 loaded and services.model true: ${reason || `routers ${JSON.stringify(routers)}, services.model ${model}`}`,
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
    window.searchLiveLog2 = [];
    mod.onEvent((e) => {
      const p = e.payload ?? {};
      window.searchLiveLog2!.push({
        type: e.type,
        source: e.source,
        key: e.key,
        queryId: p.queryId as string | undefined,
        surpriseId: p.surpriseId as string | undefined,
        pieceId: p.pieceId as string | undefined,
        engine: p.engine as string | undefined,
      });
    });
  });
}

const liveCount = (page: Page, type: string, field: "queryId" | "surpriseId", id: string) =>
  page.evaluate(
    ({ t, f, v }) => (window.searchLiveLog2 ?? []).filter((e) => e.type === t && e[f] === v && e.source === "live").length,
    { t: type, f: field, v: id },
  );

test("18: a person's search and surprise get live answers that render, and every event is valid", async ({ page }) => {
  test.setTimeout(180_000);
  const invalid: string[] = [];
  page.on("console", (msg) => {
    if (/\[cindia\] invalid event/.test(msg.text())) invalid.push(msg.text());
  });
  await openPage(page, "/shop");
  await page.getByTestId("demo-mode-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
  await expect(page.locator('[data-testid="demo-mode-toggle"] [data-source-key="b12-search"][data-healthy="true"]')).toHaveCount(1, {
    timeout: HEALTH_TIMEOUT,
  });
  await recordEvents(page);

  // The person's own search: a live search.answered and search.mapped for its queryId.
  const home = slot(page, "shop.home.main");
  await home.getByTestId("search-input").fill("bright cheerful beaded earrings for a sister");
  await home.getByTestId("search-submit").click();
  await expect.poll(async () => (await userQueries(page)).length).toBe(1);
  const [query] = await userQueries(page);
  await expect.poll(() => liveCount(page, "search.answered", "queryId", query.queryId), { timeout: LIVE_TIMEOUT }).toBeGreaterThan(0);
  await expect.poll(() => liveCount(page, "search.mapped", "queryId", query.queryId), { timeout: LIVE_TIMEOUT }).toBeGreaterThan(0);
  const answer = (await searchState(page)).search.answers[query.queryId];
  expect(["elastic_hybrid", "local_hybrid"]).toContain(answer.engine);
  const view = slot(page, "shop.search.main");
  if (answer.results.length > 0) {
    const results = view.getByTestId("search-results");
    await expect
      .poll(() => results.locator('[data-testid^="search-result-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid"))))
      .toEqual(answer.results.filter((r) => pieces.some((p) => p.id === r.pieceId)).map((r) => `search-result-${r.pieceId}`));
  } else {
    await expect(view.getByTestId("search-results")).toBeVisible();
  }

  // The person's surprise: a live surprise.drawn that search-surprise-result renders.
  await view.getByTestId("search-surprise").click();
  await expect.poll(async () => (await searchState(page)).surprise.latestSurpriseId).toMatch(/^srp_user_/);
  const surpriseId = (await searchState(page)).surprise.latestSurpriseId!;
  await expect.poll(() => liveCount(page, "surprise.drawn", "surpriseId", surpriseId), { timeout: LIVE_TIMEOUT }).toBeGreaterThan(0);
  const draw = (await searchState(page)).surprise.draws[surpriseId];
  const title = pieces.find((p) => p.id === draw.pieceId)?.title.en;
  expect(title, "the drawn piece is in the catalog").toBeTruthy();
  await expect(view.getByTestId("search-surprise-result")).toContainText(title!);

  expect((await searchState(page)).sources["b12-search"]).toBe("live");
  expect(invalid, "every event is valid").toEqual([]);
});
