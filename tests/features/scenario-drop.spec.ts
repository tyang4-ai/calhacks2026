// F-scenario T1: the drop zone on /studio/month, inside scenario-panel.
// Scripted mode: a dropped or picked file shows its name and a note, and is never read or sent.
// Live mode (demo-mode-toggle): a small .csv is read as text and sent as scenario.loaded with
// source "user"; a file over 200 KB gets a note and no event. Selects by test ID only. The player is
// paused and seeked before any interaction, because the registry's answers drop on an epoch change.
import { expect, test, type Page } from "@playwright/test";
import { scenarioId } from "../../src/mock/index";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";

interface LoggedEvent {
  type: string;
  source: string;
  key?: string;
  payload: { scenarioId?: string; fileName?: string; recordIds?: string[]; content?: string };
}

declare global {
  interface Window {
    cindiaDropLog?: LoggedEvent[];
    cindiaReads?: number;
  }
}

const MAX_BYTES = 200 * 1024;
const panel = (page: Page) => page.getByTestId("scenario-panel");
const dropzone = (page: Page) => panel(page).getByTestId("scenario-dropzone");
const fileInput = (page: Page) => dropzone(page).locator("input[type=file]");

async function openMonth(page: Page) {
  await page.goto("/studio/month");
  await waitForHooks(page);
  await waitForSlots(page);
  await page.evaluate(() => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(p.durationMs());
  });
  await expect(dropzone(page)).toBeVisible();
}

/** Logs every event the store takes in, and counts every way the page could read a file. */
async function startWatch(page: Page) {
  await page.evaluate(async () => {
    const path = "/src/core/store.ts";
    const mod = (await import(/* @vite-ignore */ path)) as {
      onEvent(l: (e: LoggedEvent) => void): () => void;
      getState(): unknown;
    };
    if (mod.getState() !== window.__cindia!.store.getState()) throw new Error("imported a second store instance");
    window.cindiaDropLog = [];
    mod.onEvent((e) => window.cindiaDropLog!.push({ type: e.type, source: e.source, key: e.key, payload: { ...e.payload } }));

    window.cindiaReads = 0;
    const count = <A extends unknown[], R>(fn: (...a: A) => R) =>
      function (this: unknown, ...a: A): R {
        window.cindiaReads! += 1;
        return fn.apply(this, a);
      };
    Blob.prototype.text = count(Blob.prototype.text);
    Blob.prototype.arrayBuffer = count(Blob.prototype.arrayBuffer);
    Blob.prototype.stream = count(Blob.prototype.stream);
    for (const m of ["readAsText", "readAsArrayBuffer", "readAsDataURL", "readAsBinaryString"] as const) {
      FileReader.prototype[m] = count(FileReader.prototype[m]) as never;
    }
  });
}

const scenarioLoads = (page: Page) =>
  page.evaluate(() => window.cindiaDropLog!.filter((e) => e.type === "scenario.loaded"));

/** Drops one file on the drop zone through a real DataTransfer. */
async function dropFile(page: Page, name: string, text: string, type: string) {
  const dt = await page.evaluateHandle(
    ([n, body, mime]) => {
      const d = new DataTransfer();
      d.items.add(new File([body], n, { type: mime }));
      return d;
    },
    [name, text, type] as const,
  );
  await dropzone(page).dispatchEvent("dragenter", { dataTransfer: dt });
  await dropzone(page).dispatchEvent("dragover", { dataTransfer: dt });
  await dropzone(page).dispatchEvent("drop", { dataTransfer: dt });
}

async function goLive(page: Page) {
  await page.getByTestId("demo-mode-toggle").click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
}

const CSV = "date,piece,sale,commission\n2026-10-03,Lotus panel,180000,72000\n";

test("the month view's scenario panel shows the drop zone and its file input", async ({ page }) => {
  const watch = watchPage(page);
  await openMonth(page);
  await expect(fileInput(page)).toHaveCount(1);
  await expect(fileInput(page)).toHaveAttribute("accept", /\.csv/);
  await expect(fileInput(page)).toHaveAttribute("accept", /\.json/);
  await expect(panel(page).getByTestId("scenario-file")).toHaveCount(0);
  await expect(panel(page).getByTestId("scenario-note")).toHaveCount(0);
  watch.expectClean();
});

