// M-desktop T2: the money map at desktop size, 1440 by 900. Acceptance 1 (the money beat's IDs and
// the fund moves inside frame-studio), 2 (a milestone draws one thread, Cindia to the maker; two
// funds sit in the frame and their threads never cross the co-op's), 8 (the Simulated badge) and
// 11 (no "Checked against Nessie" without nessieId). Seeks by event; checks by test ID only.
import { expect, test, type Page } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { demoFundMoves, worksInProgress } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { strings } from "../../src/features/money-map/strings";
import {
  SELL_VIEWPORT,
  emitAtClock,
  expectInsideFrame,
  inFrame,
  openSell,
  seed,
  seekToEvent,
  seekToLastEvent,
  expectReadableText,
  timelineAt,
  tourEvent,
  watchPage,
} from "./sell-views-lib";

test.use({ viewport: SELL_VIEWPORT });

type Move = Payloads["money.moved"];

const thread = (page: Page, moveId: string) => inFrame(page, "money-map-canvas").getByTestId(`money-map-thread-${moveId}`);
const NESSIE = strings.checkedNessie.en;

/** The milestone a grant of apr_05 pays: wip_01's second milestone, its share of the price, half up. */
const wip01 = worksInProgress[0];
const mls02 = wip01.milestones[1];
const milestoneMove: Move = {
  moveId: "mv_user_1",
  kind: "milestone",
  from: { kind: "cindia" },
  to: { kind: "maker", id: wip01.makerId },
  amountCents: Math.round((wip01.priceCents * mls02.shareBps) / 10000),
  refId: mls02.milestoneId,
  date: "2026-10-02",
};

/** A project contribution from a buyer through Cindia to a project's fund, as two project_fund moves. */
function fundMoves(n: number, projectId: string, nessieId?: string): Move[] {
  const base = { kind: "project_fund" as const, amountCents: 500, refId: `ctb_spec_${n}`, date: "2026-09-02" };
  return [
    { ...base, moveId: `mv_spec_${n}a`, from: { kind: "buyer", id: "buy_02" }, to: { kind: "cindia" }, ...(nessieId ? { nessieId } : {}) },
    { ...base, moveId: `mv_spec_${n}b`, from: { kind: "cindia" }, to: { kind: "community_fund", id: projectId }, ...(nessieId ? { nessieId } : {}) },
  ];
}

/** Seeks to the end of the money the timeline moves (the last money.moved, sewn). */
async function afterAllMoves(page: Page) {
  await seekToLastEvent(page, "money.moved", {}, 1000);
}

/** The thread's path, sampled along its length, in page pixels. */
async function pathPoints(page: Page, moveId: string, n = 48): Promise<{ x: number; y: number }[]> {
  return thread(page, moveId)
    .locator("path")
    .first()
    .evaluate((el, count) => {
      const path = el as SVGPathElement;
      const m = path.getScreenCTM();
      const len = path.getTotalLength();
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i <= count; i++) {
        const p = path.getPointAtLength((len * i) / count);
        out.push(m ? { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f } : { x: p.x, y: p.y });
      }
      return out;
    }, n);
}

type Pt = { x: number; y: number };

