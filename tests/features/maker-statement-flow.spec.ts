// M-maker-statement T4: the maker's page plays her statement on /maker/mkr_01 at 1440 by 900, from
// the timeline's payout.sent for mpo_01 to its statement.issued for mkr_01, with event-anchored
// seeks, and the d11-maker IDs sit inside frame-maker. Acceptance 1 to 6.
import { expect, test } from "@playwright/test";
import { GLOSSARY, UI } from "../../src/features/maker-statement/strings";
import { formatCents } from "../../src/ui/formatCents";
import { makerStatements } from "../../src/mock/month";
import { watchPage } from "../smoke/lib";
import {
  BEAT_IDS,
  DINE,
  FRAME_VIEWPORT,
  GRACE,
  MKR_04,
  MPO_01,
  MST_01,
  PC_01,
  expectInsideFrame,
  openMaker,
  seekToEvent,
  seekToStatement,
  slotLang,
  statementFor,
  toChinese,
} from "./maker-statement-lib";

test.use({ viewport: FRAME_VIEWPORT });

test("Acceptance 1: 300 ms before statement.issued for mkr_01, maker-statement-empty shows and no total does", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, -300);
  const empty = page.getByTestId("maker-statement-empty");
  await expect(empty).toBeVisible();
  await expect(empty).toContainText(GLOSSARY.noSalesYet.en);
  await expect(page.getByTestId("maker-statement-total")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-lines")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-held")).toHaveCount(0);
  watch.expectClean();
});

test("from payout.sent to statement.issued: empty until the statement arrives, then the header, lines and held note", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  // Around the payout: the statement isn't issued yet, so the page is still empty and not paid.
  await seekToEvent(page, "payout.sent", { makerPayoutId: MPO_01.id }, -300);
  await expect(page.getByTestId("maker-statement-empty")).toBeVisible();
  await seekToEvent(page, "payout.sent", { makerPayoutId: MPO_01.id }, 300);
  await expect(page.getByTestId("maker-statement-empty")).toBeVisible();
  await expect(page.getByTestId("maker-statement-paid")).toHaveCount(0);

  // Play through statement.issued and wait for it on the player clock.
  await seekToStatement(page, -300);
  await page.evaluate(() => window.__cindia!.player.play());
  await expect(page.getByTestId("maker-statement-total")).toBeVisible();
  await page.evaluate(() => window.__cindia!.player.pause());
  const st = await statementFor(page);
  expect(st, "statement.issued for mkr_01 is in the store").not.toBeNull();
  await expect(page.getByTestId("maker-statement-empty")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-total")).toContainText(formatCents(st!.totalCents));
  await expect(page.getByTestId("maker-statement-lines").locator('[data-testid^="maker-statement-line-"]')).toHaveCount(st!.lines.length);
  await expect(page.getByTestId("maker-statement-held")).toContainText(formatCents(st!.heldCents));
  await expect(page.getByTestId("maker-statement-paid")).toHaveText(GLOSSARY.paid.en);
  watch.expectClean();
});

test("Acceptance 2: 300 ms after statement.issued, as the page opens in English, every figure shows inside the frame", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  expect(await slotLang(page)).toBe("en");
  await seekToStatement(page, 300);
  const st = await statementFor(page);
  expect(st!.totalCents).toBe(MST_01.totalCents);

  const header = page.getByTestId("maker-statement-header");
  await expect(header).toContainText(GRACE.name.en);
  await expect(header).toContainText(DINE.name.en);
  const total = page.getByTestId("maker-statement-total");
  await expect(total).toContainText(GLOSSARY.makerStatement.en);
  await expect(total).toContainText(formatCents(st!.totalCents));
  const ord1 = page.getByTestId("maker-statement-line-ord_001");
  await expect(ord1).toContainText(PC_01.title.en);
  await expect(ord1).toContainText("$134.48");
  const held = page.getByTestId("maker-statement-held");
  await expect(held).toContainText("$95.00");
  await expect(held).toContainText(GLOSSARY.heldNote.en);
  await expect(held).toContainText(UI.heldWhy.en);
  await expect(page.getByTestId("maker-statement-payout-date")).toHaveText("Oct 2, 2026");

  await expectInsideFrame(page, [
    "maker-statement-header",
    ...BEAT_IDS,
    "maker-statement-line-ord_001",
    "maker-statement-payout-date",
    "maker-statement-paid",
  ]);
  watch.expectClean();
});

