// F-money-map T3: the studio account's balance (acceptance 3) and the Simulated badge giving way
// to the Nessie label once b04-bank goes live (acceptance 6).
import { expect, test, type Page } from "@playwright/test";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { waitForHooks, watchPage } from "../smoke/lib";

interface SyncPayload {
  accountId: string;
  balanceCents: number;
  asOf: string;
}

const SYNC_AT = 18500;

async function openMapAt(page: Page, ms: number) {
  await page.goto("/studio/map");
  await waitForHooks(page);
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function scriptedSync(page: Page): Promise<SyncPayload> {
  const sync = await page.evaluate((at) => {
    const tl = window.__cindia!.player.getTimeline();
    const e = tl?.events.find((ev) => ev.type === "account.synced" && ev.at === at);
    return (e?.payload ?? null) as SyncPayload | null;
  }, SYNC_AT);
  expect(sync, `an account.synced at ${SYNC_AT} ms in the timeline`).not.toBeNull();
  return sync!;
}

test("money-map-balance shows the balance and date from the account.synced at 18.5 s", async ({ page }) => {
  const watch = watchPage(page);
  await openMapAt(page, 20000);
  const sync = await scriptedSync(page);

  const balance = page.getByTestId("money-map-balance");
  await expect(balance).toBeVisible();
  // The studio console starts in English.
  await expect(balance).toContainText(formatCents(sync.balanceCents));
  await expect(balance).toContainText(formatDate(sync.asOf, "en"));
  await expect(page.getByTestId("money-map-balance-nessie")).toHaveCount(0);
  watch.expectClean();
});

test("the map panel drops the Simulated badge and shows the Nessie label once b04-bank is live", async ({ page }) => {
  const watch = watchPage(page);
  await openMapAt(page, 20000);
  const sync = await scriptedSync(page);

  const slot = page.locator('[data-slot="studio.map.main"]');
  await expect(page.getByTestId("money-map-balance")).toBeVisible();
  await expect(slot.getByTestId("simulated-badge")).toBeVisible();
  await expect(page.getByTestId("money-map-balance-nessie")).toHaveCount(0);

  const liveBalance = sync.balanceCents + 100;
  await page.evaluate(
    ({ balanceCents, asOf }) => {
      const c = window.__cindia!;
      c.emit({
        id: "evt_live_0001",
        type: "account.synced",
        at: c.player.now(),
        source: "live",
        key: "b04-bank",
        payload: { accountId: "acct_studio", balanceCents, asOf },
      });
    },
    { balanceCents: liveBalance, asOf: sync.asOf },
  );

  await expect(slot.getByTestId("simulated-badge")).toHaveCount(0);
  await expect(page.getByTestId("money-map-balance-nessie")).toBeVisible();
  await expect(page.getByTestId("money-map-balance")).toContainText(formatCents(liveBalance));
  watch.expectClean();
});
