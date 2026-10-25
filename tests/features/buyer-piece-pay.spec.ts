// M-buyer T4: the desktop checkout under the split. Acceptance 2 (the tour's token, status and
// promise, and its contribution turning the add-on on), 3 (the add-on starts off, and pay emits one
// checkout and, only when switched on, one contribution), and 6 (a person's checkout of another
// piece gets its own token and ord_user_ order with L10, and leaves pc_01's page alone). Acceptance 7
// is checkoutRules.test.ts. Expected values come from src/mock; L7 and L10 are the glossary's words.
import { expect, test, type Page } from "@playwright/test";
import type { Community, Person, Piece, Project } from "../../src/core/types";
import { demoContribution, getById } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { watchPage } from "../smoke/lib";
import { clientNavigate, loggedEvents, openPage, seed, seekToEvent, storeSlice, withTourEvent } from "./buyer-lib";

/** L7 and L10, word for word from the glossary's on-screen labels. */
const L7 = "Demo project. No money is collected.";
const L10 = "Demo receipt. Nothing was sold.";

function projectOf(pieceId: string): Project {
  const piece = getById<Piece>(pieceId)!;
  const community = getById<Community>(piece.communityId)!;
  return getById<Project>(community.projectIds[0])!;
}

/** pc_01's page 300 ms after the timeline's received receipt for ord_001 (the end of the pay beat). */
async function openAtReceived(page: Page) {
  await openPage(page, "/shop/piece/pc_01");
  await seekToEvent(page, "receipt.updated", { orderId: "ord_001", status: "received" }, 300);
}

/** pc_01's page on a fresh store before the timeline's checkout.started, with its split on screen. */
async function openBeforeCheckout(page: Page) {
  await openPage(page, "/shop/piece/pc_01");
  await seekToEvent(page, "checkout.started", { pieceId: "pc_01" }, -300);
}

test("@T4 after the tour's received receipt: the token, the simulated note, Received and the promise", async ({ page }) => {
  const watch = watchPage(page);
  await openAtReceived(page);
  const maker = getById<Person>("mkr_01")!;
  const { buyer } = await storeSlice(page);
  const card = buyer.cards.pc_01;
  expect(card.token.startsWith("tok_")).toBe(true);

  const token = page.getByTestId("buyer-token");
  await expect(token).toContainText(card.token);
  await expect(token).toContainText("4242");
  await expect(page.getByTestId("buyer-simulated-note")).toContainText(/simulated/i);
  await expect(page.getByTestId("buyer-receipt-status")).toHaveText("Received");
  await expect(page.getByTestId("buyer-receipt-promise")).toHaveText(`We'll show you when ${maker.name.en} is paid.`);
  await expect(page.getByTestId("buyer-receipt-promise")).toHaveText("We'll show you when Grace N. is paid.");
  await expect(page.getByTestId("buyer-receipt-demo-note")).toHaveCount(0);
  // Pay stays on screen, done for this piece.
  await expect(page.getByTestId("buyer-pay-button")).toBeDisabled();
  watch.expectClean();
});

test("@T4 with the tour's project.funded ctb_01, the add-on reads on and names prj_01 and $5.00", async ({ page }) => {
  const watch = watchPage(page);
  await openAtReceived(page);
  await withTourEvent(page, "project.funded", { contributionId: "ctb_01" }, [seed("project.funded", demoContribution)]);
  const project = getById<Project>(demoContribution.projectId)!;
  expect(project.id).toBe("prj_01");

  const addon = page.getByTestId("buyer-project-addon");
  await expect(addon).toHaveAttribute("data-state", "on");
  const contribution = page.getByTestId("buyer-contribution");
  await expect(contribution).toHaveCount(1);
  await expect(contribution).toContainText(project.title.en);
  await expect(contribution).toContainText(formatCents(demoContribution.amountCents));
  expect(formatCents(demoContribution.amountCents)).toBe("$5.00");
  watch.expectClean();
});

