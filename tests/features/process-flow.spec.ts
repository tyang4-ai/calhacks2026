// F-process T8: the view host and the slots. Acceptance 5, 16, 17 and 19, and every view opened in
// turn from the bar.
import { expect, test, type Page } from "@playwright/test";
import { PROCESSES } from "../../src/features/process/processes";
import { open, PROCESS_IDS, seekToEvent, watchPage } from "./process-lib";

test("a block opens its view inside process-view, and the close button or Esc closes it", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/shop");
  await page.getByTestId("process-block-swarm").click();
  await expect(page).toHaveURL(/[?&]process=swarm/);
  await expect(page.getByTestId("process-view").getByTestId("process-pane-swarm")).toBeVisible();
  for (const id of ["process-bar", "process-view", "process-view-close"]) await expect(page.getByTestId(id)).toHaveCount(1);

  await page.getByTestId("process-view-close").click();
  await expect(page.getByTestId("process-view")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("process")).toBeNull();

  await page.getByTestId("process-block-swarm").click();
  await expect(page.getByTestId("process-view")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("process-view")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("process")).toBeNull();
  watch.expectClean();
});

test("every view opens in turn from the bar, each with its pane, its title badge and its log", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/overview");
  await seekToEvent(page, "proof.scored", {}, 300);
  for (const id of PROCESS_IDS) {
    await page.getByTestId(`process-block-${id}`).click();
    const view = page.getByTestId("process-view");
    await expect(view.getByTestId(`process-pane-${id}`)).toBeVisible();
    await expect(view.locator('[data-testid^="process-pane-"]')).toHaveCount(1);
    await expect(view.getByTestId("process-log")).toBeVisible();
    await expect(view.getByTestId("simulated-badge")).toHaveCount(1);
    await expect(page.getByTestId(`process-block-${id}`)).toHaveAttribute("aria-pressed", "true");
    // A view's root is never process-view-<processId>: the only process-view- test ID is the close button.
    expect(await page.locator('[data-testid^="process-view-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))).toEqual(["process-view-close"]);
  }
  watch.expectClean();
});

/** The process's log as the view lists it, and as the store's log holds it filtered to its types. */
async function logs(page: Page, id: keyof typeof PROCESSES) {
  const shown = await page
    .getByTestId("process-log")
    .locator("tbody tr")
    .evaluateAll((rows) => rows.map((r) => ({ id: r.getAttribute("data-event-id"), cells: [...r.querySelectorAll("td")].map((td) => td.textContent?.trim() ?? "") })));
  const types = PROCESSES[id].types as string[];
  const store = await page.evaluate((want) => {
    const s = window.__cindia!.store.getState() as unknown as { log: { entries: { id: string; type: string; at: number; source: string; key?: string }[] } };
    return s.log.entries.filter((e) => want.includes(e.type));
  }, types);
  return { shown, store: store.slice(-50) };
}

test("process-log lists only the view's event types, newest last, each with its time, type, source and key", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/approvals?process=approvals");
  await seekToEvent(page, "payout.sent", {}, 300);
  for (const id of ["approvals", "money", "reconcile"] as const) {
    await page.getByTestId(`process-block-${id}`).click();
    await expect(page.getByTestId(`process-pane-${id}`)).toBeVisible();
    const { shown, store } = await logs(page, id);
    expect(store.length).toBeGreaterThan(0);
    expect(shown.map((r) => r.id)).toEqual(store.map((e) => e.id));
    for (const [i, row] of shown.entries()) {
      const e = store[i];
      expect(row.cells).toHaveLength(4);
      expect(row.cells[0]).toContain((e.at / 1000).toFixed(1));
      expect(row.cells[1]).toBe(e.type);
      expect(PROCESSES[id].types as string[]).toContain(row.cells[1]);
      expect(row.cells[2]).toBe(e.source);
      expect(row.cells[3]).toBe(e.key ?? "–");
    }
  }
  watch.expectClean();
});

/** Every block's status and count, and the open view's text. */
async function snapshot(page: Page) {
  const blocks = await page
    .getByTestId("process-bar")
    .locator(':scope > [data-testid^="process-block-"]')
    .evaluateAll((els) => els.map((e) => `${e.getAttribute("data-testid")}:${e.getAttribute("data-status")}:${e.querySelector('[data-testid^="process-block-count-"]')?.textContent ?? ""}`));
  const view = await page.getByTestId("process-view").innerText();
  return { blocks, view };
}

test("seeking to each beat twice renders every block and the open view the same both times", async ({ page }) => {
  test.setTimeout(120_000);
  const watch = watchPage(page);
  await open(page, "/shop?process=data");
  const beats = await page.evaluate(() =>
    window.__cindia!.player
      .getTimeline()!
      .events.filter((e) => e.type === "beat.started")
      .map((e) => e.payload as Record<string, unknown>),
  );
  expect(beats.length).toBeGreaterThan(0);
  const pass = async () => {
    const out: Awaited<ReturnType<typeof snapshot>>[] = [];
    for (const b of beats) {
      await seekToEvent(page, "beat.started", { beatId: b.beatId, camera: b.camera }, 0);
      await expect(page.getByTestId("process-pane-data")).toBeVisible();
      out.push(await snapshot(page));
    }
    return out;
  };
  const first = await pass();
  const second = await pass();
  expect(second).toEqual(first);
  watch.expectClean();
});

test("no element outside the two slots carries a process- test ID, and a click on the scrim closes the view", async ({ page }) => {
  const watch = watchPage(page);
  await open(page, "/sell/month?process=money");
  await expect(page.getByTestId("process-view")).toBeVisible();
  const outside = await page.locator('[data-testid^="process-"]').evaluateAll(
    (els) => els.filter((e) => !e.closest('[data-slot="process.bar"], [data-slot="process.view"]')).map((e) => e.getAttribute("data-testid")),
  );
  expect(outside).toEqual([]);
  await page.getByTestId("frame-studio").click({ position: { x: 20, y: 140 } });
  await expect(page.getByTestId("process-view")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("process")).toBeNull();
  watch.expectClean();
});
