// M-approvals T5: the approvals view on /sell/approvals from the end of the catch through
// d09-approve (v1's d08): the empty view, the toast (which covers no line of the detail), the
// selection following the newest approval event (also when it arrived while the view was closed),
// ?ref=, the grants and the payouts going out, and the Simulated badge. Acceptance 1, 4, 7, 14.
import { expect, test, type Page } from "@playwright/test";
import { watchPage } from "../smoke/lib";
import type { Payloads } from "../../src/core/events";
import type { Approval, CounterfeitCandidate, FollowUp, InlineApproval } from "../../src/core/types";
import { allFollowUps, counterfeitCandidates, getById, swarmRuns } from "../../src/mock/index";
import { GLOSSARY, KIND_TITLE } from "../../src/features/approvals/strings";
import { approvalItem, openApprovals, seed, seekToEvent, type Seed } from "./approvals-lib";

const CFT_01 = counterfeitCandidates.find((c) => c.id === "cft_01")! as CounterfeitCandidate;
const FUP_02 = allFollowUps.find((f) => f.id === "fup_02")! as FollowUp;

/** The watch's hit on cft_01, its Reporter's draft and apr_03, as the tour's scan carries them. */
function hitEvents(): Seed[] {
  return [
    {
      type: "counterfeit.flagged",
      key: "b15-watch",
      payload: { cftId: CFT_01.id, scanId: "wsc_01", pieceId: CFT_01.pieceId, url: CFT_01.url, title: CFT_01.title, snippet: CFT_01.snippet, similarity: CFT_01.similarity, claim: CFT_01.claim },
    },
    { type: "followup.drafted", key: "b15-watch", payload: { followUpId: FUP_02.id, approvalId: FUP_02.approvalId, to: FUP_02.to, subject: FUP_02.subject, body: FUP_02.body } },
    { type: "approval.requested", key: "b08-approvals", payload: { approvalId: "apr_03" } },
  ];
}

/** run_02's scripted draft and apr_04, the tour's listing approval. */
function listingEvents(): Seed[] {
  const run = swarmRuns.find((r) => r.runId === "run_02")!;
  const draft = run.final.find((e) => e.type === "listing.drafted")!.payload as Payloads["listing.drafted"];
  return [
    { type: "listing.drafted", key: "b14-swarm", payload: draft },
    { type: "approval.requested", key: "b08-approvals", payload: { approvalId: "apr_04" } },
  ];
}

/**
 * Scrolls the detail to the end of its content, then lists every piece of its text, as far as the
 * detail shows it, that the toast's box overlaps.
 */
async function textUnderToast(page: Page) {
  return page.evaluate(() => {
    const toast = document.querySelector('[data-testid="approvals-toast"]');
    const detail = document.querySelector<HTMLElement>('[data-testid="approvals-detail"]');
    if (!toast || !detail) return { missing: true, atEnd: false, hits: [] as string[] };
    detail.scrollTop = detail.scrollHeight;
    const t = toast.getBoundingClientRect();
    const d = detail.getBoundingClientRect();
    const hits: string[] = [];
    const walker = document.createTreeWalker(detail, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? "").trim();
      if (!text) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of Array.from(range.getClientRects())) {
        const top = Math.max(r.top, d.top);
        const bottom = Math.min(r.bottom, d.bottom);
        if (bottom <= top) continue;
        if (r.right > t.left && r.left < t.right && bottom > t.top && top < t.bottom) hits.push(text.slice(0, 48));
      }
    }
    return { missing: false, atEnd: detail.scrollTop + detail.clientHeight >= detail.scrollHeight - 1, hits };
  });
}

/** Whether two boxes share any area. */
function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test("before any request the view says nothing is waiting, with no cards and no toast", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, -300);
  await expect(page.getByTestId("approvals-empty")).toBeVisible();
  await expect(page.locator('[data-testid^="approvals-item-"]')).toHaveCount(0);
  await expect(page.getByTestId("approvals-toast")).toHaveCount(0);
  watch.expectClean();
});

