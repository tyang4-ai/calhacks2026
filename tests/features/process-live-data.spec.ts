// F-process T8: B13's live feature spec (B13-live acceptance, contracts G5 for v2), run as
//   npm run gate -- G5 b13-live tests/features/process-live-data.spec.ts
// Two pages in one browser context, both in live mode. A person's own request on page A (a support
// question while B14 is loaded, otherwise a checkout, which works with B14 down) reaches page B through
// GET /api/b13/changes as swarm.step or data.synced events keyed b13-live, every event on the wire
// valid, and process-presence reads the screens B13 reports: two or more, one more once page B opens.
// It skips with a named reason when /api/health doesn't list b13, services.spacetime is false, or
// /api/b13/status says SpacetimeDB is down, so G3 passes before B13 lands.
//
// Other screens may be polling the same database (another agent's live run), so presence is compared
// with /api/b13/status rather than with a fixed number.
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import type { CindiaEvent } from "../../src/core/events";
import { validateEvent } from "../../src/core/validate";
import { splits } from "../../src/mock/index";
import { open } from "./process-lib";

const KEY = "b13-live";

interface Health {
  routers?: string[];
  services?: { spacetime?: boolean };
}

/** Why B13 can't be tested live, or null when it can. */
async function skipReason(request: APIRequestContext): Promise<string | null> {
  const res = await request.get("/api/health", { timeout: 8000 }).catch(() => null);
  if (!res || !res.ok()) return "the API isn't answering /api/health";
  const health = (await res.json()) as Health;
  if (!health.routers?.includes("b13")) return "/api/health doesn't list b13";
  if (health.services?.spacetime !== true) return "/api/health says services.spacetime is false";
  const st = await request.get("/api/b13/status", { timeout: 8000 }).catch(() => null);
  if (!st || !st.ok()) return "/api/b13/status isn't answering";
  const status = (await st.json()) as { spacetime?: boolean };
  if (status.spacetime !== true) return "/api/b13/status says spacetime is false";
  return null;
}

async function statusScreens(request: APIRequestContext): Promise<number> {
  const st = await request.get("/api/b13/status", { timeout: 8000 });
  return ((await st.json()) as { screens: number }).screens;
}

/** Records every event /api/b13/changes hands this page, and every problem validateEvent() finds in it. */
function wire(page: Page) {
  const events: CindiaEvent[] = [];
  const problems: string[] = [];
  page.on("response", async (res) => {
    if (!res.url().includes("/api/b13/changes") || !res.ok()) return;
    try {
      const body = (await res.json()) as { events?: unknown[] };
      for (const e of body.events ?? []) {
        problems.push(...validateEvent(e));
        events.push(e as CindiaEvent);
      }
    } catch {
      // The page closed while the poll was open.
    }
  });
  return { events, problems };
}

/** Switches the page to live mode and waits for B13's adapter to be healthy and its first data.synced. */
async function goLive(page: Page) {
  await page.getByTestId("demo-mode-toggle").click();
  await expect(page.getByTestId("demo-mode-toggle")).toHaveAttribute("data-mode", "live");
  await expect(page.locator(`[data-testid="demo-mode-toggle"] [data-source-key="${KEY}"]`)).toHaveAttribute("data-healthy", "true", { timeout: 40_000 });
  await expect(page.getByTestId("process-presence")).toBeVisible({ timeout: 20_000 });
}

async function presence(page: Page): Promise<number> {
  const text = (await page.getByTestId("process-presence").textContent()) ?? "";
  return Number(/\d+/.exec(text)?.[0] ?? NaN);
}

/** B13's newest data.synced as page B's store holds it: each table's row count. */
async function rowsSeen(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as { sync: { data: { tables: { table: string; rows: number }[] } | null } };
    return Object.fromEntries((s.sync.data?.tables ?? []).map((t) => [t.table, t.rows]));
  });
}

