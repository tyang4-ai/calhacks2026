// M-approvals with B08 live: the owner approves on a real second screen and the console sees it.
// Two pages in one browser context, both in live mode:
// - page A, the console on /demo, plays the demo from 1 s before apr_01's approval.requested through
//   both requests (times read from the loaded timeline, so it holds when I2-tour moves the beats);
// - page B, the owner screen on /sell/approvals?screen=owner (the route B13-live's T7 makes the B08
//   adapter poll, D1-19), polls the pending list (B08 start()) and shows the approvals. The test taps
//   Approve there.
// The console must not grant on its own while the owner screen is connected: each scripted
// approval.granted waits on the long-poll, and the decision that lands is the owner's, live.
//
// The B08 server keeps approvals in memory and its decisions are final, keyed by approval ID. So the
// test never touches apr_01 or apr_02 on the server: a route on both pages renames them to IDs unique
// to this run on the way out (URL and body) and back on the way in, and page B's pending list keeps
// only this run's approvals. Whatever happens, the test decides its own approvals at the end, so none
// stays pending for a later owner screen. One thing it can't avoid: the server's owner clock
// (ownerConnected) stays true for 10 seconds after page B's last poll.
import { expect, test, type APIRequestContext, type Page, type Route } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";

const KEY = "b08-approvals";
const IDS = ["apr_01", "apr_02"] as const;
/** The console starts this long before the timeline's approval.requested for apr_01. */
const LEAD_IN_MS = 1000;

/**
 * Event-anchored times from the console's loaded timeline (conventions.md, Specs): the start, 1 s
 * before apr_01's approval.requested, and the last scripted grant, the timeline's approval.granted
 * for apr_02.
 */
async function timelineTimes(page: Page): Promise<{ startMs: number; lastScriptedGrantMs: number }> {
  const times = await page.evaluate(() => {
    const events = (window.__cindia as unknown as { player: { getTimeline(): { events: { type: string; at: number; payload: unknown }[] } | null } }).player.getTimeline()?.events ?? [];
    const at = (type: string, id: string) => events.find((e) => e.type === type && (e.payload as { approvalId?: string }).approvalId === id)?.at ?? null;
    return { request: at("approval.requested", "apr_01"), grant: at("approval.granted", "apr_02") };
  });
  expect(times.request, "the loaded timeline has approval.requested for apr_01").not.toBeNull();
  expect(times.grant, "the loaded timeline has approval.granted for apr_02").not.toBeNull();
  return { startMs: Math.max(0, times.request! - LEAD_IN_MS), lastScriptedGrantMs: times.grant! };
}

type Hooks = {
  player: { now(): number; play(): void; pause(): void; seek(ms: number): void };
  store: { getState(): unknown };
};

interface ItemView {
  status: string;
  requested: boolean;
  by?: string;
  date?: string;
  source?: string;
  decidedAt?: number;
}

interface Logged {
  page: "console" | "owner";
  method: string;
  path: string;
  /** -1 while the request is still open. */
  status: number;
  body: string;
}