test("Acceptance 1: 300 ms after apr_01's request the toast says it needs your approval, and its card is there and selected", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, 300);
  await expect(page.getByTestId("approvals-toast")).toBeVisible();
  await expect(page.getByTestId("approvals-toast")).toContainText(GLOSSARY.needsApproval.en);
  await expect(page.getByTestId("approvals-empty")).toHaveCount(0);
  await expect(page.getByTestId("approvals-item-apr_01")).toBeVisible();
  await expect(page.getByTestId("approvals-item-apr_01")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-item-apr_02")).toHaveCount(0);
  await expect(page.getByTestId("approvals-item-apr_01")).toContainText("$340.00");
  watch.expectClean();
});

test("the detail follows the newest request, grant or decline in the log", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  const steps: [string, string, string][] = [
    ["approval.requested", "apr_01", "apr_01"],
    ["approval.requested", "apr_02", "apr_02"],
    ["approval.granted", "apr_01", "apr_01"],
    ["approval.granted", "apr_02", "apr_02"],
  ];
  for (const [type, id, selected] of steps) {
    await seekToEvent(page, type, { approvalId: id }, 300);
    await expect(page.getByTestId(`approvals-item-${selected}`), `after ${type} ${id}`).toHaveAttribute("aria-current", "true");
    const kind = selected === "apr_01" ? KIND_TITLE.follow_up.en : KIND_TITLE.maker_payouts.en;
    await expect(page.getByTestId("approvals-detail"), `after ${type} ${id}`).toContainText(kind);
  }
  watch.expectClean();
});

test("Acceptance 4: by the end of d09-approve both cards are sealed, approved and sent, and the toast is gone", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.granted", { approvalId: "apr_02" }, 1700);
  for (const id of ["apr_01", "apr_02"]) {
    const card = page.getByTestId(`approvals-item-${id}`);
    await expect(card.getByTestId(`approvals-seal-${id}`)).toBeVisible();
    await expect(card.getByTestId(`approvals-approve-${id}`)).toHaveCount(0);
    await expect(card).toContainText(GLOSSARY.approved.en);
    await expect(card).toContainText(GLOSSARY.sent.en);
  }
  const state = await page.evaluate(() => {
    const s = window.__cindia!.store.getState() as unknown as {
      approvals: { followUps: Record<string, { sent: boolean }>; payoutIds: string[] };
    };
    return { followUps: s.approvals.followUps, payoutIds: s.approvals.payoutIds };
  });
  expect((await approvalItem(page, "apr_01"))?.date).toBe("2026-10-01");
  expect((await approvalItem(page, "apr_02"))?.status).toBe("granted");
  expect(Object.values(state.followUps).every((f) => f.sent)).toBe(true);
  expect(state.payoutIds.toSorted()).toEqual(["mpo_01", "mpo_02", "mpo_03"]);
  await expect(page.getByTestId("approvals-toast")).toHaveCount(0);
  watch.expectClean();
});

test("playing through d09-approve at 8x lands both seals", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  const start = await seekToEvent(page, "approval.requested", { approvalId: "apr_01" }, -500);
  const end = await page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline()!;
    return tl.events.find((e) => e.type === "approval.granted" && (e.payload as { approvalId: string }).approvalId === "apr_02")!.at + 1700;
  });
  expect(end).toBeGreaterThan(start);
  await page.evaluate((ms) => {
    const p = window.__cindia!.player;
    p.seek(ms);
    p.setSpeed(8);
    p.play();
  }, start);
  await page.waitForFunction((t) => window.__cindia!.player.now() >= t, end, { timeout: 30000 });
  await page.evaluate(() => window.__cindia!.player.pause());
  await expect(page.getByTestId("approvals-seal-apr_01")).toBeVisible();
  await expect(page.getByTestId("approvals-seal-apr_02")).toBeVisible();
  await expect(page.getByTestId("approvals-item-apr_02")).toHaveAttribute("aria-current", "true");
  watch.expectClean();
});

test("Acceptance 7: /sell/approvals?ref=apr_02 after both requests selects apr_02 and shows its payouts", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page, "apr_02");
  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 300);
  await expect(page.getByTestId("approvals-item-apr_02")).toHaveAttribute("aria-current", "true");
  for (const id of ["mpo_01", "mpo_02", "mpo_03"]) await expect(page.getByTestId("approvals-detail").getByTestId(`approvals-payout-${id}`)).toBeVisible();
  watch.expectClean();
});