test("@T4 the add-on starts off with L7; switched on, pay emits one checkout and one contribution for prj_01", async ({ page }) => {
  const watch = watchPage(page);
  await openBeforeCheckout(page);
  const project = projectOf("pc_01");

  const addon = page.getByTestId("buyer-project-addon");
  await expect(addon).toHaveAttribute("data-state", "off");
  await expect(addon).toContainText(project.title.en);
  await expect(addon).toContainText(formatCents(project.addOnCents));
  await expect(page.getByTestId("buyer-addon-note")).toHaveText(L7);
  expect(await loggedEvents(page, "checkout.started")).toEqual([]);

  await addon.click();
  await expect(addon).toHaveAttribute("data-state", "on");
  await page.getByTestId("buyer-pay-button").click();

  await expect.poll(async () => (await loggedEvents(page, "checkout.started")).length).toBe(1);
  expect((await loggedEvents(page, "checkout.started")).map((e) => e.source)).toEqual(["user"]);
  const funded = await loggedEvents(page, "project.funded");
  expect(funded.map((e) => e.source)).toEqual(["user"]);
  const { projects, buyer } = await storeSlice(page);
  expect(Object.values(projects.contributions)).toEqual([
    expect.objectContaining({ contributionId: "ctb_user_1", projectId: project.id, amountCents: project.addOnCents, buyerId: "buy_01" }),
  ]);
  expect(project.addOnCents).toBe(500);
  expect(Object.values(projects.contributions)[0].orderId).toBeUndefined();
  expect(buyer.checkouts.pc_01).toEqual(expect.objectContaining({ pieceId: "pc_01", grossCents: getById<Piece>("pc_01")!.priceCents }));

  // Locked once this piece's checkout started, and the confirmation names the project and amount.
  await expect(page.getByTestId("buyer-pay-button")).toBeDisabled();
  // force: the switch is disabled, which Playwright's actionability check would wait out.
  await addon.click({ force: true });
  await expect(addon).toHaveAttribute("data-state", "on");
  const line = page.getByTestId("buyer-contribution");
  await expect(line).toContainText(project.title.en);
  await expect(line).toContainText(formatCents(project.addOnCents));

  // The tour's ctb_01 arriving afterwards adds no second line (D1-46).
  await page.evaluate((payload) => {
    const c = window.__cindia!;
    c.emit({ id: "evt_seed_ctb_01", type: "project.funded", at: c.player.now(), source: "scripted", payload });
  }, demoContribution);
  await expect.poll(async () => Object.keys((await storeSlice(page)).projects.contributions).length).toBe(2);
  await expect(page.getByTestId("buyer-contribution")).toHaveCount(1);
  await expect(page.getByTestId("buyer-contribution")).toHaveAttribute("data-contribution-id", "ctb_user_1");
  watch.expectClean();
});

test("@T4 pay with the add-on left off adds no project.funded", async ({ page }) => {
  const watch = watchPage(page);
  await openBeforeCheckout(page);
  await expect(page.getByTestId("buyer-project-addon")).toHaveAttribute("data-state", "off");
  await page.getByTestId("buyer-pay-button").click();
  await expect.poll(async () => (await loggedEvents(page, "checkout.started")).length).toBe(1);
  expect(await loggedEvents(page, "project.funded")).toEqual([]);
  expect((await storeSlice(page)).projects.contributions).toEqual({});
  await expect(page.getByTestId("buyer-contribution")).toHaveCount(0);
  watch.expectClean();
});

test("@T4 a seek turns a switched-on add-on off again", async ({ page }) => {
  const watch = watchPage(page);
  await openBeforeCheckout(page);
  const addon = page.getByTestId("buyer-project-addon");
  await addon.click();
  await expect(addon).toHaveAttribute("data-state", "on");
  await seekToEvent(page, "checkout.started", { pieceId: "pc_01" }, -300);
  await expect(addon).toHaveAttribute("data-state", "off");
  watch.expectClean();
});

test("@T4 pay on pc_02 gets its own token and an ord_user_ order with L10, and pc_01's page shows no token", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_02");
  // A seek first, for a fresh store that drops any pending answer.
  await seekToEvent(page, "split.shown", { pieceId: "pc_01" }, 300);
  await expect(page.getByTestId("buyer-token")).toHaveCount(0);
  await page.getByTestId("buyer-pay-button").click();

  // The keyless scripted answer (contracts section 11) arrives within the default expect timeout.
  const token = page.getByTestId("buyer-token");
  await expect(token).toContainText(/tok_[A-Za-z0-9]{12}/);
  await expect(token).toContainText("4242");
  const status = page.getByTestId("buyer-receipt-status");
  await expect(status).toHaveText("Received");
  await expect(status).toHaveAttribute("data-order-id", /^ord_user_\d+$/);
  const orderId = (await status.getAttribute("data-order-id"))!;
  await expect(page.getByTestId("buyer-receipt-demo-note")).toHaveText(L10);
  await expect(page.getByTestId("buyer-receipt-promise")).toHaveCount(0);

  const { buyer } = await storeSlice(page);
  expect(buyer.cards.pc_02?.pieceId).toBe("pc_02");
  expect(buyer.cards.pc_01).toBeUndefined();
  expect(buyer.orders[orderId]).toEqual(expect.objectContaining({ pieceId: "pc_02", buyerId: "buy_01" }));

  // pc_02's card is filed under pc_02, so pc_01's page shows no token (D1-46).
  await clientNavigate(page, "/shop/piece/pc_01");
  await expect(page.getByTestId("buyer-story-card")).toContainText(getById<Piece>("pc_01")!.title.en);
  await expect(page.getByTestId("buyer-token")).toHaveCount(0);
  await expect(page.getByTestId("buyer-receipt-status")).toHaveCount(0);
  await expect(page.getByTestId("buyer-pay-button")).toBeEnabled();

  // Its receipt is a demo receipt: L10, and no maker's note.
  await clientNavigate(page, `/shop/receipt/${orderId}`);
  const receipt = page.getByTestId("buyer-receipt");
  await expect(receipt).toContainText(orderId);
  await expect(receipt.getByTestId("buyer-receipt-demo-note")).toHaveText(L10);
  await expect(page.getByTestId("buyer-receipt-maker-note")).toHaveCount(0);
  await expect(page.getByTestId("buyer-receipt-promise")).toHaveCount(0);
  watch.expectClean();
});