/** The z of the cross product (p - o) x (q - o): which side of the line o-p the point q is on. */
function cross(o: Pt, p: Pt, q: Pt): number {
  return (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
}

function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Whether two sampled paths cross anywhere away from their end points (paths that leave the same node may meet there). */
function pathsCross(p: { x: number; y: number }[], q: { x: number; y: number }[], endSlackPx = 6): boolean {
  const nearEnd = (pt: { x: number; y: number }) =>
    [p[0], p[p.length - 1], q[0], q[q.length - 1]].some((e) => Math.hypot(e.x - pt.x, e.y - pt.y) < endSlackPx);
  for (let i = 0; i + 1 < p.length; i++) {
    for (let j = 0; j + 1 < q.length; j++) {
      if (nearEnd(p[i]) || nearEnd(q[j])) continue;
      if (segmentsCross(p[i], p[i + 1], q[j], q[j + 1])) return true;
    }
  }
  return false;
}

test("300 ms after the money beat's account.synced, the canvas, the sale and settlement threads and the balance sit inside frame-studio", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "map");
  await seekToEvent(page, "account.synced", { accountId: "acct_studio" }, 300);
  await expectInsideFrame(page, ["money-map-canvas", "money-map-thread-mv_0001", "money-map-thread-mv_0003", "money-map-balance"]);
  // The G3 screen rule: no text under 14 px, none cut with an ellipsis or clipped, at 1440 by 900.
  await expectReadableText(page, '[data-slot="studio.map.main"]');
  await expect(inFrame(page, "money-map-thread-mv_0001")).toContainText("$180.00");
  await expect(inFrame(page, "money-map-thread-mv_0003")).toContainText("$156.48");
  // Acceptance 8: scripted mode shows the badge on the map's panel.
  await expect(page.locator('[data-slot="studio.map.main"]').getByTestId("simulated-badge")).toBeVisible();
  // Acceptance 11: no move in the timeline carries nessieId, so nothing says it was checked.
  await expect(inFrame(page, "money-map-canvas")).not.toContainText(NESSIE);
  watch.expectClean();
});

test("the tour's fund moves draw mv_0101 and mv_0102 at $5.00 each, to the community fund of prj_01, inside the frame", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "map");
  // Before I2-tour the timeline doesn't carry the fund moves: they're emitted from src/mock/ after the sync.
  if ((await timelineAt(page, "money.moved", { moveId: "mv_0102" })) === null) await seekToEvent(page, "account.synced", { accountId: "acct_studio" }, 300);
  await tourEvent(
    page,
    "money.moved",
    { moveId: "mv_0102" },
    300,
    demoFundMoves.map((m) => seed("money.moved", m, { key: "b04-bank" })),
  );
  await expect(thread(page, "mv_0101")).toHaveCount(1);
  await expect(thread(page, "mv_0102")).toHaveCount(1);
  await expect(inFrame(page, "money-map-node-community_fund-prj_01")).toBeVisible();
  await expectInsideFrame(page, ["money-map-thread-mv_0101", "money-map-thread-mv_0102", "money-map-node-community_fund-prj_01"]);
  // The G3 screen rule: no text under 14 px, none cut with an ellipsis or clipped, at 1440 by 900.
  await expectReadableText(page, '[data-slot="studio.map.main"]');
  await expect(thread(page, "mv_0101")).toContainText(formatCents(500));
  await expect(thread(page, "mv_0102")).toContainText(formatCents(500));
  // The fund's node names the party and its project, from the glossary and src/mock/.
  await expect(inFrame(page, "money-map-node-community_fund-prj_01")).toContainText("Community fund");
  await expect(inFrame(page, "money-map-node-community_fund-prj_01")).toContainText("Looms for two new weavers");
  // The sale on the same buyer-to-Cindia pair keeps its own amount: the contribution never merges into it.
  await expect(thread(page, "mv_0001")).toContainText("$180.00");
  await expect(inFrame(page, "money-map-canvas")).not.toContainText(NESSIE);
  watch.expectClean();
});

