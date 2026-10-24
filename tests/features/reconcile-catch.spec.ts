// F-reconcile T3: the catch. The flag's three figures (acceptance 4), the evidence cards
// (acceptance 5), Cindy's explanation in both languages (acceptance 6), and the same figures
// after any seek (acceptance 8). Expected strings come from the mock records through the kit
// formatters, never typed in.
import { expect, test, type Page } from "@playwright/test";
import type { BankTxn, Contract, Statement } from "../../src/core/types";
import { galleryFlag, getById } from "../../src/mock";
import { formatBps, formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { GLOSSARY } from "../../src/features/reconcile/strings";
import { waitForHooks, watchPage } from "../smoke/lib";

const AFTER_FLAG = 31600;
const END_OF_CATCH = 37900;
const BEFORE_CATCH = 10000;

const contract = getById<Contract>(galleryFlag.recordIds.find((id) => id.startsWith("ctr_"))!)!;
const statement = getById<Statement>(galleryFlag.recordIds.find((id) => id.startsWith("stm_"))!)!;
const deposit = getById<BankTxn>(galleryFlag.recordIds.find((id) => id.startsWith("txn_"))!)!;

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    const c = window.__cindia!;
    c.player.pause();
    c.player.seek(t);
  }, ms);
}

async function openMonthAt(page: Page, ms: number) {
  await page.goto("/studio/month");
  await waitForHooks(page);
  await seek(page, ms);
}

async function expectCards(page: Page) {
  const contractCard = page.getByTestId("reconcile-evidence-contract");
  const statementCard = page.getByTestId("reconcile-evidence-statement");
  const bankCard = page.getByTestId("reconcile-evidence-bank");
  await expect(contractCard).toContainText(formatBps(contract.commissionBps));
  await expect(contractCard).toContainText(formatCents(galleryFlag.expectedCents));
  await expect(contractCard).toContainText(GLOSSARY.trust.en);
  await expect(statementCard).toContainText(formatBps(statement.lines[0]!.commissionBps));
  await expect(statementCard).toContainText(formatCents(statement.totalNetCents));
  await expect(bankCard).toContainText(formatCents(deposit.amountCents));
  await expect(bankCard).toContainText(formatDate(deposit.date, "en"));
  await expect(statementCard).not.toContainText(GLOSSARY.trust.en);
  await expect(bankCard).not.toContainText(GLOSSARY.trust.en);
  return Promise.all([contractCard.innerText(), statementCard.innerText(), bankCard.innerText()]);
}

test("reconcile-flag reads expected, paid and short right after flag.raised", async ({ page }) => {
  const watch = watchPage(page);
  await openMonthAt(page, AFTER_FLAG);
  const flag = page.getByTestId("reconcile-flag");
  await expect(flag).toBeVisible();
  await expect(flag).toContainText(formatCents(galleryFlag.expectedCents));
  await expect(flag).toContainText(formatCents(galleryFlag.actualCents));
  await expect(flag).toContainText(formatCents(Math.abs(galleryFlag.deltaCents)));
  watch.expectClean();
});

test("the evidence cards highlight each record's figure and the contract card says to trust it", async ({ page }) => {
  const watch = watchPage(page);
  await openMonthAt(page, END_OF_CATCH);
  await expectCards(page);
  watch.expectClean();
});

test("reconcile-explanation shows the flag.explained text in English, then in Chinese", async ({ page }) => {
  const watch = watchPage(page);
  await openMonthAt(page, END_OF_CATCH);
  const text = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      month: { flagIds: string[]; flags: Record<string, { explanation?: { en: string; zh: string } }> };
    };
    return s.month.flags[s.month.flagIds[0]!]?.explanation ?? null;
  });
  expect(text, "flag.explained has landed in the store").not.toBeNull();

  const explanation = page.getByTestId("reconcile-explanation");
  const frame = page.getByTestId("frame-studio");
  await expect(frame).toHaveAttribute("lang", /^(en|zh)$/);
  if ((await frame.getAttribute("lang")) === "zh") await page.getByTestId("demo-lang-toggle").click();
  await expect(frame).toHaveAttribute("lang", "en");
  await expect(explanation).toHaveText(text!.en);

  const toggle = page.getByTestId("demo-lang-toggle");
  for (let i = 0; i < 3; i++) {
    if ((await frame.getAttribute("lang")) === "zh") break;
    await toggle.click();
  }
  await expect(frame).toHaveAttribute("lang", "zh");
  await expect(explanation).toHaveText(text!.zh);
  watch.expectClean();
});

test("the same evidence renders after seeking away and back", async ({ page }) => {
  const watch = watchPage(page);
  await openMonthAt(page, END_OF_CATCH);
  const first = await expectCards(page);

  await seek(page, BEFORE_CATCH);
  await expect(page.getByTestId("reconcile-flag")).toHaveCount(0);

  await seek(page, END_OF_CATCH);
  const second = await expectCards(page);
  expect(second).toEqual(first);

  // A fresh load, seeking straight to the end of the catch.
  await openMonthAt(page, END_OF_CATCH);
  const third = await expectCards(page);
  expect(third).toEqual(first);
  watch.expectClean();
});
