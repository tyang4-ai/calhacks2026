// F-money-map T2, on M-desktop's /sell/map at 1440 by 900: one thread per move. Acceptance 2 (the
// money beat's threads), 4 (maker payouts once approved), 5 (two moves on one path show the pair's
// total) and 7 (seek is deterministic). Seeks by event; checks by test ID only. Amounts come from
// the scripted timeline, formatted by the kit's formatter.
import { expect, test, type Page } from "@playwright/test";
import { formatCents } from "../../src/ui/formatCents";
import { SELL_VIEWPORT, inFrame, lastTimelineAt, openSell, timelineAt, watchPage } from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

interface MovePayload {
  moveId: string;
  kind: string;
  from: { kind: string; id?: string };
  to: { kind: string; id?: string };
  amountCents: number;
  refId: string;
  date: string;
}

/** The kit Thread sews a move in 900 ms on the player clock (STITCH_MS in src/ui/motion.ts). */
const STITCH_MS = 900;

/** The money beat's end: after the sync, with every sale thread sewn. */
async function endOfMoney(page: Page): Promise<number> {
  const at3 = (await timelineAt(page, "money.moved", { moveId: "mv_0003" }))!;
  const sync = (await timelineAt(page, "account.synced", { accountId: "acct_studio" }))!;
  const next = (await timelineAt(page, "money.moved", { moveId: "mv_0004" }))!;
  const t = Math.max(sync + 300, at3 + STITCH_MS);
  expect(t, "the money beat's threads are sewn before the maker payouts start").toBeLessThan(next);
  return t;
}

/** After the maker payouts: the last maker_pay move, sewn. */
async function afterPayouts(page: Page): Promise<number> {
  return (await lastTimelineAt(page, "money.moved", { kind: "maker_pay" }))! + STITCH_MS;
}

/** Mid-stitch: halfway between the sale and the card fee. */
async function midSale(page: Page): Promise<number> {
  const at1 = (await timelineAt(page, "money.moved", { moveId: "mv_0001" }))!;
  const at2 = (await timelineAt(page, "money.moved", { moveId: "mv_0002" }))!;
  return Math.round((at1 + at2) / 2);
}

async function seekTo(page: Page, ms: number) {
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, ms);
}

async function timelineMoves(page: Page): Promise<MovePayload[]> {
  return page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline();
    return (tl?.events ?? []).filter((e) => e.type === "money.moved").map((e) => e.payload as MovePayload);
  });
}

const thread = (page: Page, moveId: string) => inFrame(page, "money-map-canvas").getByTestId(`money-map-thread-${moveId}`);

test.describe("money map threads", () => {
  test.beforeEach(async ({ page }) => {
    await openSell(page, "map");
  });

  test("at the end of the money beat the three sale threads are fully sewn with their amounts", async ({ page }) => {
    const watch = watchPage(page);
    const moves = await timelineMoves(page);
    await seekTo(page, await endOfMoney(page));
    const expected: Record<string, string> = { mv_0001: "$180.00", mv_0002: "$5.52", mv_0003: "$156.48" };
    for (const [id, amount] of Object.entries(expected)) {
      const m = moves.find((x) => x.moveId === id);
      expect(m, `${id} is in the timeline`).toBeTruthy();
      expect(formatCents(m!.amountCents)).toBe(amount);
      const el = thread(page, id);
      await expect(el).toHaveCount(1);
      await expect(el).toHaveAttribute("data-progress", "1.00");
      await expect(el).toContainText(amount);
    }
    watch.expectClean();
  });

  test("once the payouts are approved the co-op pays each maker on its own thread", async ({ page }) => {
    const watch = watchPage(page);
    const makerMoves = (await timelineMoves(page)).filter((m) => m.kind === "maker_pay");
    expect(makerMoves.map((m) => m.moveId)).toEqual(["mv_0004", "mv_0005", "mv_0006"]);
    await seekTo(page, await afterPayouts(page));
    for (const m of makerMoves) {
      expect(m.from.kind).toBe("studio");
      expect(m.to.kind).toBe("maker");
      const el = thread(page, m.moveId);
      await expect(el).toHaveCount(1);
      await expect(el).toHaveAttribute("data-progress", "1.00");
      await expect(el).toContainText(formatCents(m.amountCents));
    }
    watch.expectClean();
  });

  test("two moves between the same parties share one path and the label shows their total", async ({ page }) => {
    const watch = watchPage(page);
    const first = (await timelineMoves(page)).find((m) => m.moveId === "mv_0003")!;
    const extraCents = 1000;
    await seekTo(page, await endOfMoney(page));
    await expect(thread(page, "mv_0003")).toHaveAttribute("data-progress", "1.00");

    // A second move on the same pair, fired 1 s before the paused clock so its stitch is finished.
    await page.evaluate(
      ({ base, cents }) => {
        const h = window.__cindia!;
        h.emit({
          id: "evt_t2_9001",
          type: "money.moved",
          at: h.player.now() - 1000,
          source: "scripted",
          key: "b04-bank",
          payload: { ...base, moveId: "mv_9001", amountCents: cents },
        });
      },
      { base: first, cents: extraCents },
    );

    const older = thread(page, "mv_0003");
    const newer = thread(page, "mv_9001");
    await expect(older).toHaveCount(1);
    await expect(newer).toHaveCount(1);
    await expect(newer).toHaveAttribute("data-progress", "1.00");
    // One path: both stitches follow the same curve.
    const olderPath = await older.locator("path").getAttribute("d");
    const newerPath = await newer.locator("path").getAttribute("d");
    expect(newerPath).toBe(olderPath);
    // One label, on the newest, showing the pair's running total.
    await expect(newer).toContainText(formatCents(first.amountCents + extraCents));
    await expect(older.locator("text")).toHaveCount(0);
    watch.expectClean();
  });

  test("a seek renders the same canvas every time", async ({ page }) => {
    const watch = watchPage(page);
    const canvas = inFrame(page, "money-map-canvas");
    const END_MONEY = await endOfMoney(page);
    const AFTER_PAYOUTS = await afterPayouts(page);
    const MID_SALE = await midSale(page);

    const snapshotAt = async (ms: number) => {
      await seekTo(page, ms);
      await expect(thread(page, "mv_0003")).toHaveAttribute("data-progress", "1.00");
      await expect(page.locator('[data-testid^="money-map-thread-mv_0004"]')).toHaveCount(0);
      return canvas.innerHTML();
    };

    const a = await snapshotAt(END_MONEY);
    const b = await snapshotAt(END_MONEY);
    expect(b).toBe(a);

    await seekTo(page, AFTER_PAYOUTS);
    await expect(thread(page, "mv_0006")).toHaveAttribute("data-progress", "1.00");
    const c = await snapshotAt(END_MONEY);
    expect(c).toBe(a);

    // Mid-stitch frames are deterministic too.
    await seekTo(page, MID_SALE);
    await expect(thread(page, "mv_0001")).toHaveCount(1);
    await expect(thread(page, "mv_0002")).toHaveCount(0);
    const mid1 = await canvas.innerHTML();
    await seekTo(page, END_MONEY);
    await seekTo(page, MID_SALE);
    await expect(thread(page, "mv_0002")).toHaveCount(0);
    const mid2 = await canvas.innerHTML();
    expect(mid2).toBe(mid1);
    watch.expectClean();
  });
});
