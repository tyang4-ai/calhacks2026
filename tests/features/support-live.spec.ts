// F-support T5: B14's live feature spec (acceptance 15), run by the orchestrator as
// `npm run gate -- G5 b14-swarm tests/features/support-live.spec.ts`.
// In live mode with b14-swarm healthy, a person asks their own buyer question in the drawer on
// /shop/piece/pc_01, and B14 answers it end to end: its steps in support-steps, its reply in
// support-reply, every event valid (the store warns on an invalid one, which watchPage fails on),
// and the store's sources mark b14-swarm live, since the scripted fallback would render the same
// test IDs (lessons, G5).
// Skips with a named reason when /api/health doesn't list b14 or keys.anthropic is false, so G3
// passes before B14 lands. Asks only after any seek: the registry drops answers on an epoch change.
import { expect, test, type Page } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import { FALLBACK_REPLY, drawer, openPage, userAsks } from "./support-lib";

/** B14's budget is 20 s (timeoutFor), plus the page's own time on a shared VM. */
const LIVE_TIMEOUT = 30_000;

interface LoggedEvent {
  type: string;
  source: string;
  key?: string;
  payload: Record<string, unknown>;
}

declare global {
  interface Window {
    cindiaSupportLive?: LoggedEvent[];
  }
}

test.beforeEach(async ({ page }) => {
  let routers: string[] = [];
  let anthropic = false;
  let reason = "";
  try {
    const res = await page.request.get("/api/health", { timeout: 5000 });
    if (res.ok()) {
      const body = (await res.json()) as { routers?: string[]; keys?: { anthropic?: boolean } };
      routers = body.routers ?? [];
      anthropic = body.keys?.anthropic === true;
    } else reason = `/api/health answered ${res.status()}`;
  } catch (err) {
    reason = `/api/health unreachable (${(err as Error).message.split("\n")[0]})`;
  }
  test.skip(!routers.includes("b14"), `B14 live path needs the API with b14 loaded: ${reason || `routers ${JSON.stringify(routers)}`}`);
  test.skip(!anthropic, "B14 live path needs keys.anthropic true in /api/health");
});

/** Logs every event the store takes in, through the same store module the app uses (dev server). */
async function startEventLog(page: Page) {
  await page.evaluate(async () => {
    const path = "/src/core/store.ts";
    const mod = (await import(/* @vite-ignore */ path)) as { onEvent(l: (e: LoggedEvent) => void): () => void; getState(): unknown };
    if (mod.getState() !== window.__cindia!.store.getState()) throw new Error("imported a second store instance");
    window.cindiaSupportLive = [];
    mod.onEvent((e) => window.cindiaSupportLive!.push({ type: e.type, source: e.source, key: e.key, payload: { ...e.payload } }));
  });
}

test("15: in live mode B14 answers a person's own question end to end in the drawer", async ({ page }) => {
  test.setTimeout(90_000);
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_01?drawer=support");
  await page.getByTestId("demo-mode-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
  await expect(page.locator('[data-testid="demo-mode-toggle"] [data-source-key="b14-swarm"][data-healthy="true"]')).toHaveCount(1, { timeout: 15_000 });
  await expect(drawer(page).getByTestId("support-live-note")).toBeVisible();
  await startEventLog(page);

  const question = "Is this weaving made of wool, and how big is it?";
  await drawer(page).getByTestId("support-input").fill(question);
  await drawer(page).getByTestId("support-send").click();
  const asks = await userAsks(page);
  expect(asks).toHaveLength(1);
  expect(asks[0]).toMatchObject({ source: "user", side: "buyer", text: question, contextIds: ["pc_01"] });

  // B14's own answer: a live support.answered on the person's thread, after live steps.
  await expect
    .poll(() => page.evaluate(() => window.cindiaSupportLive!.filter((e) => e.type === "support.answered" || e.type === "support.escalated").map((e) => e.source)), {
      timeout: LIVE_TIMEOUT,
    })
    .toEqual(["live"]);
  const events = await page.evaluate(() => window.cindiaSupportLive!);
  const steps = events.filter((e) => e.type === "swarm.step");
  expect(steps.length).toBeGreaterThan(0);
  for (const e of [...steps, ...events.filter((x) => x.type === "support.answered")]) {
    expect(e.source).toBe("live");
    expect(e.payload.threadId).toBe(asks[0].threadId);
  }
  expect(await page.evaluate(() => window.__cindia!.store.getState().sources["b14-swarm"])).toBe("live");

  // The drawer shows it: every step in support-steps (B13's feed may deliver a step twice, so count
  // step IDs), and the reply in support-reply.
  const stepIds = new Set(steps.map((e) => String(e.payload.stepId)));
  const strip = drawer(page).getByTestId("support-steps");
  await expect(strip).toBeVisible();
  await expect(strip.locator('[data-testid^="support-step-"]')).toHaveCount(stepIds.size);
  const reply = drawer(page).getByTestId("support-reply");
  await expect(reply).toBeVisible();
  await expect(reply).not.toContainText(FALLBACK_REPLY.en);
  await expect(drawer(page).getByTestId("support-agent")).not.toHaveText("");
  watch.expectClean();
});
