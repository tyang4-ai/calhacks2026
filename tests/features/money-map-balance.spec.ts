// F-money-map T3, on M-desktop's /sell/map at 1440 by 900: the co-op account's balance (acceptance 3)
// and the Nessie label once b04-bank goes live (acceptance 6). Since M-desktop the map's panel also
// declares b16-bank-books (B16), so its Simulated badge clears only once both of its keys are live.
import { expect, test, type Page } from "@playwright/test";
import { demoFundMoves } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { SELL_VIEWPORT, emitAtClock, inFrame, openSell, seed, seekToEvent, watchPage } from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

interface SyncPayload {
  accountId: string;
  balanceCents: number;
  asOf: string;
}

async function openMapAfterSync(page: Page): Promise<SyncPayload> {
  await openSell(page, "map");
  const sync = await page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline();
    const e = tl?.events.find((ev) => ev.type === "account.synced" && (ev.payload as { accountId?: string }).accountId === "acct_studio");
    return (e?.payload ?? null) as SyncPayload | null;
  });
  expect(sync, "an account.synced for acct_studio in the timeline").not.toBeNull();
  await seekToEvent(page, "account.synced", { accountId: "acct_studio" }, 300);
  return sync!;
}

test("money-map-balance shows the balance and date from the money beat's account.synced", async ({ page }) => {
  const watch = watchPage(page);
  const sync = await openMapAfterSync(page);

  const balance = inFrame(page, "money-map-balance");
  await expect(balance).toBeVisible();
  // The Sell site starts in English.
  await expect(balance).toContainText(formatCents(sync.balanceCents));
  await expect(balance).toContainText(formatDate(sync.asOf, "en"));
  await expect(page.getByTestId("money-map-balance-nessie")).toHaveCount(0);
  watch.expectClean();
});

test("the Nessie label shows once b04-bank is live, and the badge clears once b16-bank-books is live too", async ({ page }) => {
  const watch = watchPage(page);
  const sync = await openMapAfterSync(page);

  const slot = page.locator('[data-slot="studio.map.main"]');
  await expect(inFrame(page, "money-map-balance")).toBeVisible();
  await expect(slot.getByTestId("simulated-badge")).toBeVisible();
  await expect(page.getByTestId("money-map-balance-nessie")).toHaveCount(0);

  const liveBalance = sync.balanceCents + 100;
  await emitAtClock(page, [
    seed("account.synced", { accountId: "acct_studio", balanceCents: liveBalance, asOf: sync.asOf }, { key: "b04-bank", source: "live" }),
  ]);
  await expect(page.getByTestId("money-map-balance-nessie")).toBeVisible();
  await expect(inFrame(page, "money-map-balance")).toContainText(formatCents(liveBalance));
  // b16-bank-books is still scripted, so the panel still says Simulated.
  await expect(slot.getByTestId("simulated-badge")).toBeVisible();

  // B16's live twin of a fund move (nessieId added) makes b16-bank-books live: the badge clears.
  await emitAtClock(page, [seed("money.moved", { ...demoFundMoves[1], nessieId: "spec-b16-1" }, { key: "b16-bank-books", source: "live" })], -1000);
  await expect(slot.getByTestId("simulated-badge")).toHaveCount(0);
  watch.expectClean();
});
