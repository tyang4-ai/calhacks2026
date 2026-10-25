// M-buyer T5: the receipt page. Acceptance 4 (paid to the maker with her name, share, date and her
// own note, inside the frame), the promise while received, the contribution that names the order,
// 8 (the Simulated badge) and 9 (Chinese labels, her note as she wrote it, L10 in Chinese).
// Expected values come from src/mock and the timeline's payloads; L10 is the glossary's words.
import { expect, test, type Page } from "@playwright/test";
import type { Person, Project } from "../../src/core/types";
import { demoContribution, getById, receiptNotes } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { BADGE_WORDS } from "../../src/ui/strings";
import { watchPage } from "../smoke/lib";
import { clientNavigate, expectInsideFrame, openPage, seed, seekToEvent, storeSlice, withTourEvent } from "./buyer-lib";

const L10 = { en: "Demo receipt. Nothing was sold.", zh: "演示收据。没有发生任何交易。" };

async function openReceiptAt(page: Page, status: "received" | "paid_to_maker") {
  await openPage(page, "/shop/receipt/ord_001");
  await seekToEvent(page, "receipt.updated", { orderId: "ord_001", status }, 300);
}

async function toChinese(page: Page) {
  // The toggle cycles auto, en, zh.
  await page.getByTestId("demo-lang-toggle").click();
  await page.getByTestId("demo-lang-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("zh");
}

test("@T5 paid to the maker: Grace N., $134.48, Oct 2, 2026 and her own note with the Demo data badge, inside the frame", async ({ page }) => {
  const watch = watchPage(page);
  await openReceiptAt(page, "paid_to_maker");
  const r = (await storeSlice(page)).buyer.receipts.ord_001;
  expect(r.status).toBe("paid_to_maker");
  const maker = getById<Person>(r.makerId)!;
  expect(maker.name.en).toBe("Grace N.");

  const receipt = page.getByTestId("buyer-receipt");
  const status = page.getByTestId("buyer-receipt-status");
  for (const el of [receipt, status]) {
    await expect(el).toContainText("Paid to the maker");
    await expect(el).toContainText(maker.name.en);
    await expect(el).toContainText(formatCents(r.makerShareCents));
    await expect(el).toContainText(formatDate(r.paidDate!, "en"));
  }
  await expect(status).toContainText("$134.48");
  await expect(status).toContainText("Oct 2, 2026");

  const note = page.getByTestId("buyer-receipt-maker-note");
  const words = receiptNotes.mkr_01;
  expect(words, "receiptNotes.mkr_01 in src/mock/people.ts").toBeTruthy();
  for (const line of words.en.split("\n")) await expect(note).toContainText(line);
  await expect(note).toContainText(maker.name.en);
  await expect(note.getByRole("img", { name: maker.surnameChar, exact: true })).toHaveText(maker.surnameChar);
  await expect(note).toContainText(BADGE_WORDS.demo.en);
  await expect(page.getByTestId("buyer-receipt-promise")).toHaveCount(0);
  await expect(page.getByTestId("buyer-receipt-demo-note")).toHaveCount(0);

  for (const id of ["buyer-receipt", "buyer-receipt-status", "buyer-receipt-maker-note"]) await expectInsideFrame(page, id);
  watch.expectClean();
});

test("@T5 received: the promise names the maker, and no note yet", async ({ page }) => {
  const watch = watchPage(page);
  await openReceiptAt(page, "received");
  const maker = getById<Person>("mkr_01")!;
  await expect(page.getByTestId("buyer-receipt-status")).toHaveText(/^Received/);
  await expect(page.getByTestId("buyer-receipt-promise")).toHaveText(`We'll show you when ${maker.name.en} is paid.`);
  await expect(page.getByTestId("buyer-receipt-maker-note")).toHaveCount(0);
  await expectInsideFrame(page, "buyer-receipt-promise");
  watch.expectClean();
});

test("@T5 the contribution that names ord_001 shows on its receipt", async ({ page }) => {
  const watch = watchPage(page);
  await openReceiptAt(page, "paid_to_maker");
  await withTourEvent(page, "project.funded", { contributionId: "ctb_01" }, [seed("project.funded", demoContribution)]);
  const project = getById<Project>(demoContribution.projectId)!;
  const line = page.getByTestId("buyer-receipt").getByTestId("buyer-contribution");
  await expect(line).toContainText(project.title.en);
  await expect(line).toContainText(formatCents(demoContribution.amountCents));
  await expectInsideFrame(page, "buyer-receipt-maker-note");
  watch.expectClean();
});

test("@T5 the receipt page shows the Simulated badge in scripted mode", async ({ page }) => {
  const watch = watchPage(page);
  await openReceiptAt(page, "received");
  await expect(page.getByTestId("buyer-receipt-page").getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});

test("@T5 in Chinese the labels read Chinese, the amounts stay, and her note stays as she wrote it", async ({ page }) => {
  const watch = watchPage(page);
  await openReceiptAt(page, "paid_to_maker");
  await toChinese(page);
  const r = (await storeSlice(page)).buyer.receipts.ord_001;
  const maker = getById<Person>(r.makerId)!;

  const status = page.getByTestId("buyer-receipt-status");
  await expect(status).toContainText("已付给匠人");
  await expect(status).not.toContainText("Paid to the maker");
  await expect(status).toContainText(formatCents(r.makerShareCents));
  await expect(status).toContainText(formatDate(r.paidDate!, "zh"));
  const note = page.getByTestId("buyer-receipt-maker-note");
  // Her own words in her own language (maker.lang), never translated by the page.
  for (const line of receiptNotes[maker.id][maker.lang].split("\n")) await expect(note).toContainText(line);
  await expectInsideFrame(page, "buyer-receipt-maker-note");
  watch.expectClean();
});

test("@T5 a person's own order shows L10 in Chinese, with no promise and no note", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/piece/pc_02");
  await seekToEvent(page, "split.shown", { pieceId: "pc_01" }, 300);
  await toChinese(page);
  await page.getByTestId("buyer-pay-button").click();
  const status = page.getByTestId("buyer-receipt-status");
  await expect(status).toHaveAttribute("data-order-id", /^ord_user_\d+$/);
  await expect(page.getByTestId("buyer-receipt-demo-note")).toHaveText(L10.zh);
  const orderId = (await status.getAttribute("data-order-id"))!;

  await clientNavigate(page, `/shop/receipt/${orderId}`);
  await expect(page.getByTestId("buyer-receipt").getByTestId("buyer-receipt-demo-note")).toHaveText(L10.zh);
  await expect(page.getByTestId("buyer-receipt-promise")).toHaveCount(0);
  await expect(page.getByTestId("buyer-receipt-maker-note")).toHaveCount(0);
  watch.expectClean();
});

test("@T5 an unknown order shows a short note and a link back to Shop", async ({ page }) => {
  const watch = watchPage(page);
  await openPage(page, "/shop/receipt/ord_nope");
  await expect(page.getByTestId("buyer-receipt")).toBeVisible();
  await expect(page.getByTestId("buyer-receipt-status")).toHaveCount(0);
  await expect(page.getByTestId("buyer-receipt-page").getByRole("link")).toHaveAttribute("href", "/shop");
  watch.expectClean();
});
