// F-process T5: the reconcile, approvals and close views.
import { expect, test } from "@playwright/test";
import { galleryFlag } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { APPROVAL_KIND_LABELS, GLOSSARY } from "../../src/features/process/strings";
import { emitAtClock, open, seekToEvent, watchPage } from "./process-lib";

test("reconcile: the flag shows expected, paid, short and the record to trust", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/month?process=reconcile");
  await seekToEvent(page, "flag.explained", {}, 300);
  const pane = page.getByTestId("process-pane-reconcile");
  const counts = await pane.locator("[data-record-type]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-count"))));
  expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  const flag = page.getByTestId("process-reconcile-flag");
  await expect(flag).toHaveAttribute("data-flag-id", galleryFlag.id);
  await expect(flag.locator('[data-role="expected"]')).toContainText(formatCents(galleryFlag.expectedCents));
  await expect(flag.locator('[data-role="paid"]')).toContainText(formatCents(galleryFlag.actualCents));
  await expect(flag.locator('[data-role="short"]')).toContainText(formatCents(galleryFlag.deltaCents));
  const trust = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as { month: { flags: Record<string, { trustRecordId?: string }> } };
    return Object.values(s.month.flags)[0]?.trustRecordId ?? null;
  });
  expect(trust).not.toBeNull();
  await expect(flag).toHaveAttribute("data-trust", trust!);
  await expect(flag.locator('[data-role="trust"]')).toContainText(GLOSSARY.trust.en);
  watch.expectClean();
});

test("reconcile before the month starts shows the waiting line", async ({ page }) => {
  await open(page, "/sell/month?process=reconcile");
  await seekToEvent(page, "beat.started", {}, 0);
  await expect(page.getByTestId("process-pane-reconcile").getByTestId("process-empty")).toBeVisible();
  await expect(page.getByTestId("process-reconcile-flag")).toHaveCount(0);
});

test("approvals: each approval in the order requested, sealed when granted, with what followed", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/approvals?process=approvals");
  await seekToEvent(page, "payout.sent", {}, 300);
  const list = page.getByTestId("process-approvals-list");
  const ids = await list.locator("[data-approval-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-approval-id")));
  const requested = await page.evaluate(() =>
    window.__cindia!.player
      .getTimeline()!
      .events.filter((e) => e.type === "approval.requested" && e.at <= window.__cindia!.player.now())
      .map((e) => (e.payload as { approvalId: string }).approvalId),
  );
  expect(ids).toEqual([...new Set(requested)]);
  for (const id of ["apr_01", "apr_02"]) {
    const row = list.locator(`[data-approval-id="${id}"]`);
    await expect(row).toHaveAttribute("data-status", "granted");
    await expect(row.locator('[data-role="status"]')).toHaveText(GLOSSARY.approved.en);
    await expect(row.getByRole("img", { name: "Sealed" })).toHaveCount(1);
  }
  await expect(list.locator('[data-approval-id="apr_01"] [data-followed="fup_01"]')).toHaveCount(1);
  await expect(list.locator('[data-approval-id="apr_02"] [data-followed^="mpo_"]')).toHaveCount(3);
  watch.expectClean();
});

test("approvals: a pending approval reads Needs your approval, and a person's inline approval shows what Cindy proposed", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/approvals?process=approvals");
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, 300);
  const list = page.getByTestId("process-approvals-list");
  await expect(list.locator('[data-approval-id="apr_01"]')).toHaveAttribute("data-status", "pending");
  await expect(list.locator('[data-approval-id="apr_01"] [data-role="status"]')).toHaveText(GLOSSARY.approval.en);
  await emitAtClock(page, [
    {
      type: "approval.requested",
      payload: {
        approvalId: "apr_user_91",
        approval: { kind: "listing_publish", subjectIds: ["lst_user_91"], overLimit: false, proposedBy: "cindy", summary: { en: "Publish a person's listing.", zh: "发布一位用户的作品。" }, decisionDate: "2026-10-01" },
      },
      key: "b08-approvals",
    },
  ]);
  const row = list.locator('[data-approval-id="apr_user_91"]');
  await expect(row).toContainText(APPROVAL_KIND_LABELS.listing_publish.en);
  await expect(row).toContainText("Publish a person's listing.");
  watch.expectClean();
});

test("close: the chain lights ledger, close, workbook, statements and the paid receipt as their events arrive", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/close?process=close");
  const chain = page.getByTestId("process-close-chain");
  await seekToEvent(page, "month.started", {}, 0);
  for (const step of ["ledger", "month", "workbook", "statements", "receipt"]) await expect(chain.locator(`[data-step="${step}"]`)).toHaveAttribute("data-lit", "false");
  await seekToEvent(page, "workbook.ready", {}, 300);
  for (const step of ["ledger", "month", "workbook"]) await expect(chain.locator(`[data-step="${step}"]`)).toHaveAttribute("data-lit", "true");
  await expect(chain.locator('[data-step="receipt"]')).toHaveAttribute("data-lit", "false");
  await seekToEvent(page, "receipt.updated", { status: "paid_to_maker" }, 300);
  for (const step of ["ledger", "month", "workbook", "statements", "receipt"]) await expect(chain.locator(`[data-step="${step}"]`)).toHaveAttribute("data-lit", "true");
  await expect(chain.locator('[data-step="receipt"] [data-order-id="ord_001"]')).toHaveCount(1);
  watch.expectClean();
});
