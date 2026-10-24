// F-audit T2: the trail view. Opens the audit drawer straight on a record through ?ref= after the
// close, and checks the steps, the bank record at the end and every amount against the dataset.
// Expected IDs and amounts come from src/mock and the kit's formatter, never typed in.
import { expect, test, type Page } from "@playwright/test";
import type { Flag, Refund } from "../../src/core/types";
import { UI } from "../../src/features/audit/strings";
import { bankTxns, getById } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { waitForHooks, watchPage } from "../smoke/lib";

/** Opens the drawer on a record's trail and seeks the paused player just past month.closed. */
async function openTrail(page: Page, ref: string) {
  await page.goto(`/studio/close?drawer=audit&ref=${ref}`);
  await waitForHooks(page);
  const at = await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.pause();
    return p.getTimeline()?.events.find((e) => e.type === "month.closed")?.at ?? null;
  });
  expect(at, "a month.closed in the timeline").not.toBeNull();
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, at! + 1);
  await expect(page.getByTestId("audit-trail")).toBeVisible();
}

interface ShownAmount {
  recordId: string;
  field: string;
  text: string;
}

/** Every amount the trail shows, with the step's record ID and the dataset field it names. */
async function shownAmounts(page: Page): Promise<ShownAmount[]> {
  return page.getByTestId("audit-trail").evaluate((ol) =>
    Array.from(ol.querySelectorAll<HTMLElement>(":scope > [data-record-id]")).flatMap((li) =>
      Array.from(li.querySelectorAll<HTMLElement>("[data-field]")).map((el) => ({
        recordId: li.dataset.recordId ?? "",
        field: el.dataset.field ?? "",
        text: (el.textContent ?? "").trim(),
      })),
    ),
  );
}

async function expectAmountsMatchDataset(page: Page) {
  const shown = await shownAmounts(page);
  expect(shown.length, "amounts shown in the trail").toBeGreaterThan(0);
  for (const a of shown) {
    const rec = getById(a.recordId) as unknown as Record<string, unknown> | undefined;
    expect(rec, `record ${a.recordId}`).toBeDefined();
    const cents = rec![a.field];
    expect(typeof cents, `${a.recordId}.${a.field} is a number`).toBe("number");
    expect(a.text, `${a.recordId}.${a.field}`).toBe(formatCents(cents as number));
  }
}

test("mpo_01's trail runs through ord_001 and ends at the bank record that paid the maker", async ({ page }) => {
  const watch = watchPage(page);
  await openTrail(page, "mpo_01");
  const txn = bankTxns.find((x) => x.refId === "mpo_01");
  expect(txn, "the bank txn for mpo_01").toBeDefined();

  await expect(page.getByTestId("audit-step-mpo_01")).toBeVisible();
  await expect(page.getByTestId("audit-step-ord_001")).toBeVisible();
  const bank = page.getByTestId("audit-bank-record");
  await expect(bank).toHaveCount(1);
  await expect(bank).toHaveAttribute("data-record-id", txn!.id);
  await expect(page.getByTestId(`audit-step-${txn!.id}`)).toHaveCount(0);
  await expect(bank).toContainText(UI.sourceOfTruth.en);
  await expect(bank).toContainText(UI.sourceOfTruthNote.en);
  await expect(bank).toContainText(formatCents(txn!.amountCents));

  // The bank record is the last step in the list.
  const lastId = await page
    .getByTestId("audit-trail")
    .evaluate((ol) => (ol.lastElementChild as HTMLElement | null)?.dataset.testid ?? null);
  expect(lastId).toBe("audit-bank-record");

  await expectAmountsMatchDataset(page);
  watch.expectClean();
});

test("flg_01's trail shows the contract, the statement and the deposit with expected and actual", async ({ page }) => {
  const watch = watchPage(page);
  await openTrail(page, "flg_01");
  const flag = getById<Flag>("flg_01")!;
  const [contractId, statementId, txnId] = flag.recordIds;

  await expect(page.getByTestId(`audit-step-${contractId}`)).toBeVisible();
  await expect(page.getByTestId(`audit-step-${statementId}`)).toBeVisible();
  await expect(page.getByTestId("audit-bank-record")).toHaveAttribute("data-record-id", txnId);

  const flagStep = page.getByTestId("audit-step-flg_01");
  await expect(flagStep).toContainText(formatCents(flag.expectedCents));
  await expect(flagStep).toContainText(formatCents(flag.actualCents));
  await expect(flagStep).toContainText(UI.expected.en);
  await expect(flagStep).toContainText(UI.actual.en);

  await expectAmountsMatchDataset(page);
  watch.expectClean();
});

test("ord_020's trail reaches rfd_001 and the payout it was netted from", async ({ page }) => {
  const watch = watchPage(page);
  await openTrail(page, "ord_020");
  const refund = getById<Refund>("rfd_001")!;
  const netted = bankTxns.find((x) => x.refId === refund.nettedInPayoutId);

  await expect(page.getByTestId("audit-step-ord_020")).toBeVisible();
  await expect(page.getByTestId("audit-step-rfd_001")).toBeVisible();
  await expect(page.getByTestId(`audit-step-${refund.nettedInPayoutId}`)).toBeVisible();
  if (netted) await expect(page.getByTestId("audit-bank-record")).toHaveAttribute("data-record-id", netted.id);

  await expectAmountsMatchDataset(page);
  watch.expectClean();
});

test("with reduced motion every step shows at once", async ({ page }) => {
  const watch = watchPage(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTrail(page, "mpo_01");
  const opacities = await page
    .getByTestId("audit-trail")
    .evaluate((ol) =>
      Array.from(ol.querySelectorAll<HTMLElement>(":scope > [data-record-id]")).map((li) => getComputedStyle(li).opacity),
    );
  expect(opacities.length).toBeGreaterThan(1);
  for (const o of opacities) expect(o).toBe("1");
  watch.expectClean();
});

test("without reduced motion the steps unfold and all have landed soon after opening", async ({ page }) => {
  const watch = watchPage(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openTrail(page, "mpo_01");
  await expect
    .poll(
      () =>
        page
          .getByTestId("audit-trail")
          .evaluate((ol) =>
            Array.from(ol.querySelectorAll<HTMLElement>(":scope > [data-record-id]")).every(
              (li) => getComputedStyle(li).opacity === "1",
            ),
          ),
      // The unfold is capped at about 1.46 s (1300 ms of delays plus one 160 ms step); the extra
      // second is slack for a machine shared with other agents' runs.
      { timeout: 2500 },
    )
    .toBe(true);
  watch.expectClean();
});