const runTag = `apr_pw${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;
const serverId = (id: string) => `${runTag}_${id.slice(4)}`;
const toServer = (s: string) => s.replace(/\bapr_(01|02)\b/g, `${runTag}_$1`);
const toClient = (s: string) => s.split(`${runTag}_`).join("apr_");

/** Routes /api/b08/** through the renaming and logs each call. */
async function relayB08(page: Page, who: Logged["page"], log: Logged[]) {
  await page.route("**/api/b08/**", async (route: Route) => {
    const req = route.request();
    const url = toServer(req.url());
    const post = req.postData();
    const headers = { ...req.headers() };
    delete headers["content-length"];
    const entry: Logged = { page: who, method: req.method(), path: new URL(url).pathname + new URL(url).search, status: -1, body: "" };
    log.push(entry);
    try {
      const res = await route.fetch({ url, headers, postData: post === null ? undefined : toServer(post), timeout: 20000 });
      let text = await res.text();
      const path = new URL(url).pathname;
      if (req.method() === "GET" && path === "/api/b08/approvals" && res.ok()) {
        // Only this run's pending approvals reach the owner page.
        const body = JSON.parse(text) as { events?: { payload?: { approvalId?: string } }[] };
        body.events = (body.events ?? []).filter((e) => String(e.payload?.approvalId ?? "").startsWith(`${runTag}_`));
        text = JSON.stringify(body);
      }
      entry.status = res.status();
      entry.body = text;
      await route.fulfill({ status: res.status(), contentType: "application/json", body: toClient(text) });
    } catch {
      // The page closed while a long-poll was open.
      await route.abort().catch(() => undefined);
    }
  });
}

/** The owner screen: the Sell site's approvals view with screen=owner, which the B08 adapter polls for. */
const OWNER_URL = "/sell/approvals?screen=owner";

/**
 * Opens a page and turns on live mode. `slot` is the slot to wait for: owner.main on the owner
 * screen. The console's /demo stage opens on another Sell view, so it waits for its first filled slot.
 */
async function goLive(page: Page, url: string, slot?: string) {
  await page.goto(url);
  await waitForHooks(page);
  await page.evaluate(() => (window.__cindia as unknown as Hooks).player.pause());
  if (slot) await expect(page.locator(`[data-slot="${slot}"]`).first()).toHaveAttribute("data-slot-state", "filled");
  else await expect(page.locator('[data-slot][data-slot-state="filled"]').first()).toBeAttached();
  await page.getByTestId("demo-mode-toggle").click();
  await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Live/);
  await expect(page.locator(`[data-testid="demo-mode-toggle"] [data-source-key="${KEY}"]`)).toHaveAttribute("data-healthy", "true", { timeout: 15000 });
}

async function items(page: Page): Promise<{ clock: number; mode: string; source: string; items: Record<string, ItemView | undefined> }> {
  return page.evaluate(() => {
    const h = window.__cindia as unknown as Hooks;
    const s = h.store.getState() as { mode: string; sources: Record<string, string>; approvals: { items: Record<string, ItemView> } };
    return { clock: h.player.now(), mode: s.mode, source: s.sources["b08-approvals"], items: { apr_01: s.approvals.items.apr_01, apr_02: s.approvals.items.apr_02 } };
  });
}

/** Decides any of this run's approvals still pending, so none is left for a later owner screen. */
async function cleanUp(request: APIRequestContext) {
  for (const id of IDS) {
    await request
      .post(`/api/b08/approvals/${serverId(id)}/decision`, {
        data: { trigger: null, decision: "declined", reason: { en: "Test run cleanup", zh: "测试清理" } },
        timeout: 5000,
      })
      .catch(() => undefined);
  }
}

test("live: the owner approves on /sell/approvals?screen=owner and the console's long-poll receives the decision", async ({ browser, request, baseURL }) => {
  test.setTimeout(120000);
  const health = await request.get("/api/health", { timeout: 5000 }).catch(() => null);
  const routers = health && health.ok() ? (((await health.json()) as { routers?: unknown }).routers ?? []) : [];
  test.skip(!Array.isArray(routers) || !routers.includes("b08"), `/api/health doesn't list b08 (the API on 8000 is down or B08 isn't loaded), so the live two-screen flow can't run`);

  const context = await browser.newContext({ baseURL });
  const log: Logged[] = [];
  try {
    const owner = await context.newPage();
    const consolePage = await context.newPage();
    const ownerWatch = watchPage(owner);
    const consoleWatch = watchPage(consolePage);
    await relayB08(owner, "owner", log);
    await relayB08(consolePage, "console", log);

    // Page B: the owner screen, live, paused at 0 so only the server's approvals reach it.
    await goLive(owner, OWNER_URL, "owner.main");
    await expect.poll(() => log.some((l) => l.page === "owner" && l.method === "GET" && l.path.startsWith("/api/b08/approvals?")), { timeout: 10000 }).toBe(true);
    await expect(owner.getByTestId("approvals-item-apr_01")).toHaveCount(0);

    // Page A: the console, live, plays from just before apr_01's request through both requests and
    // both scripted grants.
    await goLive(consolePage, "/demo");
    const { startMs: START_MS, lastScriptedGrantMs: LAST_SCRIPTED_GRANT_MS } = await timelineTimes(consolePage);
    await consolePage.evaluate((ms) => {
      const h = window.__cindia as unknown as Hooks & { store: { subscribe(l: () => void): () => void } };
      const p = h.player;
      // The console's player clock when each approval first leaves pending. (The event's own `at`
      // is the owner page's clock, copied by the server from the tap.)
      const decidedAtClock: Record<string, number> = {};
      (window as unknown as { approvalsLiveDecided: Record<string, number> }).approvalsLiveDecided = decidedAtClock;
      h.store.subscribe(() => {
        const s = h.store.getState() as { approvals: { items: Record<string, { status: string }> } };
        for (const id of ["apr_01", "apr_02"])
          if (decidedAtClock[id] === undefined && s.approvals.items[id] && s.approvals.items[id].status !== "pending") decidedAtClock[id] = p.now();
      });
      p.pause();
      p.seek(ms);
      p.play();
    }, START_MS);

    // The console registers each approval live, and the owner's poll brings both to page B.
    for (const id of IDS) {
      await expect(owner.getByTestId(`approvals-item-${id}`)).toBeVisible({ timeout: 15000 });
      await expect(owner.getByTestId(`approvals-approve-${id}`)).toBeVisible();
      await expect(owner.getByTestId(`approvals-seal-${id}`)).toHaveCount(0);
    }
    const ownerState = await items(owner);
    expect(ownerState.mode).toBe("live");
    for (const id of IDS) expect(ownerState.items[id], `${id} on the owner page`).toMatchObject({ requested: true, status: "pending" });
    expect(log.filter((l) => l.page === "console" && l.method === "POST" && l.path === "/api/b08/approvals").length, "the console registered both approvals").toBe(2);

    // Past both scripted grants, the console has opened a long-poll for each and granted nothing.
    await consolePage.waitForFunction((t) => (window.__cindia as unknown as Hooks).player.now() >= t, LAST_SCRIPTED_GRANT_MS + 300, { timeout: 30000 });
    await expect
      .poll(() => IDS.every((id) => log.some((l) => l.page === "console" && l.method === "GET" && l.path.startsWith(`/api/b08/approvals/${serverId(id)}?wait=`))), { timeout: 3000 })
      .toBe(true);
    expect(log.filter((l) => l.page === "console" && l.path === "/api/b08/status").map((l) => JSON.parse(l.body) as unknown), "the console saw the owner screen connected").toEqual(IDS.map(() => ({ ownerConnected: true })));
    const before = await items(consolePage);
    expect(before.clock).toBeGreaterThan(LAST_SCRIPTED_GRANT_MS);
    for (const id of IDS) expect(before.items[id]?.status, `${id} on the console after its scripted grant time, while the owner screen is connected`).toBe("pending");

    // The owner taps Approve on page B, apr_01 first since its long-poll opened first.
    for (const id of IDS) await owner.getByTestId(`approvals-approve-${id}`).click();

    // The seal lands on page B, and the server answered each tap with its own live decision.
    for (const id of IDS) await expect(owner.getByTestId(`approvals-seal-${id}`)).toBeVisible();
    await expect
      .poll(() => IDS.every((id) => log.some((l) => l.page === "owner" && l.method === "POST" && l.path === `/api/b08/approvals/${serverId(id)}/decision` && l.status === 200)), { timeout: 10000 })
      .toBe(true);
    for (const id of IDS) {
      const decision = log.find((l) => l.page === "owner" && l.path === `/api/b08/approvals/${serverId(id)}/decision`)!;
      const ev = (JSON.parse(toClient(decision.body)) as { events: { type: string; source: string; key: string; payload: { approvalId: string; by: string; date: string } }[] }).events;
      expect(ev).toHaveLength(1);
      expect(ev[0]).toMatchObject({ type: "approval.granted", source: "live", key: KEY, payload: { approvalId: id, by: "own_01", date: "2026-10-01" } });
    }
    const afterOwner = await items(owner);
    for (const id of IDS) expect(afterOwner.items[id]).toMatchObject({ status: "granted", by: "own_01", source: "user" });

    // Page A receives approval.granted from the live source, by own_01, after its scripted time.
    await expect
      .poll(async () => {
        const s = await items(consolePage);
        return IDS.every((id) => s.items[id]?.status !== "pending");
      }, { timeout: 10000 })
      .toBe(true);
    const after = await items(consolePage);
    const decidedAtClock = await consolePage.evaluate(() => (window as unknown as { approvalsLiveDecided: Record<string, number> }).approvalsLiveDecided);
    for (const id of IDS) {
      expect(after.items[id], `${id} on the console`).toMatchObject({ status: "granted", by: "own_01", source: "live", date: "2026-10-01" });
      expect(decidedAtClock[id], `${id} decided on the console only after its last scripted grant time`).toBeGreaterThan(LAST_SCRIPTED_GRANT_MS);
    }
    for (const id of IDS) {
      const wait = log.find((l) => l.page === "console" && l.path.startsWith(`/api/b08/approvals/${serverId(id)}?wait=`))!;
      expect(wait.status).toBe(200);
      expect((JSON.parse(toClient(wait.body)) as { events: { type: string; payload: { by: string } }[] }).events[0]).toMatchObject({ type: "approval.granted", payload: { by: "own_01" } });
    }

    ownerWatch.expectClean();
    consoleWatch.expectClean();
  } finally {
    await context.close();
    await cleanUp(request);
  }
});