test("a milestone move draws exactly one new thread, from Cindia to the maker's node, and no buyer-to-Cindia thread", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "map");
  await afterAllMoves(page);
  const threads = inFrame(page, "money-map-canvas").locator('[data-testid^="money-map-thread-"]');
  const before = await threads.count();
  const buyerThreads = async () => inFrame(page, "money-map-canvas").locator('[data-pair^="buyer>"] [data-testid^="money-map-thread-"]').count();
  const buyerBefore = await buyerThreads();

  await emitAtClock(page, [seed("money.moved", milestoneMove, { key: "b08-approvals" })], -1000);
  await expect(threads).toHaveCount(before + 1);
  expect(await buyerThreads()).toBe(buyerBefore);
  const t = thread(page, milestoneMove.moveId);
  await expect(t).toHaveAttribute("data-progress", "1.00");
  await expect(t).toContainText(formatCents(milestoneMove.amountCents));
  await expectInsideFrame(page, [`money-map-thread-${milestoneMove.moveId}`]);
  // The G3 screen rule: no text under 14 px, none cut with an ellipsis or clipped, at 1440 by 900.
  await expectReadableText(page, '[data-slot="studio.map.main"]');

  // The path leaves Cindia's node and arrives at the maker's.
  const pts = await pathPoints(page, milestoneMove.moveId);
  const near = async (testId: string, pt: { x: number; y: number }) => {
    const box = (await inFrame(page, testId).boundingBox())!;
    const dx = Math.max(box.x - pt.x, 0, pt.x - (box.x + box.width));
    const dy = Math.max(box.y - pt.y, 0, pt.y - (box.y + box.height));
    return Math.hypot(dx, dy);
  };
  expect(await near("money-map-node-cindia", pts[0])).toBeLessThan(12);
  expect(await near(`money-map-node-maker-${wip01.makerId}`, pts[pts.length - 1])).toBeLessThan(12);
  await expect(inFrame(page, "money-map-canvas")).not.toContainText(NESSIE);
  watch.expectClean();
});

test("funds for prj_01 and prj_03 both sit inside the frame, and no fund thread crosses the co-op's threads", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "map");
  await afterAllMoves(page);
  const coopMoves = ["mv_0001", "mv_0002", "mv_0003", "mv_0004", "mv_0005", "mv_0006"];
  for (const id of coopMoves) await expect(thread(page, id)).toHaveAttribute("data-progress", "1.00");

  const seeded = [...fundMoves(1, "prj_01"), ...fundMoves(3, "prj_03")];
  await emitAtClock(page, seeded.map((m) => seed("money.moved", m, { key: "b04-bank" })), -1000);
  await expectInsideFrame(page, ["money-map-node-community_fund-prj_01", "money-map-node-community_fund-prj_03", ...seeded.map((m) => `money-map-thread-${m.moveId}`)]);

  const coop = await Promise.all(coopMoves.map((id) => pathPoints(page, id)));
  for (const m of seeded) {
    await expect(thread(page, m.moveId)).toHaveAttribute("data-progress", "1.00");
    const fund = await pathPoints(page, m.moveId);
    coop.forEach((c, i) => expect(pathsCross(fund, c), `${m.moveId} crosses ${coopMoves[i]}`).toBe(false));
  }
  watch.expectClean();
});

test("a move with nessieId says Checked against Nessie beside its amount, and one without doesn't", async ({ page }) => {
  const watch = watchPage(page);
  await openSell(page, "map");
  await seekToEvent(page, "account.synced", { accountId: "acct_studio" }, 300);
  const [toCindia, toFund] = fundMoves(7, "prj_01");
  await emitAtClock(page, [seed("money.moved", toCindia, { key: "b04-bank" }), seed("money.moved", { ...toFund, nessieId: "spec-nessie-7" }, { key: "b16-bank-books", source: "live" })], -1000);
  await expect(thread(page, toFund.moveId)).toContainText(formatCents(500));
  await expect(thread(page, toFund.moveId)).toContainText(NESSIE);
  await expect(thread(page, toCindia.moveId)).not.toContainText(NESSIE);
  await expect(thread(page, "mv_0003")).not.toContainText(NESSIE);
  await expectInsideFrame(page, [`money-map-thread-${toFund.moveId}`]);
  // The G3 screen rule: no text under 14 px, none cut with an ellipsis or clipped, at 1440 by 900.
  await expectReadableText(page, '[data-slot="studio.map.main"]');
  watch.expectClean();
});