test("scripted mode: a dropped file shows its name and the note, and is never read or sent", async ({ page }) => {
  const watch = watchPage(page);
  await openMonth(page);
  expect(await page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("scripted");
  await startWatch(page);

  await dropFile(page, "gallery-october.csv", CSV, "text/csv");
  await expect(panel(page).getByTestId("scenario-file")).toHaveText("gallery-october.csv");
  await expect(panel(page).getByTestId("scenario-note")).toHaveCount(1);
  await expect(panel(page).getByTestId("scenario-note")).toBeVisible();

  // The picker behaves the same way, even for a file it couldn't read anyway.
  await fileInput(page).setInputFiles({ name: "big.json", mimeType: "application/json", buffer: Buffer.alloc(MAX_BYTES + 10, "a") });
  await expect(panel(page).getByTestId("scenario-file")).toHaveText("big.json");
  await expect(panel(page).getByTestId("scenario-note")).toHaveCount(1);

  // Let any stray async work settle, then check nothing was read or emitted.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  expect(await page.evaluate(() => window.cindiaReads)).toBe(0);
  expect(await page.evaluate(() => window.cindiaDropLog!.length)).toBe(0);
  const scenario = await page.evaluate(() => window.__cindia!.store.getState().scenario as { scenarioIds: string[] });
  expect(scenario.scenarioIds).toEqual([]);
  await expect(panel(page).getByTestId("simulated-badge")).toBeVisible();
  watch.expectClean();
});

test("live mode: a small .csv is read and sent as scenario.loaded with source user and its text", async ({ page }) => {
  const watch = watchPage(page);
  await openMonth(page);
  await goLive(page);
  await startWatch(page);

  await dropFile(page, "gallery-october.csv", CSV, "text/csv");
  await expect(panel(page).getByTestId("scenario-file")).toHaveText("gallery-october.csv");
  await expect.poll(async () => (await scenarioLoads(page)).length).toBe(1);
  const [loaded] = await scenarioLoads(page);
  expect(loaded.source).toBe("user");
  expect(loaded.key).toBeUndefined();
  expect(loaded.payload).toEqual({ scenarioId, fileName: "gallery-october.csv", recordIds: [], content: CSV });
  await expect(panel(page).getByTestId("scenario-note")).toBeVisible();

  // The picker sends the same request for a .json file.
  const json = JSON.stringify({ lines: [{ date: "2026-10-05", sale: 90000 }] });
  await fileInput(page).setInputFiles({ name: "gallery.json", mimeType: "application/json", buffer: Buffer.from(json) });
  await expect.poll(async () => (await scenarioLoads(page)).length).toBe(2);
  expect((await scenarioLoads(page))[1].payload).toEqual({ scenarioId, fileName: "gallery.json", recordIds: [], content: json });
  watch.expectClean();
});

test("live mode: a file over 200 KB or of another type gets a note and no event", async ({ page }) => {
  const watch = watchPage(page);
  await openMonth(page);
  await goLive(page);
  await startWatch(page);

  await fileInput(page).setInputFiles({ name: "huge.csv", mimeType: "text/csv", buffer: Buffer.alloc(MAX_BYTES + 1, "a") });
  await expect(panel(page).getByTestId("scenario-file")).toHaveText("huge.csv");
  await expect(panel(page).getByTestId("scenario-note")).toHaveCount(1);
  await expect(panel(page).getByTestId("scenario-note")).toBeVisible();

  await dropFile(page, "statement.pdf", "%PDF-1.7", "application/pdf");
  await expect(panel(page).getByTestId("scenario-file")).toHaveText("statement.pdf");
  await expect(panel(page).getByTestId("scenario-note")).toHaveCount(1);

  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  expect(await scenarioLoads(page)).toEqual([]);
  expect(await page.evaluate(() => window.cindiaReads)).toBe(0);
  watch.expectClean();
});