test("?ref= holds its approval while newer approval events arrive", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page, "apr_01");
  await seekToEvent(page, "approval.granted", { approvalId: "apr_02" }, 300);
  await expect(page.getByTestId("approvals-item-apr_01")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-detail")).toContainText(KIND_TITLE.follow_up.en);
  await expect(page.getByTestId("approvals-detail").getByTestId("approvals-payout-mpo_01")).toHaveCount(0);
  watch.expectClean();
});

test("while a report waits, the toast covers no text of the detail, at the end of its scroll: L20 and Cindy's line stay in view", async ({ page }) => {
  const watch = watchPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApprovals(page);
  await page.evaluate(() => window.__cindia!.player.pause());
  await seed(page, hitEvents());
  await expect(page.getByTestId("approvals-item-apr_03")).toHaveAttribute("aria-current", "true");
  const toast = page.getByTestId("approvals-toast");
  await expect(toast).toBeVisible();

  const under = await textUnderToast(page);
  expect(under.missing).toBe(false);
  expect(under.atEnd).toBe(true);
  expect(under.hits, "detail text under the toast").toEqual([]);
  const unverified = page.getByTestId("approvals-hit-unverified");
  await expect(unverified).toBeInViewport({ ratio: 1 });
  expect(overlaps((await unverified.boundingBox())!, (await toast.boundingBox())!)).toBe(false);
  watch.expectClean();
});

test("while a listing waits, the toast covers no text of its longer detail either", async ({ page }) => {
  const watch = watchPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApprovals(page);
  await page.evaluate(() => window.__cindia!.player.pause());
  await seed(page, listingEvents());
  await expect(page.getByTestId("approvals-item-apr_04")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-toast")).toBeVisible();
  const under = await textUnderToast(page);
  expect(under.missing).toBe(false);
  expect(under.atEnd).toBe(true);
  expect(under.hits, "detail text under the toast").toEqual([]);
  watch.expectClean();
});

test("opening Approvals after a request that arrived while the view was closed selects that newest request", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.granted", { approvalId: "apr_02" }, 300);
  await page.getByTestId("shell-nav-month").click();
  await expect(page.locator('[data-slot="owner.main"]')).toHaveCount(0);
  const inline: InlineApproval = {
    kind: "listing_publish",
    subjectIds: ["lst_user_3"],
    overLimit: false,
    proposedBy: "cindy",
    summary: { en: "Publish the new listing from your notes.", zh: "Publish the new listing from your notes." },
    decisionDate: "2026-10-01",
  };
  await seed(page, [{ type: "approval.requested", key: "b08-approvals", payload: { approvalId: "apr_user_3", approval: inline } }]);
  await page.getByTestId("shell-nav-approvals").click();
  await expect(page.getByTestId("approvals-item-apr_user_3")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-item-apr_02")).not.toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-detail")).toContainText(inline.summary.en);
  watch.expectClean();
});

test("opening Approvals after a decision that arrived while the view was closed selects the approval it decided", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 300);
  await expect(page.getByTestId("approvals-item-apr_02")).toHaveAttribute("aria-current", "true");
  await page.getByTestId("shell-nav-month").click();
  await expect(page.locator('[data-slot="owner.main"]')).toHaveCount(0);
  const apr01 = getById<Approval>("apr_01")!;
  await seed(page, [{ type: "approval.granted", key: "b08-approvals", payload: { approvalId: apr01.id, by: "own_01", date: apr01.decisionDate } }]);
  await page.getByTestId("shell-nav-approvals").click();
  await expect(page.getByTestId("approvals-item-apr_01")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("approvals-detail")).toContainText(KIND_TITLE.follow_up.en);
  watch.expectClean();
});

test("Acceptance 14: in scripted mode the panel shows the Simulated badge", async ({ page }) => {
  const watch = watchPage(page);
  await openApprovals(page);
  await seekToEvent(page, "approval.requested", { approvalId: "apr_02" }, 300);
  const sources = await page.evaluate(() => window.__cindia!.store.getState().sources);
  for (const key of ["b08-approvals", "b02-explain", "b04-bank", "b14-swarm", "b15-watch"]) expect(sources[key]).toBe("scripted");
  await expect(page.locator('[data-slot="owner.main"]').getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});
