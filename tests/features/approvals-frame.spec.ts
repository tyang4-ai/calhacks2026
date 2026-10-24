// F-approvals G4 fix: at the end of d08-approve the owner phone shows apr_01 compact (its seal and
// $340.00) above apr_02 in full (seal, three payout lines, $340.00 held), after a seek and while playing.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, watchPage } from "../smoke/lib";

const HELD = '[data-testid="approvals-item-apr_02"] [data-part="held-total"]';
/** apr_01's key figure, $340.00, on its compact card. */
const FOLLOW_UP_AMOUNT = '[data-testid="approvals-item-apr_01"] [data-part="amount"]';
const MUST_SHOW = [
  "approvals-item-apr_01",
  "approvals-seal-apr_01",
  FOLLOW_UP_AMOUNT,
  "approvals-item-apr_02",
  "approvals-seal-apr_02",
  "approvals-payout-mpo_01",
  "approvals-payout-mpo_02",
  "approvals-payout-mpo_03",
  HELD,
];

/** Both $340.00 figures d08-approve names: the follow-up's amount and the held total. */
async function expectFigures(page: Page) {
  await expect(page.locator(FOLLOW_UP_AMOUNT)).toContainText("$340.00");
  await expect(page.locator(HELD)).toContainText("$340.00");
}

async function openOwner(page: Page) {
  await page.goto("/owner");
  await waitForHooks(page);
  await expect(page.locator('[data-slot="owner.main"]')).toHaveAttribute("data-slot-state", "filled");
}

/** For each test ID or selector: is its box fully inside the owner frame and every clipping ancestor? */
async function inFrame(page: Page, ids: string[]) {
  return page.evaluate((list) => {
    const out: Record<string, string> = {};
    const frame = document.querySelector('[data-testid="frame-owner"]');
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
      // 12 px clear of the top and bottom, so the phone's rounded corners can't clip the seal's date.
      const bad = boxes.find((b) => r.top < b.top + 12 || r.bottom > b.bottom - 12 || r.left < b.left - 1 || r.right > b.right + 1);
      out[id] = bad ? `off: el ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)}; box ${Math.round(bad.left)},${Math.round(bad.top)} to ${Math.round(bad.right)},${Math.round(bad.bottom)}` : "ok";
    }
    return out;
  }, ids);
}

const allOk = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, "ok"]));

test("after a seek to 42.7 s both cards, both seals, the payouts and both $340.00 figures sit inside the owner phone", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await page.evaluate(() => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(42700);
  });
  await expect(page.getByTestId("approvals-seal-apr_01")).toBeVisible();
  await expect(page.getByTestId("approvals-seal-apr_02")).toBeVisible();
  await expectFigures(page);
  await expect.poll(() => inFrame(page, MUST_SHOW)).toEqual(allOk(MUST_SHOW));
  watch.expectClean();
});

test("playing through d08-approve at 4x to 42.7 s ends with both cards and seals inside the owner phone", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await page.evaluate(() => {
    const p = window.__cindia!.player as unknown as { pause(): void; seek(ms: number): void; setSpeed(x: number): void; play(): void };
    p.pause();
    p.seek(37500);
    p.setSpeed(4);
    p.play();
  });
  await expect.poll(() => page.evaluate(() => window.__cindia!.player.now()), { timeout: 10000 }).toBeGreaterThanOrEqual(42700);
  await page.evaluate(() => window.__cindia!.player.pause());
  await expectFigures(page);
  await expect.poll(() => inFrame(page, MUST_SHOW)).toEqual(allOk(MUST_SHOW));
  watch.expectClean();
});
