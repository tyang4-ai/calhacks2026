// Every v2 route renders cleanly: its frame and the top bar with L1, the process bar or its
// placeholder, every slot on the page filled or showing its placeholder (never in error), every
// Sell view with L2 in its header, and no console errors or requests beyond localhost.
import { expect, test } from "@playwright/test";
import { SELL_VIEWS } from "../../src/core/featureTypes";
import { L1_EN, L2_EN, expectNoSlotErrors, expectSlots, shownFrameId, waitForHooks, waitForSlots, watchPage } from "./lib";

const SELL_SLOTS: Record<string, string[]> = {
  overview: ["studio.overview.main"],
  listings: ["studio.listings.main"],
  storefront: ["studio.storefront.main"],
  projects: ["studio.projects.main"],
  map: ["studio.map.main"],
  month: ["studio.month.main", "studio.month.side"],
  close: ["studio.close.main", "studio.close.side"],
  proof: ["studio.proof.main", "studio.proof.side"],
  dashboard: ["studio.dashboard.main"],
  approvals: ["owner.main"],
  watch: ["studio.watch.main"],
};

const ROUTES: { path: string; frame: string; slots: string[] }[] = [
  { path: "/shop", frame: "frame-buyer", slots: ["shop.home.main", "shop.home.communities"] },
  { path: "/shop/search?q=wool&k=wool", frame: "frame-buyer", slots: ["shop.search.main"] },
  { path: "/shop/piece/pc_01", frame: "frame-buyer", slots: ["shop.piece.main", "shop.piece.side"] },
  { path: "/shop/community/com_dine", frame: "frame-buyer", slots: ["shop.community.main"] },
  { path: "/shop/projects", frame: "frame-buyer", slots: ["shop.projects.main"] },
  { path: "/shop/projects/prj_01", frame: "frame-buyer", slots: ["shop.projects.main"] },
  { path: "/shop/receipt/ord_001", frame: "frame-buyer", slots: ["shop.receipt.main"] },
  { path: "/store/dine-weavers", frame: "frame-store", slots: ["store.main"] },
  { path: "/maker/mkr_01", frame: "frame-maker", slots: ["maker.main", "maker.side"] },
  ...SELL_VIEWS.map((view) => ({ path: `/sell/${view}`, frame: "frame-studio", slots: SELL_SLOTS[view] })),
];

test("the route table covers every Sell view", () => {
  expect(Object.keys(SELL_SLOTS)).toEqual([...SELL_VIEWS]);
});

for (const route of ROUTES) {
  test(`${route.path} renders cleanly`, async ({ page }) => {
    const watch = watchPage(page);
    await page.goto(route.path);
    const frame = page.getByTestId(route.frame);
    await expect(frame).toBeVisible();
    await expect(page.getByTestId("shell-topnav")).toBeVisible();
    await expect(page.getByTestId("shell-topnav")).toContainText(L1_EN);
    await expect(page.getByTestId("demo-controls")).toBeVisible();
    await waitForSlots(page);
    // The process bar, or its placeholder until F-process lands.
    await expect(page.getByTestId("process-bar").or(page.getByTestId("slot-process-bar")).first()).toBeVisible();
    await expectSlots(page, ["process.bar", ...route.slots], frame);
    // Nothing else: each page holds exactly its own slots.
    const onPage = await frame.locator("[data-slot]").evaluateAll((els) => els.map((e) => e.getAttribute("data-slot")).toSorted());
    expect(onPage).toEqual(["process.bar", ...route.slots].toSorted());
    if (route.frame === "frame-studio") await expect(frame).toContainText(L2_EN);
    await expectNoSlotErrors(page);
    await waitForHooks(page);
    expect(await page.evaluate(() => Object.keys(window.__cindia ?? {}).toSorted())).toEqual(["emit", "player", "store"]);
    // Let fonts and lazy chunks settle before judging the console and the network.
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.waitForLoadState("networkidle");
    watch.expectClean();
  });
}

test("/demo renders the stage with the four frames, each with its top bar and L1, and the first pitch card up", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/demo");
  await waitForHooks(page);
  await expect(page.getByTestId("demo-stage")).toBeVisible();
  await expect(page.getByTestId("demo-controls")).toBeVisible();
  for (const f of ["frame-buyer", "frame-studio", "frame-maker", "frame-store"]) {
    const frame = page.getByTestId(f);
    await expect(frame).toBeAttached();
    await expect(frame.getByTestId("shell-topnav")).toContainText(L1_EN);
  }
  // Before the first beat the camera is pitch: the first card, with L1 at its foot, and no frame shown.
  await expect(page.getByTestId("demo-stage")).toHaveAttribute("data-camera", "pitch");
  expect(await shownFrameId(page)).toBeNull();
  const card = page.getByTestId("pitch-card-what");
  await expect(card).toBeVisible();
  await expect(card).toContainText(L1_EN);
  await waitForSlots(page);
  await expectSlots(page, ["process.bar", "shop.home.main", "shop.home.communities"], page.getByTestId("frame-buyer"));
  await expectNoSlotErrors(page);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForLoadState("networkidle");
  watch.expectClean();
});

test("/demo?mode=present renders pitch-card-what with no console errors", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/demo?mode=present");
  await waitForHooks(page);
  await expect(page.getByTestId("demo-stage")).toHaveAttribute("data-camera", "pitch");
  await expect(page.getByTestId("pitch-card-what")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__cindia!.player.isPlaying())).toBe(true);
  await page.evaluate(() => window.__cindia!.player.pause());
  await page.evaluate(() => document.fonts.ready.then(() => true));
  watch.expectClean();
});

test("the legacy page and camera are gone: /shop/legacy redirects to /shop, and no beat uses shop-legacy", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/shop/legacy");
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByTestId("frame-buyer")).toBeVisible();
  await expect(page.locator('[data-slot="buyer.main"]')).toHaveCount(0);
  await waitForHooks(page);
  const cameras = await page.evaluate(() =>
    (window.__cindia!.player.getTimeline()?.events ?? []).filter((e) => e.type === "beat.started").map((e) => (e.payload as { camera: string }).camera),
  );
  expect(cameras.length).toBeGreaterThan(0);
  expect(cameras).not.toContain("shop-legacy");
  await page.waitForLoadState("networkidle");
  watch.expectClean();
});

test("/dev/kit renders the kit gallery", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/dev/kit");
  const host = page.getByTestId("dev-kit-gallery");
  await expect(host).toBeVisible();
  // The gallery's own root, which the fallback line never renders.
  await expect(host.getByTestId("kit-gallery")).toBeVisible();
  await expect(page.getByTestId("demo-controls")).toBeVisible();
  await page.waitForLoadState("networkidle");
  watch.expectClean();
});
