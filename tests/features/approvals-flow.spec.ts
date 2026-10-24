// F-approvals T4: the owner's inbox from the end of d07-catch through d08-approve.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function openOwner(page: Page) {
  await page.goto("/owner");
  await waitForHooks(page);
  await expect(page.locator('[data-slot="owner.main"]')).toHaveAttribute("data-slot-state", "filled");
}

test("before any request the inbox shows no cards and no toast", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await seek(page, 35000);
  await expect(page.getByTestId("approvals-item-apr_01")).toHaveCount(0);
  await expect(page.getByTestId("approvals-toast")).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 1: at 36.5 s the toast buzzes and apr_01's card is there", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await seek(page, 36500);
  await expect(page.getByTestId("approvals-toast")).toBeVisible();
  await expect(page.getByTestId("approvals-item-apr_01")).toBeVisible();
  await expect(page.getByTestId("approvals-item-apr_02")).toHaveCount(0);
  await expect(page.getByTestId("approvals-item-apr_01")).toContainText("$340.00");
  watch.expectClean();
});

test("cards list in request order", async ({ page }) => {
  await openOwner(page);
  await seek(page, 39000);
  const ids = await page
    .locator('[data-testid^="approvals-item-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(["approvals-item-apr_01", "approvals-item-apr_02"]);
});

test("Acceptance 4: by the end of d08-approve both cards are sealed, approved and sent, and the toast is gone", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await seek(page, 43000);
  for (const id of ["apr_01", "apr_02"]) {
    const card = page.getByTestId(`approvals-item-${id}`);
    await expect(card.getByTestId(`approvals-seal-${id}`)).toBeVisible();
    await expect(card.getByTestId(`approvals-approve-${id}`)).toHaveCount(0);
  }
  const state = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      approvals: { items: Record<string, { status: string; date?: string }>; followUps: Record<string, { sent: boolean }>; payoutIds: string[] };
    };
    return { items: s.approvals.items, followUps: s.approvals.followUps, payoutIds: s.approvals.payoutIds };
  });
  expect(state.items.apr_01.status).toBe("granted");
  expect(state.items.apr_02.status).toBe("granted");
  expect(state.items.apr_01.date).toBe("2026-10-01");
  expect(Object.values(state.followUps).every((f) => f.sent)).toBe(true);
  expect(state.payoutIds.toSorted()).toEqual(["mpo_01", "mpo_02", "mpo_03"]);
  await expect(page.getByTestId("approvals-toast")).toHaveCount(0);
  watch.expectClean();
});

test("playing through d08-approve at 8x lands both seals", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await page.evaluate(() => {
    const p = window.__cindia!.player as unknown as { pause(): void; seek(ms: number): void; setSpeed(x: number): void; play(): void };
    p.pause();
    p.seek(35000);
    p.setSpeed(8);
    p.play();
  });
  await page.waitForFunction(() => window.__cindia!.player.now() >= 43000);
  await page.evaluate(() => window.__cindia!.player.pause());
  await expect(page.getByTestId("approvals-seal-apr_01")).toBeVisible();
  await expect(page.getByTestId("approvals-seal-apr_02")).toBeVisible();
  watch.expectClean();
});

test("Acceptance 8: in scripted mode the panel shows the Simulated badge", async ({ page }) => {
  await openOwner(page);
  await seek(page, 39000);
  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  expect(sources["b08-approvals"]).toBe("scripted");
  await expect(page.locator('[data-slot="owner.main"]').getByTestId("simulated-badge")).toBeVisible();
});
