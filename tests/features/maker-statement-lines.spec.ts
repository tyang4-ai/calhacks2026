// M-maker-statement T3: the lines table and the held note on /maker/mkr_01 at 1440 by 900, just
// after the timeline's statement.issued for mkr_01. Expected titles, dates and figures come from
// src/mock/ and the payload, except the ones the plan names ($134.48, $95.00).
import { expect, test } from "@playwright/test";
import { COLUMNS, GLOSSARY, UI } from "../../src/features/maker-statement/strings";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { pieces } from "../../src/mock/catalog";
import { orders } from "../../src/mock/month";
import { watchPage } from "../smoke/lib";
import { FRAME_VIEWPORT, ORD_001, PC_01, openMaker, seekToStatement, statementFor, toChinese } from "./maker-statement-lib";

test.use({ viewport: FRAME_VIEWPORT });

test("one row per payload line, each with the piece's title, the order's date and the maker's share", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  const st = await statementFor(page);
  expect(st).not.toBeNull();
  const lines = page.getByTestId("maker-statement-lines");
  await expect(lines).toBeVisible();
  // Three column headings: piece, order date, maker share.
  await expect(lines).toContainText(COLUMNS.piece.en);
  await expect(lines).toContainText(COLUMNS.date.en);
  await expect(lines).toContainText(COLUMNS.share.en);
  await expect(lines.locator('[data-testid^="maker-statement-line-"]')).toHaveCount(st!.lines.length);
  for (const line of st!.lines) {
    const row = page.getByTestId(`maker-statement-line-${line.orderId}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(pieces.find((p) => p.id === line.pieceId)!.title.en);
    await expect(row).toContainText(formatDate(orders.find((o) => o.id === line.orderId)!.date, "en"));
    await expect(row).toContainText(formatCents(line.makerShareCents));
  }
  watch.expectClean();
});

test("Acceptance 2: maker-statement-line-ord_001 reads pc_01's English title with $134.48", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  const ord1 = page.getByTestId("maker-statement-line-ord_001");
  await expect(ord1).toContainText(PC_01.title.en);
  await expect(ord1).toContainText("$134.48");
  await expect(ord1).toContainText(formatDate(ORD_001.date, "en"));
  watch.expectClean();
});

test("Acceptance 2 (held): $95.00 with the held note and the line about the gallery's short payment, in seal red", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  const st = await statementFor(page);
  const held = page.getByTestId("maker-statement-held");
  await expect(held).toBeVisible();
  await expect(held).toContainText("$95.00");
  await expect(held).toContainText(formatCents(st!.heldCents));
  await expect(held).toContainText(GLOSSARY.heldNote.en);
  await expect(held).toContainText(UI.heldWhy.en);
  // Seal-red text (#B23A2E) with no alarm styling: no wash behind it.
  const look = await held.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { color: cs.color, background: cs.backgroundColor };
  });
  expect(look.color).toBe("rgb(178, 58, 46)");
  expect(look.background).toBe("rgba(0, 0, 0, 0)");
  // The held note sits under the table.
  const tableBox = (await page.getByTestId("maker-statement-lines").boundingBox())!;
  const heldBox = (await held.boundingBox())!;
  expect(heldBox.y).toBeGreaterThanOrEqual(tableBox.y + tableBox.height - 1);
  watch.expectClean();
});

test("the held note hides when nothing is held", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  // Re-issue mkr_01's statement with nothing held, as a live B10 could.
  await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      close: { statementByMaker: Record<string, string>; statements: Record<string, Record<string, unknown>> };
    };
    const st = s.close.statements[s.close.statementByMaker["mkr_01"]!];
    window.__cindia!.emit({
      id: "evt_ms_held_none",
      type: "statement.issued",
      at: window.__cindia!.player.now(),
      source: "scripted",
      key: "b10-derived",
      payload: { ...st, heldCents: 0 },
    });
  });
  await expect(page.getByTestId("maker-statement-lines")).toBeVisible();
  await expect(page.getByTestId("maker-statement-held")).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 5 (lines): in Chinese the title is pc_01's Chinese title, the date is Chinese and the amounts are unchanged", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  await toChinese(page);
  const lines = page.getByTestId("maker-statement-lines");
  await expect(lines).toContainText(COLUMNS.share.zh);
  const ord1 = page.getByTestId("maker-statement-line-ord_001");
  await expect(ord1).toContainText(PC_01.title.zh);
  await expect(ord1).not.toContainText(PC_01.title.en);
  await expect(ord1).toContainText("2026年9月1日");
  await expect(ord1).toContainText("$134.48");
  const held = page.getByTestId("maker-statement-held");
  await expect(held).toContainText("$95.00");
  await expect(held).toContainText(GLOSSARY.heldNote.zh);
  await expect(held).toContainText(UI.heldWhy.zh);
  watch.expectClean();
});