test("a person's request on one live page reaches the other through /api/b13/changes, every event valid, and presence counts both screens", async ({ page, context, request }) => {
  test.setTimeout(180_000);
  const reason = await skipReason(request);
  test.skip(reason !== null, `B13 isn't live: ${reason}`);

  const pageA = page;
  const wireA = wire(pageA);
  const errors: string[] = [];
  pageA.on("pageerror", (e) => errors.push(`A: ${e.message}`));
  await open(pageA, "/shop");
  await goLive(pageA);
  await expect(pageA.getByTestId("process-bar").getByTestId("process-presence")).toHaveCount(1);

  // Presence reads the number of screens B13 reports, this one included once its screen row lands
  // (a screen's first poll answers before its row is written, so the first data.synced may say 0).
  await expect
    .poll(
      async () => {
        const shown = await presence(pageA);
        return shown >= 1 && shown === (await statusScreens(request));
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  const before = await presence(pageA);
  // The summary, the badge and the presence line all fit inside the bar (G3 N5).
  const outside = await pageA.evaluate(() => {
    const bar = document.querySelector('[data-testid="process-bar"]')!.getBoundingClientRect();
    const stack = document.querySelector('[data-testid="process-live-summary"]')!.parentElement!;
    return [...stack.children]
      .map((c) => ({ id: c.getAttribute("data-testid"), r: c.getBoundingClientRect() }))
      .filter(({ r }) => r.top < bar.top - 0.5 || r.bottom > bar.bottom + 0.5 || r.right > bar.right + 0.5)
      .map(({ id }) => id);
  });
  expect(outside).toEqual([]);

  // A second page in the same context raises it by one.
  const pageB = await context.newPage();
  const wireB = wire(pageB);
  pageB.on("pageerror", (e) => errors.push(`B: ${e.message}`));
  await open(pageB, "/shop");
  await goLive(pageB);
  await expect.poll(async () => presence(pageA), { timeout: 30_000 }).toBeGreaterThanOrEqual(before + 1);
  await expect.poll(async () => presence(pageB), { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
  await expect
    .poll(
      async () => {
        const shown = await presence(pageB);
        return shown >= 2 && shown === (await statusScreens(request));
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  // B's sources say b13-live is live, from B13's own events.
  expect(await pageB.evaluate(() => window.__cindia!.store.getState().sources["b13-live"])).toBe("live");

  const health = (await (await request.get("/api/health")).json()) as Health;
  const tag = Date.now().toString(36);
  if (health.routers?.includes("b14")) {
    // B14 is loaded: a support question on page A; its steps reach page B as swarm.step keyed b13-live.
    const stepsBefore = wireB.events.filter((e) => e.type === "swarm.step").length;
    await pageA.evaluate((id) => {
      const c = window.__cindia!;
      c.emit({
        id: `evt_user_${id}`,
        type: "support.asked",
        at: Math.round(c.player.now()),
        source: "user",
        payload: { threadId: `thr_user_${id}`, side: "buyer", text: "How long does shipping take?", lang: "en", contextIds: ["pc_01"] },
      });
    }, tag);
    await expect.poll(() => wireB.events.filter((e) => e.type === "swarm.step" && e.key === KEY).length - stepsBefore, { timeout: 60_000 }).toBeGreaterThan(0);
  } else {
    // B14 isn't loaded: a checkout on page A. B13's mirror records the order, and page B's next
    // data.synced shows one more orders row.
    const ordersBefore = (await rowsSeen(pageB)).orders ?? 0;
    const pieceId = "pc_02";
    await pageA.evaluate(
      ({ id, pieceId: pc, grossCents }) => {
        const c = window.__cindia!;
        c.emit({ id: `evt_user_${id}`, type: "checkout.started", at: Math.round(c.player.now()), source: "user", payload: { pieceId: pc, grossCents } });
      },
      { id: tag, pieceId, grossCents: splits[pieceId].grossCents },
    );
    await expect
      .poll(
        () =>
          pageA.evaluate(() => (window.__cindia!.store.getState() as unknown as { buyer: { orderIds: string[] } }).buyer.orderIds.some((o) => o.startsWith("ord_user_"))),
        { timeout: 20_000 },
      )
      .toBe(true);
    await expect.poll(async () => ((await rowsSeen(pageB)).orders ?? 0) - ordersBefore, { timeout: 40_000 }).toBeGreaterThanOrEqual(1);
    // The data view on page B reads the live tables.
    await pageB.getByTestId("process-block-data").click();
    await expect(pageB.getByTestId("process-data-tables")).toHaveAttribute("data-live", "true");
  }

  // Every event the feed handed either page is valid, and page B's log holds B13's status.
  expect(wireA.problems, "invalid events from /api/b13/changes on page A").toEqual([]);
  expect(wireB.problems, "invalid events from /api/b13/changes on page B").toEqual([]);
  expect(wireB.events.length).toBeGreaterThan(0);
  expect(wireB.events.every((e) => e.key === KEY && (e.type === "swarm.step" || e.type === "data.synced"))).toBe(true);
  const synced = await pageB.evaluate(() =>
    (window.__cindia!.store.getState() as unknown as { log: { entries: { type: string; source: string; key?: string }[] } }).log.entries.filter((e) => e.type === "data.synced"),
  );
  expect(synced.some((e) => e.source === "live" && e.key === KEY)).toBe(true);
  expect(errors).toEqual([]);

  // Back to scripted, so neither page keeps polling.
  for (const p of [pageA, pageB]) await p.getByTestId("demo-mode-toggle").click();
  await pageB.close();
});
