// F-approvals T1: the approval cards. Acceptance 1 (the apr_01 card part), 3 (every card says Cindy
// proposed it, and no seal before its grant) and 7 (the cards follow the language toggle).
// Elements are found by test ID only. Expected copy is computed from the mock and the feature's
// strings, never typed in.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";
import type { Approval, Flag, MakerPayout } from "../../src/core/types";
import { approvals, getById } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { GLOSSARY, UI, payoutsSummary, shortPaymentSummary } from "../../src/features/approvals/strings";

const APR_01 = getById<Approval>("apr_01")!;
const APR_02 = getById<Approval>("apr_02")!;
const FLAG = getById<Flag>("flg_01")!;

/** apr_01 is requested at 36000, apr_02 at 38600; grants land at 39800 and 41000. */
const AFTER_APR_01 = 36500;
const AFTER_APR_02 = 39000;

async function openAt(page: Page, ms: number) {
  await page.goto("/owner");
  await waitForSlots(page);
  await waitForHooks(page);
  await seek(page, ms);
}

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, ms);
}

type ItemState = { status: string; requested: boolean };

async function approvalItems(page: Page): Promise<Record<string, ItemState>> {
  return page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as { approvals: { items: Record<string, ItemState> } };
    return s.approvals.items;
  });
}

function payoutsTotalCents(a: Approval): number {
  return a.subjectIds.map((id) => getById<MakerPayout>(id)!).reduce((acc, p) => acc + p.amountCents, 0);
}

test("Acceptance 1: at 36.5 s the apr_01 card shows the follow-up for the short payment, in Chinese", async ({ page }) => {
  const watch = watchPage(page);
  await openAt(page, AFTER_APR_01);

  const items = await approvalItems(page);
  expect(items[APR_01.id]?.requested).toBe(true);
  expect(items[APR_01.id]?.status).toBe("pending");

  const card = page.getByTestId(`approvals-item-${APR_01.id}`);
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("lang", "zh");
  await expect(card).toContainText(UI.followUpTitle.zh);
  await expect(card).toContainText(shortPaymentSummary(formatCents(FLAG.deltaCents)).zh);
  await expect(card).toContainText(formatCents(APR_01.amountCents!));
  await expect(card).toContainText(GLOSSARY.needsApproval.zh);
  await expect(card).toContainText(GLOSSARY.proposedByCindy.zh);
  if (!APR_01.overLimit) await expect(card).not.toContainText(GLOSSARY.overLimit.zh);

  // apr_02 isn't requested yet, so its card isn't there.
  await expect(page.getByTestId(`approvals-item-${APR_02.id}`)).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 3: every card says Cindy proposed it, and no card shows a seal before its grant", async ({ page }) => {
  const watch = watchPage(page);
  await openAt(page, 0);

  for (const ms of [AFTER_APR_01, 37500, AFTER_APR_02, 39500, 39900, 40500, 41500, 45000]) {
    await seek(page, ms);
    const items = await approvalItems(page);
    for (const a of approvals) {
      const card = page.getByTestId(`approvals-item-${a.id}`);
      const item = items[a.id];
      if (!item?.requested) {
        await expect(card, `${a.id} at ${ms} ms`).toHaveCount(0);
        continue;
      }
      await expect(card, `${a.id} at ${ms} ms`).toBeVisible();
      await expect(card, `${a.id} at ${ms} ms says Cindy proposed it`).toContainText(GLOSSARY.proposedByCindy.zh);
      if (item.status !== "granted") {
        await expect(page.getByTestId(`approvals-seal-${a.id}`), `${a.id} has no seal at ${ms} ms`).toHaveCount(0);
      } else {
        await expect(card, `${a.id} reads approved at ${ms} ms`).toContainText(GLOSSARY.approved.zh);
      }
    }
  }

  // The apr_02 card carries its summary and, when the approval says so, the over-limit mark.
  await seek(page, AFTER_APR_02);
  const payouts = page.getByTestId(`approvals-item-${APR_02.id}`);
  await expect(payouts).toContainText(UI.payoutsTitle.zh);
  await expect(payouts).toContainText(payoutsSummary(APR_02.subjectIds.length, formatCents(payoutsTotalCents(APR_02))).zh);
  if (APR_02.overLimit) await expect(payouts).toContainText(GLOSSARY.overLimit.zh);
  watch.expectClean();
});

test("Acceptance 7: one tap on the language toggle turns the cards English", async ({ page }) => {
  const watch = watchPage(page);
  await openAt(page, AFTER_APR_02);

  expect(await page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("auto");
  await page.getByTestId("demo-lang-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("en");

  const followUp = page.getByTestId(`approvals-item-${APR_01.id}`);
  await expect(followUp).toHaveAttribute("lang", "en");
  await expect(followUp).toContainText(UI.followUpTitle.en);
  await expect(followUp).toContainText(shortPaymentSummary(formatCents(FLAG.deltaCents)).en);
  await expect(followUp).toContainText(GLOSSARY.needsApproval.en);
  await expect(followUp).toContainText(GLOSSARY.proposedByCindy.en);
  await expect(followUp).not.toContainText(UI.followUpTitle.zh);

  const payouts = page.getByTestId(`approvals-item-${APR_02.id}`);
  await expect(payouts).toHaveAttribute("lang", "en");
  await expect(payouts).toContainText(UI.payoutsTitle.en);
  await expect(payouts).toContainText(payoutsSummary(APR_02.subjectIds.length, formatCents(payoutsTotalCents(APR_02))).en);
  await expect(payouts).toContainText(GLOSSARY.proposedByCindy.en);
  if (APR_02.overLimit) await expect(payouts).toContainText(GLOSSARY.overLimit.en);
  await expect(payouts).not.toContainText(UI.payoutsTitle.zh);
  watch.expectClean();
});