test("Acceptance 3: at the same moment maker-statement-paid reads Paid, because payout.sent for mpo_01 fired earlier", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  const paidAt = await seekToEvent(page, "payout.sent", { makerPayoutId: MPO_01.id }, 0);
  const shownAt = await seekToStatement(page, 300);
  expect(paidAt).toBeLessThan(shownAt);
  await expect(page.getByTestId("maker-statement-paid")).toHaveText(GLOSSARY.paid.en);
  watch.expectClean();
});

test("Acceptance 4: /maker/mkr_04, an Ojibwe co-op maker with no statement, starts in English with no native name and no sales yet", async ({ page }) => {
  const watch = watchPage(page);
  expect(MKR_04.communityId).toBe("com_ojibwe");
  expect(makerStatements.some((m) => m.makerId === MKR_04.id)).toBe(false);
  await openMaker(page, MKR_04.id);
  expect(await slotLang(page)).toBe("en");
  await seekToStatement(page, 300);
  expect(await statementFor(page, MKR_04.id)).toBeNull();
  const empty = page.getByTestId("maker-statement-empty");
  await expect(empty).toBeVisible();
  await expect(empty).toContainText(GLOSSARY.noSalesYet.en);
  await expect(page.getByTestId("maker-statement-header")).toContainText(MKR_04.name.en);
  await expect(page.getByTestId("maker-statement-native-name")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-total")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-line-ord_001")).toHaveCount(0);
  await expectInsideFrame(page, ["maker-statement-header", "maker-statement-empty"]);
  watch.expectClean();
});

test("Acceptance 5: with the toggle on Chinese, the labels and titles are Chinese, the date reads 2026年10月2日, and the amounts are unchanged", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, 300);
  const st = await statementFor(page);
  await toChinese(page);
  expect(await slotLang(page)).toBe("zh");
  const total = page.getByTestId("maker-statement-total");
  await expect(total).toContainText(GLOSSARY.makerStatement.zh);
  await expect(total).toContainText(formatCents(st!.totalCents));
  const ord1 = page.getByTestId("maker-statement-line-ord_001");
  await expect(ord1).toContainText(PC_01.title.zh);
  await expect(ord1).toContainText("$134.48");
  const held = page.getByTestId("maker-statement-held");
  await expect(held).toContainText("$95.00");
  await expect(held).toContainText(GLOSSARY.heldNote.zh);
  await expect(page.getByTestId("maker-statement-payout-date")).toHaveText("2026年10月2日");
  await expect(page.getByTestId("maker-statement-paid")).toHaveText(GLOSSARY.paid.zh);
  await expectInsideFrame(page, [...BEAT_IDS, "maker-statement-header"]);
  watch.expectClean();
});

test("Acceptance 6: in scripted mode the panel shows the Simulated badge", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seekToStatement(page, -300);
  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  expect(sources["b10-derived"]).toBe("scripted");
  const badge = page.locator('[data-slot="maker.main"]').getByTestId("simulated-badge");
  await expect(badge).toBeVisible();
  await seekToStatement(page, 300);
  await expect(badge).toBeVisible();
  watch.expectClean();
});

test("another maker's page shows only her own statement", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page, "mkr_02");
  await seekToStatement(page, 300);
  const mst02 = makerStatements.find((m) => m.makerId === "mkr_02")!;
  const issued = await statementFor(page, "mkr_02");
  if (issued) {
    await expect(page.getByTestId("maker-statement-total")).toContainText(formatCents(mst02.totalCents));
  } else {
    await expect(page.getByTestId("maker-statement-empty")).toBeVisible();
  }
  await expect(page.getByTestId("maker-statement-line-ord_001")).toHaveCount(0);
  watch.expectClean();
});
