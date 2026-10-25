// M-desktop T7, B16's live feature spec for the money map (acceptance 10 and 11): in live mode with
// b16-bank-books live, a person's grant of apr_05 and the tour's fund moves each bring a money.moved
// twin with a nessieId, every event valid, and that move's thread says "Checked against Nessie".
// Run by B16's G5: npm run gate -- G5 b16-bank-books tests/features/money-map-live-bank.spec.ts
// tests/features/reconcile-live-bank.spec.ts. Skips with a named reason when /api/health doesn't
// list b16 or keys.nessie is false, so G3 passes before B16 lands.
// Until I2-tour puts the fund moves (mv_0101, mv_0102) and the beat d05-pay into the timeline, the
// tour case plays them on /sell/map from src/mock/ the way the tour would, at the player's clock.
import { expect, test, type Page } from "@playwright/test";
import { apr_05, demoFundMoves, worksInProgress } from "../../src/mock/index";
import { strings } from "../../src/features/money-map/strings";
import { SELL_VIEWPORT, emitAtClock, expectInsideFrame, inFrame, openSell, seed, seekToEvent, timelineAt, watchPage } from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

const NESSIE = strings.checkedNessie.en;
/** B04 may seed the co-op's Nessie account first (about 30 POSTs) and B16 its two accounts after it. */
const HEALTH_TIMEOUT = 90_000;
/** B16 posts one move at a time, each fetch aborting at 7.5 s, behind whatever is already queued. */
const TWIN_TIMEOUT = 30_000;

interface Health {
  routers?: string[];
  keys?: { nessie?: boolean };
}

/**
 * Every event valid (the store warns on an invalid one in development), no page error, and no request
 * beyond localhost. Live mode's own calls to the local API are the point here, so their answers are
 * left to the server's tests.
 */
function expectEventsValid(watch: ReturnType<typeof watchPage>) {
  expect(watch.errors.filter((e) => /^console\.warn: \[cindia|^pageerror/.test(e)), "invalid events or page errors").toEqual([]);
  expect(watch.remote, "requests beyond localhost").toEqual([]);
}

test.beforeEach(async ({ page }) => {
  let health: Health = {};
  let reason = "";
  try {
    const res = await page.request.get("/api/health", { timeout: 5000 });
    if (res.ok()) health = (await res.json()) as Health;
    else reason = `/api/health answered ${res.status()}`;
  } catch (err) {
    reason = `/api/health unreachable (${(err as Error).message.split("\n")[0]})`;
  }
  const routers = health.routers ?? [];
  test.skip(!routers.includes("b16"), `B16's live path needs the API with b16 loaded: ${reason || `routers ${JSON.stringify(routers)}`}`);
  test.skip(health.keys?.nessie !== true, "B16's live path needs NESSIE_KEY (keys.nessie is false in /api/health)");
  test.setTimeout(240_000);
});

/** Switches to live mode and waits until the b16-bank-books adapter reports healthy. */
async function goLive(page: Page) {
  await page.getByTestId("demo-mode-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
  await expect(page.locator('[data-testid="demo-mode-toggle"] [data-source-key="b16-bank-books"][data-healthy="true"]')).toHaveCount(1, {
    timeout: HEALTH_TIMEOUT,
  });
}

/** The store's money move, or null. */
function storedMove(page: Page, moveId: string) {
  return page.evaluate(
    (id) => (window.__cindia!.store.getState() as unknown as { money: { moves: Record<string, { kind: string; nessieId?: string; amountCents: number }> } }).money.moves[id] ?? null,
    moveId,
  );
}

/** Waits for B16's twin of a move: the store's copy gains a nessieId and b16-bank-books turns live. */
async function expectTwin(page: Page, moveId: string) {
  await expect.poll(async () => (await storedMove(page, moveId))?.nessieId ?? null, { timeout: TWIN_TIMEOUT, message: `${moveId} gains a nessieId` }).not.toBeNull();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().sources["b16-bank-books"])).toBe("live");
  const thread = inFrame(page, "money-map-canvas").getByTestId(`money-map-thread-${moveId}`);
  await expect(thread).toContainText(NESSIE);
  await expectInsideFrame(page, [`money-map-thread-${moveId}`]);
}

test("a person's grant of apr_05 brings the milestone move's twin with a nessieId, and its thread says Checked against Nessie", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "map");
  await seekToEvent(page, "account.synced", { accountId: "acct_studio" }, 300);
  await goLive(page);

  // The person's release of wip_01's second milestone, then the owner's grant, as Sell › Projects
  // and Sell › Approvals emit them. The scripted answer pays the milestone, Cindia to the maker.
  const wip = worksInProgress.find((w) => w.id === apr_05.subjectIds[0])!;
  const mls = wip.milestones.find((m) => m.status === "pending")!;
  await emitAtClock(page, [seed("wip.milestone_reached", { wipId: wip.id, milestoneId: mls.milestoneId, date: apr_05.decisionDate! }, { source: "user" })]);
  await expect
    .poll(() => page.evaluate((id) => (window.__cindia!.store.getState() as unknown as { approvals: { items: Record<string, { requested: boolean }> } }).approvals.items[id]?.requested ?? false, apr_05.id))
    .toBe(true);
  await emitAtClock(page, [seed("approval.granted", { approvalId: apr_05.id, by: "own_01", date: apr_05.decisionDate! }, { source: "user" })]);

  const findMilestone = () =>
    page.evaluate(() => {
      const money = (window.__cindia!.store.getState() as unknown as { money: { moveIds: string[]; moves: Record<string, { kind: string }> } }).money;
      return money.moveIds.find((id) => money.moves[id]?.kind === "milestone") ?? null;
    });
  await expect.poll(findMilestone, { message: "the scripted answer pays the milestone" }).not.toBeNull();
  const moveId = (await findMilestone())!;
  expect(moveId).toMatch(/^mv_user_\d+$/);
  await expectTwin(page, moveId);
  expectEventsValid(watch);
});

test("the tour's fund move mv_0102 brings its twin with a nessieId, and its thread says Checked against Nessie", async ({ page }) => {
  const watch = watchPage(page);
  const tourHasFunds = await (async () => {
    await openSell(page, "map");
    return (await timelineAt(page, "money.moved", { moveId: "mv_0102" })) !== null && (await timelineAt(page, "beat.started", { beatId: "d05-pay" })) !== null;
  })();

  if (tourHasFunds) {
    // The tour from d05-pay in live mode, on the stage: the money map is in frame-studio.
    await page.goto("/demo?start=d05-pay");
    await page.waitForFunction(() => Boolean(window.__cindia?.player));
    await goLive(page);
    await expect.poll(async () => (await storedMove(page, "mv_0102"))?.nessieId ?? null, { timeout: TWIN_TIMEOUT + 60_000 }).not.toBeNull();
    await expect(inFrame(page, "money-map-thread-mv_0102")).toContainText(NESSIE);
  } else {
    // Before I2-tour: the same two moves, played on /sell/map in live mode as the tour plays them.
    await seekToEvent(page, "account.synced", { accountId: "acct_studio" }, 300);
    await goLive(page);
    await emitAtClock(page, demoFundMoves.map((m) => seed("money.moved", m, { key: "b04-bank" })), -1000);
    await expectTwin(page, "mv_0102");
    // The buyer-to-Cindia leg isn't a community fund move, so B16 leaves it as it is.
    await expect(inFrame(page, "money-map-thread-mv_0101")).not.toContainText(NESSIE);
  }
  expectEventsValid(watch);
});
