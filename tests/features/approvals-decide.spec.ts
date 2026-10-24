// F-approvals T3: approve, decline and the seal (Acceptance 4 to 6).
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";

type Item = { approvalId: string; status: string; by?: string; date?: string; reason?: { en: string; zh: string }; source?: string };

async function open(page: Page, ms: number) {
  await page.goto("/owner");
  await waitForHooks(page);
  await page.evaluate((at) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(at);
  }, ms);
}

const item = (page: Page, id: string) =>
  page.evaluate((approvalId) => {
    const s = window.__cindia!.store.getState() as unknown as { approvals: { items: Record<string, Item> } };
    return s.approvals.items[approvalId] ?? null;
  }, id);

test("A4: after d08-approve both cards carry the owner's seal and no approve button", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, 43500);
  for (const id of ["apr_01", "apr_02"]) {
    const seal = page.getByTestId(`approvals-seal-${id}`);
    await expect(seal).toBeVisible();
    const granted = await item(page, id);
    expect(granted?.status).toBe("granted");
    expect(granted?.date).toBeTruthy();
    // The seal carries the grant's date (month and day, digits).
    await expect(seal).toContainText(/\d/);
    await expect(page.getByTestId(`approvals-approve-${id}`)).toHaveCount(0);
    await expect(page.getByTestId(`approvals-decline-${id}`)).toHaveCount(0);
  }
  watch.expectClean();
});

test("A5: the owner's tap on apr_02 at 39 s seals it once, and the timeline's grant changes nothing", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, 39000);
  await expect(page.getByTestId("approvals-seal-apr_02")).toHaveCount(0);
  await page.getByTestId("approvals-approve-apr_02").click();

  const seal = page.getByTestId("approvals-seal-apr_02");
  await expect(seal).toBeVisible();
  await expect(page.getByTestId("approvals-approve-apr_02")).toHaveCount(0);
  const first = await item(page, "apr_02");
  expect(first).toMatchObject({ status: "granted", source: "user", by: "own_01" });
  expect(first?.date).toBeTruthy();
  const sealText = await seal.textContent();

  // seek() would reset the store and drop the tap, so replay the timeline's own grant by hand.
  await page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline();
    const grant = tl!.events.find((e) => e.type === "approval.granted" && (e.payload as { approvalId: string }).approvalId === "apr_02");
    if (!grant) throw new Error("no timeline grant for apr_02");
    window.__cindia!.emit(grant);
  });

  const after = await item(page, "apr_02");
  expect(after).toEqual(first);
  await expect(seal).toBeVisible();
  await expect(seal).toHaveText(sealText ?? "");
  await expect(page.getByTestId("approvals-seal-apr_02")).toHaveCount(1);
  watch.expectClean();
});

test("A6: declining apr_01 at 37 s with a reason stores it and shows no seal", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, 37000);
  await page.getByTestId("approvals-decline-apr_01").click();
  const reasonBox = page.getByTestId("approvals-reason-apr_01");
  await expect(reasonBox).toBeVisible();

  // A blank reason submits nothing.
  await reasonBox.press("Enter");
  expect((await item(page, "apr_01"))?.status).toBe("pending");

  const reason = "Ask the gallery to call me first";
  await reasonBox.fill(reason);
  await reasonBox.press("Enter");

  await expect(page.getByTestId("approvals-reason-apr_01")).toHaveCount(0);
  const declined = await item(page, "apr_01");
  expect(declined).toMatchObject({ status: "declined", by: "own_01", source: "user", reason: { en: reason, zh: reason } });
  const card = page.getByTestId("approvals-item-apr_01");
  await expect(card).toContainText(reason);
  await expect(page.getByTestId("approvals-seal-apr_01")).toHaveCount(0);
  await expect(page.getByTestId("approvals-approve-apr_01")).toHaveCount(0);
  watch.expectClean();
});
