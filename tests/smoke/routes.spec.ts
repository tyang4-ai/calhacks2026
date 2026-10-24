// Every route renders with no console errors, and every slot shows its placeholder test ID
// (or is filled by its feature, never in error). Fonts and images load from localhost only.
import { expect, test } from "@playwright/test";
import { expectNoSlotErrors, expectSlots, waitForHooks, waitForSlots, watchPage } from "./lib";

const STUDIO_VIEWS: Record<string, string[]> = {
  map: ["studio.map.main"],
  month: ["studio.month.main", "studio.month.side"],
  close: ["studio.close.main", "studio.close.side"],
  proof: ["studio.proof.main"],
  dashboard: ["studio.dashboard.main"],
};

const ROUTES: { path: string; frames: string[]; slots: string[] }[] = [
  {
    path: "/demo",
    frames: ["frame-buyer", "frame-studio", "frame-owner", "frame-maker"],
    slots: ["buyer.main", "studio.map.main", "owner.main", "maker.main"],
  },
  { path: "/buyer", frames: ["frame-buyer"], slots: ["buyer.main"] },
  ...Object.entries(STUDIO_VIEWS).map(([view, slots]) => ({ path: `/studio/${view}`, frames: ["frame-studio"], slots })),
  { path: "/studio/month?drawer=ask", frames: ["frame-studio"], slots: ["studio.month.main", "studio.month.side", "studio.drawer.ask"] },
  { path: "/studio/close?drawer=audit&ref=flg_01", frames: ["frame-studio"], slots: ["studio.close.main", "studio.close.side", "studio.drawer.audit"] },
  { path: "/owner", frames: ["frame-owner"], slots: ["owner.main"] },
  { path: "/maker/mkr_01", frames: ["frame-maker"], slots: ["maker.main"] },
];

for (const route of ROUTES) {
  test(`${route.path} renders cleanly`, async ({ page }) => {
    const watch = watchPage(page);
    await page.goto(route.path);
    for (const f of route.frames) await expect(page.getByTestId(f)).toBeVisible();
    if (route.path === "/demo") await expect(page.getByTestId("demo-stage")).toBeVisible();
    await expect(page.getByTestId("demo-controls")).toBeVisible();
    await waitForSlots(page);
    await expectSlots(page, route.slots);
    await expectNoSlotErrors(page);
    await waitForHooks(page);
    expect(await page.evaluate(() => Object.keys(window.__cindia ?? {}).toSorted())).toEqual(["emit", "player", "store"]);
    // Let fonts and lazy chunks settle before judging the console and the network.
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.waitForLoadState("networkidle");
    watch.expectClean();
  });
}

test("the root, unknown routes and unknown studio views redirect to /demo", async ({ page }) => {
  const watch = watchPage(page);
  for (const path of ["/", "/nowhere", "/studio/nope", "/studio"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByTestId("demo-stage")).toBeVisible();
  }
  watch.expectClean();
});

test("the ask drawer opens from the URL, and Esc closes it and removes the parameter", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/studio/month?drawer=ask");
  await waitForSlots(page);
  const drawer = page.locator('[data-slot="studio.drawer.ask"]');
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(page).toHaveURL(/\/studio\/month$/);
  watch.expectClean();
});

test("the audit drawer gets its ref, one drawer at a time, and switching views closes it", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/studio/close?drawer=audit&ref=flg_01");
  await waitForSlots(page);
  await expect(page.locator('[data-slot="studio.drawer.audit"]')).toBeVisible();
  await expect(page.locator('[data-slot="studio.drawer.ask"]')).toHaveCount(0);
  await page.locator('nav [data-view="proof"]').click();
  await expect(page).toHaveURL(/\/studio\/proof$/);
  await expect(page.locator('[data-slot="studio.drawer.audit"]')).toHaveCount(0);
  watch.expectClean();
});

test("piece placeholder images load from localhost", async ({ page }) => {
  for (let i = 1; i <= 12; i++) {
    const id = `pc_${String(i).padStart(2, "0")}`;
    const res = await page.request.get(`/images/${id}.svg`);
    expect(res.status(), id).toBe(200);
    expect(res.headers()["content-type"]).toContain("svg");
  }
});
