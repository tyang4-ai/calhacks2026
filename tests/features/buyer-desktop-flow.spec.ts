// M-buyer T6: the piece page and the receipt page walked through the tour's buyer events.
// Acceptance 8 (each page shows the Simulated badge), English only (Gordon's decision, which replaced
// acceptance 9's Chinese labels: decisions.md, Oct 24 11:35 PM and 11:55 PM) and 11: at the end of d03-piece, d05-pay and d12-receipt, every buyer test ID fix-plan 1.2 lists
// for that beat sits inside the frame. Once I2-tour's timeline holds the beats, each check seeks 300
// ms before the next beat starts; until then (Phase A) it seeks to the same buyer events in v1's
// timeline and emits the tour's project.funded ctb_01 from src/mock with tourEvent's seed.
import { expect, test, type Page } from "@playwright/test";
import type { Person, Project } from "../../src/core/types";
import { demoContribution, getById, gallerySplits, receiptNotes, splits } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { watchPage } from "../smoke/lib";
import { CJK, expectInsideFrame, openPage, seed, seekToEvent, storeSlice, timelineHas, tourEvent, withTourEvent } from "./buyer-lib";

const CTB_01 = [seed("project.funded", demoContribution)];

/** The tour's buyer beats on the desktop pages: the route, the beat after it, and the Phase A stand-in. */
const BEATS = {
  "d03-piece": {
    path: "/shop/piece/pc_01",
    next: "d04-support",
    phaseA: { type: "split.shown", match: { pieceId: "pc_01" }, offsetMs: 300 },
    ids: ["buyer-story-card", "buyer-verification", "buyer-split-bar", "buyer-split-maker-share", "buyer-split-compare"],
  },
  "d05-pay": {
    path: "/shop/piece/pc_01",
    next: "d15-listing",
    phaseA: { type: "receipt.updated", match: { orderId: "ord_001", status: "received" }, offsetMs: 300 },
    ids: ["buyer-pay-button", "buyer-project-addon", "buyer-token", "buyer-receipt-status", "buyer-receipt-promise"],
  },
  "d12-receipt": {
    path: "/shop/receipt/ord_001",
    next: "d02-surprise",
    phaseA: { type: "receipt.updated", match: { orderId: "ord_001", status: "paid_to_maker" }, offsetMs: 300 },
    ids: ["buyer-receipt", "buyer-receipt-status", "buyer-receipt-maker-note"],
  },
} as const;

type Beat = keyof typeof BEATS;

/** Opens the beat's page at the end of the beat, with the tour's contribution in the store. */
async function openAtBeatEnd(page: Page, beat: Beat) {
  const b = BEATS[beat];
  await openPage(page, b.path);
  if ((await timelineHas(page, "beat.started", { beatId: b.next })) !== null) {
    await seekToEvent(page, "beat.started", { beatId: b.next }, -300);
  } else {
    await seekToEvent(page, b.phaseA.type, b.phaseA.match, b.phaseA.offsetMs);
    // The tour's ctb_01 comes in d05-pay, before the end of both later beats.
    if (beat !== "d03-piece") await withTourEvent(page, "project.funded", { contributionId: "ctb_01" }, CTB_01);
  }
}

for (const beat of Object.keys(BEATS) as Beat[]) {
  test(`@T6 at the end of ${beat}, every buyer test ID the beat lists is inside the frame`, async ({ page }) => {
    const watch = watchPage(page);
    await openAtBeatEnd(page, beat);
    for (const id of BEATS[beat].ids) await expectInsideFrame(page, id);
    watch.expectClean();
  });

  test(`@T6 ${beat}'s page shows the Simulated badge in scripted mode`, async ({ page }) => {
    const watch = watchPage(page);
    await openAtBeatEnd(page, beat);
    const root = page.getByTestId(beat === "d12-receipt" ? "buyer-receipt-page" : "buyer-piece-page");
    await expect(root.getByTestId("simulated-badge").first()).toBeVisible();
    watch.expectClean();
  });
}

test("@T6 the buyer's walk: the split with the comparison, then pay with the contribution, then the paid receipt with her note", async ({ page }) => {
  const watch = watchPage(page);
  const maker = getById<Person>("mkr_01")!;
  const project = getById<Project>(demoContribution.projectId)!;

  await openPage(page, "/shop/piece/pc_01");
  await seekToEvent(page, "split.shown", { pieceId: "pc_01" }, 300);
  await expect(page.getByTestId("buyer-split-maker-share")).toHaveText(formatCents(splits.pc_01.makerShareCents));
  await expect(page.getByTestId("buyer-split-compare")).toContainText(formatCents(gallerySplits.pc_01.makerShareCents));
  await expect(page.getByTestId("buyer-token")).toHaveCount(0);
  await expect(page.getByTestId("buyer-pay-button")).toBeEnabled();

  // The tour's contribution: seek there once the timeline holds it, or emit it from src/mock.
  await tourEvent(page, "project.funded", { contributionId: "ctb_01" }, 0, CTB_01);
  await expect(page.getByTestId("buyer-project-addon")).toHaveAttribute("data-state", "on");
  await seekToEvent(page, "receipt.updated", { orderId: "ord_001", status: "received" }, 300);
  await withTourEvent(page, "project.funded", { contributionId: "ctb_01" }, CTB_01);
  await expect(page.getByTestId("buyer-token")).toContainText((await storeSlice(page)).buyer.cards.pc_01.token);
  await expect(page.getByTestId("buyer-receipt-status")).toHaveText("Received");
  await expect(page.getByTestId("buyer-receipt-promise")).toContainText(maker.name.en);
  await expect(page.getByTestId("buyer-contribution")).toContainText(project.title.en);

  await openPage(page, "/shop/receipt/ord_001");
  await seekToEvent(page, "receipt.updated", { orderId: "ord_001", status: "paid_to_maker" }, 300);
  await expect(page.getByTestId("buyer-receipt-status")).toContainText("Paid to the maker");
  await expect(page.getByTestId("buyer-receipt-maker-note")).toContainText(receiptNotes.mkr_01.en.split("\n")[0]);
  await expect(page.getByTestId("buyer-receipt-promise")).toHaveCount(0);
  watch.expectClean();
});

test("@T6 English only: at the end of each buyer beat the page reads English, L7 included, and shows no Chinese", async ({ page }) => {
  const watch = watchPage(page);
  await openAtBeatEnd(page, "d05-pay");
  const piecePage = page.getByTestId("buyer-piece-page");
  await expect(piecePage).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("buyer-addon-note")).toHaveText("Demo project. No money is collected.");
  await expect(page.getByTestId("buyer-receipt-status")).toHaveText("Received");
  await expect(page.getByTestId("buyer-split-maker-share")).toHaveText(formatCents(splits.pc_01.makerShareCents));
  await expect(page.getByTestId("buyer-split-compare")).toContainText(formatCents(gallerySplits.pc_01.makerShareCents));
  await expect(page.getByTestId("buyer-split-bar")).toContainText("Maker share");
  await expect(page.getByTestId("buyer-simulated-note")).toHaveText("This checkout is simulated. No card is charged.");
  await expect(piecePage).not.toContainText(CJK);
  for (const id of BEATS["d05-pay"].ids) await expectInsideFrame(page, id);

  for (const beat of ["d03-piece", "d12-receipt"] as const) {
    await openAtBeatEnd(page, beat);
    const root = page.getByTestId(beat === "d12-receipt" ? "buyer-receipt-page" : "buyer-piece-page");
    await expect(root).toBeVisible();
    await expect(root).not.toContainText(CJK);
  }
  watch.expectClean();
});
