// M-desktop T7, B16's live feature spec for the month (acceptance 10 and 11): in live mode with
// b16-bank-books live, the month's short-payment flag gets B16's twin with a nessieId and v1's
// figures, every event valid, and the bank evidence card says "Checked against Nessie".
// Run by B16's G5: npm run gate -- G5 b16-bank-books tests/features/money-map-live-bank.spec.ts
// tests/features/reconcile-live-bank.spec.ts. Skips with a named reason when /api/health doesn't
// list b16 or keys.nessie is false, so G3 passes before B16 lands.
// With the tour's beat d07-month in the timeline (I2-tour), it plays /demo?start=d07-month; before
// that, it plays the month's flag on /sell/month in live mode, from just before flag.raised.
import { expect, test, type Page } from "@playwright/test";
import { galleryFlag } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { UI } from "../../src/features/reconcile/strings";
import { SELL_VIEWPORT, expectInsideFrame, openSell, seekToEvent, timelineAt, watchPage } from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

const NESSIE = UI.checkedNessie.en;
/** B04 may seed the co-op's Nessie account first (about 30 POSTs) and B16 its two accounts after it. */
const HEALTH_TIMEOUT = 90_000;
/** B16 reads the bank side back and runs B01's matcher, each fetch aborting at 7.5 s. */
const TWIN_TIMEOUT = 30_000;

interface Health {
  routers?: string[];
  keys?: { nessie?: boolean };
}

interface StoredFlag {
  flagId: string;
  expectedCents: number;
  actualCents: number;
  deltaCents: number;
  recordIds: string[];
  nessieId?: string;
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

function storedFlag(page: Page, flagId: string): Promise<StoredFlag | null> {
  return page.evaluate(
    (id) => ((window.__cindia!.store.getState() as unknown as { month: { flags: Record<string, StoredFlag> } }).month.flags[id] ?? null) as StoredFlag | null,
    flagId,
  );
}

test("the month's flag gets B16's twin with a nessieId and v1's figures, and the bank card says Checked against Nessie", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "month");
  const tourHasMonthBeat = (await timelineAt(page, "beat.started", { beatId: "d07-month" })) !== null;

  if (tourHasMonthBeat) {
    await page.goto("/demo?start=d07-month");
    await page.waitForFunction(() => Boolean(window.__cindia?.player));
    await goLive(page);
  } else {
    // Before I2-tour: live mode on /sell/month, then play across the flag at 1x as the demo does.
    await seekToEvent(page, "flag.raised", { flagId: galleryFlag.id }, -500);
    await goLive(page);
    await page.evaluate(() => window.__cindia!.player.play());
  }

  await expect.poll(async () => (await storedFlag(page, galleryFlag.id))?.nessieId ?? null, { timeout: TWIN_TIMEOUT + 60_000, message: "the flag gains a nessieId" }).not.toBeNull();
  await page.evaluate(() => window.__cindia!.player.pause());
  const flag = (await storedFlag(page, galleryFlag.id))!;
  // v1's figures, exactly: the $340 Nessie confirms is the scripted one.
  expect([flag.expectedCents, flag.actualCents, flag.deltaCents]).toEqual([galleryFlag.expectedCents, galleryFlag.actualCents, galleryFlag.deltaCents]);
  expect(flag.recordIds).toEqual([...galleryFlag.recordIds]);
  expect(await page.evaluate(() => window.__cindia!.store.getState().sources["b16-bank-books"])).toBe("live");

  const studio = page.getByTestId("frame-studio");
  await expect(studio.getByTestId("reconcile-evidence-bank")).toContainText(NESSIE);
  await expect(studio.getByTestId("reconcile-evidence-contract")).not.toContainText(NESSIE);
  await expect(studio.getByTestId("reconcile-flag")).toContainText(formatCents(galleryFlag.expectedCents));
  await expect(studio.getByTestId("reconcile-flag")).toContainText(formatCents(Math.abs(galleryFlag.deltaCents)));
  if (!tourHasMonthBeat) await expectInsideFrame(page, ["reconcile-flag", "reconcile-evidence-bank"]);
  expectEventsValid(watch);
});
