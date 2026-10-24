// F-maker-statement T3: the maker's phone plays d10-statement on /maker/mkr_01.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";
import { formatCents } from "../../src/ui/formatCents";
import { makerStatements } from "../../src/mock/month";
import { GLOSSARY } from "../../src/features/maker-statement/strings";

const MST_01 = makerStatements.find((m) => m.id === "mst_01")!;

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function openMaker(page: Page) {
  await page.goto("/maker/mkr_01");
  await waitForHooks(page);
  await expect(page.locator('[data-slot="maker.main"]')).toHaveAttribute("data-slot-state", "filled");
}

test("Acceptance 1: at 46 s, before statement.issued, the empty state shows and no total", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await seek(page, 46000);
  await expect(page.getByTestId("maker-statement-empty")).toBeVisible();
  await expect(page.getByTestId("maker-statement-empty")).toContainText(GLOSSARY.noSalesYet.zh);
  await expect(page.getByTestId("maker-statement-total")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-lines")).toHaveCount(0);
  watch.expectClean();
});

test("playing d10-statement at 8x fills the statement from the event", async ({ page }) => {
  const watch = watchPage(page);
  await openMaker(page);
  await page.evaluate(() => {
    const p = window.__cindia!.player as unknown as { pause(): void; seek(ms: number): void; setSpeed(x: number): void; play(): void };
    p.pause();
    p.seek(47000);
    p.setSpeed(8);
    p.play();
  });
  await page.waitForFunction(() => window.__cindia!.player.now() >= 50000);
  await page.evaluate(() => window.__cindia!.player.pause());

  const payload = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      close: { statementByMaker: Record<string, string>; statements: Record<string, { lines: unknown[]; totalCents: number; heldCents: number }> };
    };
    return s.close.statements[s.close.statementByMaker["mkr_01"]!];
  });
  expect(payload).toBeTruthy();
  expect(payload!.totalCents).toBe(MST_01.totalCents);

  await expect(page.getByTestId("maker-statement-empty")).toHaveCount(0);
  await expect(page.getByTestId("maker-statement-total")).toContainText(GLOSSARY.makerStatement.zh);
  await expect(page.getByTestId("maker-statement-total")).toContainText(formatCents(payload!.totalCents));
  await expect(page.getByTestId("maker-statement-lines").locator('[data-testid^="maker-statement-line-"]')).toHaveCount(payload!.lines.length);
  await expect(page.getByTestId("maker-statement-line-ord_001")).toContainText("牡丹团扇");
  await expect(page.getByTestId("maker-statement-line-ord_001")).toContainText("$134.48");
  await expect(page.getByTestId("maker-statement-held")).toContainText("$95.00");
  await expect(page.getByTestId("maker-statement-held")).toContainText(GLOSSARY.heldNote.zh);
  await expect(page.getByTestId("maker-statement-payout-date")).toContainText("2026年10月2日");
  await expect(page.getByTestId("maker-statement-paid")).toContainText(GLOSSARY.paid.zh);
  watch.expectClean();
});

test("Acceptance 7: in scripted mode the panel shows the Simulated badge", async ({ page }) => {
  await openMaker(page);
  await seek(page, 46000);
  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  expect(sources["b10-derived"]).toBe("scripted");
  await expect(page.locator('[data-slot="maker.main"]').getByTestId("simulated-badge")).toBeVisible();
  await seek(page, 50000);
  await expect(page.locator('[data-slot="maker.main"]').getByTestId("simulated-badge")).toBeVisible();
});

test("a maker with a statement but another maker's page shows only her own", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/maker/mkr_02");
  await waitForHooks(page);
  await seek(page, 50000);
  const mst02 = makerStatements.find((m) => m.makerId === "mkr_02")!;
  // The demo timeline issues only mst_01, so mkr_02 still sees the empty state.
  const issued = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as { close: { statementByMaker: Record<string, string> } };
    return s.close.statementByMaker["mkr_02"] ?? null;
  });
  if (issued) {
    await expect(page.getByTestId("maker-statement-total")).toContainText(formatCents(mst02.totalCents));
  } else {
    await expect(page.getByTestId("maker-statement-empty")).toBeVisible();
    await expect(page.getByTestId("maker-statement-line-ord_001")).toHaveCount(0);
  }
  watch.expectClean();
});
