// F-proof T3: the real or simulated list. Acceptance 5 (in scripted mode every part reads simulated
// and the panel shows the Simulated badge) and 6 (a live match.made turns b01-match real and leaves
// the other nine alone). Elements are found by test ID only. Expected copy comes from the feature's
// strings, never typed in.
import { expect, test, type Page } from "@playwright/test";
import { SELL_VIEWPORT, openSell, watchPage } from "./sell-views-lib";
import { SOURCE_KEYS } from "../../src/core/events";
import { matches } from "../../src/mock/index";
import { SOURCE_LABELS, UI } from "../../src/features/proof/strings";


// M-desktop: the proof view on /sell/proof at the Sell frame's 1440 by 900.
test.use({ viewport: SELL_VIEWPORT });

async function openProof(page: Page) {
  await openSell(page, "proof");
  // Pause, so no scripted event with the same key lands after the live one in Acceptance 6.
  await page.evaluate(() => window.__cindia!.player.pause());
  await expect(page.getByTestId("proof-sources")).toBeVisible();
}

test("Acceptance 5: in scripted mode every part reads simulated and the panel shows the Simulated badge", async ({ page }) => {
  const watch = watchPage(page);
  await openProof(page);

  const mode = await page.evaluate(() => window.__cindia!.store.getState().mode);
  expect(mode).toBe("scripted");

  for (const key of SOURCE_KEYS) {
    const row = page.getByTestId(`proof-source-${key}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(SOURCE_LABELS[key].en);
    await expect(row).toContainText(UI.simulated.en);
    await expect(row).not.toContainText(UI.real.en);
  }
  await expect(page.getByTestId("proof-sources").locator("[data-testid^='proof-source-']")).toHaveCount(SOURCE_KEYS.length);
  // The list itself doesn't repeat the kit's badge per row; the panel shows it once.
  await expect(page.getByTestId("proof-sources").getByTestId("simulated-badge")).toHaveCount(0);
  await expect(page.getByTestId("frame-studio").getByTestId("simulated-badge").first()).toBeVisible();
  watch.expectClean();
});

test("Acceptance 6: a live match.made turns b01-match real and leaves the other nine simulated", async ({ page }) => {
  const watch = watchPage(page);
  await openProof(page);

  const m = matches[0]!;
  await page.evaluate(
    (match) => {
      const c = window.__cindia!;
      c.emit({
        id: "evt_live_0901",
        type: "match.made",
        at: c.player.now(),
        source: "live",
        key: "b01-match",
        payload: { matchId: match.id, kind: match.kind, recordIds: match.recordIds },
      });
    },
    { id: m.id, kind: m.kind, recordIds: m.recordIds },
  );

  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  expect(sources["b01-match"]).toBe("live");

  const live = page.getByTestId("proof-source-b01-match");
  await expect(live).toContainText(UI.real.en);
  await expect(live).not.toContainText(UI.simulated.en);

  for (const key of SOURCE_KEYS.filter((k) => k !== "b01-match")) {
    const row = page.getByTestId(`proof-source-${key}`);
    await expect(row).toContainText(UI.simulated.en);
    await expect(row).not.toContainText(UI.real.en);
  }
  watch.expectClean();
});
