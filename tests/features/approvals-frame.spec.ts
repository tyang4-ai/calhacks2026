// M-approvals T5 (v1's G4 fix, moved to the desktop): at the end of d09-approve (v1's d08) the Sell
// frame's approvals view shows apr_01 (its seal and $340.00) and apr_02 (its seal and $340.00 held),
// with apr_02's three payout lines in the detail, all inside frame-studio and every clipping
// ancestor, after a seek and while playing. Acceptance 4. Moments come from events, never fixed times.
import { expect, test, type Page } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import { openApprovals, seekToEvent } from "./approvals-lib";

const HELD = '[data-testid="approvals-item-apr_02"] [data-part="held-total"]';
/** apr_01's key figure, $340.00, on its card. */
const FOLLOW_UP_AMOUNT = '[data-testid="approvals-item-apr_01"] [data-part="amount"]';
/** d09-approve's own IDs (ui-contract.md). */
const BEAT_IDS = ["approvals-item-apr_01", "approvals-item-apr_02", "approvals-seal-apr_01", "approvals-seal-apr_02"];
const MUST_SHOW = [...BEAT_IDS, FOLLOW_UP_AMOUNT, "approvals-payout-mpo_01", "approvals-payout-mpo_02", "approvals-payout-mpo_03", HELD];

/** Both $340.00 figures d09-approve names: the follow-up's amount and the held total. */
async function expectFigures(page: Page) {
  await expect(page.locator(FOLLOW_UP_AMOUNT)).toContainText("$340.00");
  await expect(page.locator(HELD)).toContainText("$340.00");
}

/** For each test ID or selector: is its box fully inside frame-studio and every clipping ancestor? */
async function inFrame(page: Page, ids: string[]) {
  return page.evaluate((list) => {
    const out: Record<string, string> = {};
    const frame = document.querySelector('[data-testid="frame-studio"]');
    for (const id of list) {
      const el = document.querySelector(id.startsWith("[") ? id : `[data-testid="${id}"]`);
      if (!el || !frame) {
        out[id] = "missing";
        continue;
      }
      const r = el.getBoundingClientRect();
      const boxes = [frame.getBoundingClientRect()];
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowY;
        if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") boxes.push(p.getBoundingClientRect());
      }
      // 12 px clear of the top and bottom of every clipping box, so nothing is cut at an edge.
      const bad = boxes.find((b) => r.top < b.top + 12 || r.bottom > b.bottom - 12 || r.left < b.left - 1 || r.right > b.right + 1);
      out[id] = bad ? `off: el ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)}; box ${Math.round(bad.left)},${Math.round(bad.top)} to ${Math.round(bad.right)},${Math.round(bad.bottom)}` : "ok";
    }
    return out;
  }, ids);
}

const allOk = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, "ok"]));

test("Acceptance 4: 300 ms after the timeline grants apr_02, both cards and both seals sit inside frame-studio", async ({ page }) => {
  const watch = watchPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApprovals(page);
  await seekToEvent(page, "approval.granted", { approvalId: "apr_02" }, 300);
  await expect(page.getByTestId("approvals-seal-apr_01")).toBeVisible();
  await expect(page.getByTestId("approvals-seal-apr_02")).toBeVisible();
  await expect.poll(() => inFrame(page, BEAT_IDS)).toEqual(allOk(BEAT_IDS));
  watch.expectClean();
});

test("at the end of d09-approve (after a seek) the cards, seals, payouts and both $340.00 figures sit inside frame-studio", async ({ page }) => {
  const watch = watchPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApprovals(page);
  // 300 ms before the beat ends: the moment the demo test takes its screenshot.
  await seekToEvent(page, "approval.granted", { approvalId: "apr_02" }, 1700);
  await expect(page.getByTestId("approvals-seal-apr_01")).toBeVisible();
  await expect(page.getByTestId("approvals-seal-apr_02")).toBeVisible();
  await expectFigures(page);
  await expect.poll(() => inFrame(page, MUST_SHOW)).toEqual(allOk(MUST_SHOW));
  watch.expectClean();
});

test("playing through d09-approve at 4x ends with both cards, seals, payouts and figures inside frame-studio", async ({ page }) => {
  const watch = watchPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApprovals(page);
  const end = await page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline()!;
    return tl.events.find((e) => e.type === "approval.granted" && (e.payload as { approvalId: string }).approvalId === "apr_02")!.at + 1700;
  });
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, 1500);
  await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.setSpeed(4);
    p.play();
  });
  await expect.poll(() => page.evaluate(() => window.__cindia!.player.now()), { timeout: 15000 }).toBeGreaterThanOrEqual(end);
  await page.evaluate(() => window.__cindia!.player.pause());
  await expectFigures(page);
  await expect.poll(() => inFrame(page, MUST_SHOW)).toEqual(allOk(MUST_SHOW));
  watch.expectClean();
});
