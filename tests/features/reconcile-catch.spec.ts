// F-reconcile T3, on M-desktop's /sell/month at 1440 by 900: the catch. The flag's three figures
// (acceptance 4), the evidence cards (5), Cindy's explanation (6, English only since 11:35 PM) and the same
// figures after any seek (8). M-desktop's acceptance 4 (the catch's one compact box, at most 1060 by
// 660 px, with v1's figures) and 11 (no "Checked against Nessie" without nessieId), and the scripted
// side of 10 (B16's twin with nessieId puts the words on the bank card). Expected strings come from
// the mock records through the kit formatters, never typed in. Seeks by event.
import { expect, test, type Page } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import type { BankTxn, Contract, Statement } from "../../src/core/types";
import { galleryFlag, getById } from "../../src/mock";
import { formatBps, formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { GLOSSARY, UI } from "../../src/features/reconcile/strings";
import {
  SELL_VIEWPORT,
  boxOf,
  emitAtClock,
  expectInsideFrame,
  expectReadableText,
  monthAnchors,
  openSell,
  seed,
  seekToEvent,
  seekTo,
  unionBox,
  watchPage,
  type Box,
} from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

const contract = getById<Contract>(galleryFlag.recordIds.find((id) => id.startsWith("ctr_"))!)!;
const statement = getById<Statement>(galleryFlag.recordIds.find((id) => id.startsWith("stm_"))!)!;
const deposit = getById<BankTxn>(galleryFlag.recordIds.find((id) => id.startsWith("txn_"))!)!;

const CATCH_IDS = ["reconcile-flag", "reconcile-evidence-contract", "reconcile-evidence-statement", "reconcile-evidence-bank", "reconcile-explanation"];
const NESSIE = UI.checkedNessie.en;

/** Opens the month 300 ms after the timeline's flag.explained for the flag. */
async function openAtCatch(page: Page) {
  await openSell(page, "month");
  await seekToEvent(page, "flag.explained", { flagId: galleryFlag.id }, 300);
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
  await openSell(page, "month");
  await seekToEvent(page, "flag.raised", { flagId: galleryFlag.id }, 100);
  const flag = page.getByTestId("reconcile-flag");
  await expect(flag).toBeVisible();
  await expect(flag).toContainText(formatCents(galleryFlag.expectedCents));
  await expect(flag).toContainText(formatCents(galleryFlag.actualCents));
  await expect(flag).toContainText(formatCents(Math.abs(galleryFlag.deltaCents)));
  watch.expectClean();
});

test("the evidence cards highlight each record's figure and the contract card says to trust it", async ({ page }) => {
  const watch = watchPage(page);
  await openAtCatch(page);
  await expectCards(page);
  watch.expectClean();
});

test("300 ms after flag.explained the flag, its three cards and the explanation sit in one box of at most 1060 by 660, with v1's figures", async ({ page }) => {
  const watch = watchPage(page);
  await openAtCatch(page);
  await expectInsideFrame(page, CATCH_IDS);
  // The G3 screen rule: no text under 14 px, none cut with an ellipsis or clipped, at 1440 by 900.
  await expectReadableText(page, '[data-slot="studio.month.main"]');
  const boxes: Box[] = [];
  for (const id of CATCH_IDS) boxes.push((await boxOf(page, id))!);
  const box = unionBox(boxes);
  expect(box.width, "the catch's box width").toBeLessThanOrEqual(1060);
  expect(box.height, "the catch's box height").toBeLessThanOrEqual(660);
  // The sell-catch camera zooms 1.35 on this box, so it must fit the 1440 by 900 stage at that zoom.
  expect(box.width * 1.35).toBeLessThanOrEqual(1440);
  expect(box.height * 1.35).toBeLessThanOrEqual(900);
  await expect(page.getByTestId("reconcile-evidence-contract")).toContainText("40%");
  await expect(page.getByTestId("reconcile-evidence-statement")).toContainText("50%");
  await expect(page.getByTestId("reconcile-evidence-bank")).toContainText("$1,700.00");
  await expect(page.getByTestId("reconcile-flag")).toContainText("$2,040.00");
  await expect(page.getByTestId("reconcile-flag")).toContainText("$340.00");
  // Acceptance 11: the scripted flag has no nessieId, so no card says it was checked against Nessie.
  await expect(page.getByTestId("reconcile-evidence-bank")).not.toContainText(NESSIE);
  await expect(page.locator('[data-slot="studio.month.main"]')).not.toContainText(NESSIE);
  watch.expectClean();
});

test("B16's twin of flag.raised with nessieId puts Checked against Nessie on the bank card, with the same figures", async ({ page }) => {
  const watch = watchPage(page);
  await openAtCatch(page);
  const before = await expectCards(page);
  const scripted = await page.evaluate((flagId) => {
    const e = window.__cindia!.player.getTimeline()!.events.find((ev) => ev.type === "flag.raised" && (ev.payload as { flagId: string }).flagId === flagId);
    return e!.payload;
  }, galleryFlag.id);
  const twin = { ...(scripted as Payloads["flag.raised"]), nessieId: "spec-nessie-flag" };
  await emitAtClock(page, [seed("flag.raised", twin, { key: "b16-bank-books", source: "live" })]);
  await expect(page.getByTestId("reconcile-evidence-bank")).toContainText(NESSIE);
  await expect(page.getByTestId("reconcile-evidence-contract")).not.toContainText(NESSIE);
  await expect(page.getByTestId("reconcile-evidence-statement")).not.toContainText(NESSIE);
  // The figures stay the payload's, and the explanation stays.
  await expect(page.getByTestId("reconcile-flag")).toContainText(formatCents(galleryFlag.expectedCents));
  await expect(page.getByTestId("reconcile-flag")).toContainText(formatCents(Math.abs(galleryFlag.deltaCents)));
  await expect(page.getByTestId("reconcile-explanation")).toBeVisible();
  const after = await expectCards(page);
  expect(after[0]).toEqual(before[0]);
  expect(after[1]).toEqual(before[1]);
  await expectInsideFrame(page, CATCH_IDS);
  watch.expectClean();
});

test("reconcile-explanation shows the flag.explained text (English only, decisions.md 11:35 PM)", async ({ page }) => {
  const watch = watchPage(page);
  await openAtCatch(page);
  const text = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      month: { flagIds: string[]; flags: Record<string, { explanation?: { en: string; zh: string } }> };
    };
    return s.month.flags[s.month.flagIds[0]!]?.explanation ?? null;
  });
  expect(text, "flag.explained has landed in the store").not.toBeNull();

  const explanation = page.getByTestId("reconcile-explanation");
  const frame = page.getByTestId("frame-studio");
  // The Sell site is English only: no toggle, the frame and the explanation in English.
  await expect(frame).toHaveAttribute("lang", "en");
  await expect(explanation).toHaveText(text!.en);
  watch.expectClean();
});

test("the same evidence renders after seeking away and back", async ({ page }) => {
  const watch = watchPage(page);
  await openAtCatch(page);
  const a = await monthAnchors(page);
  const first = await expectCards(page);

  await seekTo(page, a.flag - 1);
  await expect(page.getByTestId("reconcile-flag")).toHaveCount(0);

  await seekTo(page, a.explained + 300);
  const second = await expectCards(page);
  expect(second).toEqual(first);

  // A fresh load, seeking straight to the catch.
  await openAtCatch(page);
  const third = await expectCards(page);
  expect(third).toEqual(first);
  watch.expectClean();
});
