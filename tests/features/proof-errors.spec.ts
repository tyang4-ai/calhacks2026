// F-proof T2: the error list. Acceptance 2 (each planted error shows caught, with its kind and
// records), 3 (an emitted proof.scored with err_03 missed) and 4 (before proof.scored, each item
// shows its expected result and no verdict). Elements are found by test ID only. Expected copy is
// computed from the mock and the feature's strings, never typed in.
import { expect, test, type Page } from "@playwright/test";
import { waitForHooks, waitForSlots, watchPage } from "../smoke/lib";
import type { Order, Piece, PlantedError } from "../../src/core/types";
import { answerKey, getById } from "../../src/mock/index";
import { formatCents } from "../../src/ui/formatCents";
import { formatMonth } from "../../src/ui/formatDate";
import { EXPECTED, KIND_LABELS, UI, recordTypeLabel } from "../../src/features/proof/strings";

/** proof.scored fires at 59.0 s in the demo timeline. */
const SCORED_AT = 59000;
const AFTER = 59500;
const BEFORE = 58000;

async function openAt(page: Page, ms: number) {
  await page.goto("/studio/proof");
  await waitForSlots(page);
  await waitForHooks(page);
  await page.evaluate((t) => {
    const p = window.__cindia!.player;
    p.pause();
    p.seek(t);
  }, ms);
}

/** The studio console starts in English. */
function expectedEn(err: PlantedError): string {
  const e = err.expected as Record<string, unknown>;
  switch (err.kind) {
    case "short_payment":
      return EXPECTED.shortPayment(formatCents(e.expectedCents as number), formatCents(e.actualCents as number), formatCents(e.deltaCents as number)).en;
    case "bundled":
      return EXPECTED.bundled(err.recordIds.filter((id) => id.startsWith("ord_")).length).en;
    case "refund_netted":
      return EXPECTED.refundNetted().en;
    case "carried_over":
      return EXPECTED.carriedOver(formatMonth(e.intoMonthId as string, "en")).en;
  }
}

async function expectRecords(page: Page, err: PlantedError) {
  const item = page.getByTestId(`proof-item-${err.id}`);
  await expect(item).toContainText(UI.records.en);
  for (const id of err.recordIds) {
    const type = recordTypeLabel(id);
    expect(type, `${id} has a record-type label`).toBeDefined();
    await expect(item, `${err.id} names ${id}`).toContainText(`${type!.en} ${id}`);
    if (id.startsWith("ord_")) {
      const piece = getById<Piece>(getById<Order>(id)!.pieceId)!;
      await expect(item, `${err.id} names the piece for ${id}`).toContainText(piece.title.en);
    }
  }
}

test("Acceptance 2: after proof.scored every planted error shows caught, with its kind and records", async ({ page }) => {
  const watch = watchPage(page);
  await openAt(page, AFTER);
  expect(await page.evaluate(() => window.__cindia!.player.now())).toBeGreaterThanOrEqual(SCORED_AT);

  expect(answerKey.map((e) => e.id)).toEqual(["err_01", "err_02", "err_03", "err_04"]);
  for (const err of answerKey) {
    const item = page.getByTestId(`proof-item-${err.id}`);
    await expect(item).toBeVisible();
    await expect(item).toContainText(KIND_LABELS[err.kind].en);
    await expect(item).toContainText(UI.caught.en);
    await expect(item).not.toContainText(UI.missed.en);
    await expect(item).not.toContainText(UI.pending.en);
    await expect(item).toContainText(expectedEn(err));
    await expectRecords(page, err);
  }
  watch.expectClean();
});

test("Acceptance 3: a proof.scored with err_03 not caught shows err_03 missed and the rest caught", async ({ page }) => {
  const watch = watchPage(page);
  await openAt(page, AFTER);
  await expect(page.getByTestId("proof-item-err_03")).toContainText(UI.caught.en);

  const results = answerKey.map((e) => ({ errorId: e.id, caught: e.id !== "err_03" }));
  await page.evaluate((res) => {
    const c = window.__cindia!;
    c.emit({
      id: "evt_test_0101",
      type: "proof.scored",
      at: c.player.now(),
      source: "scripted",
      key: "b03-proof",
      payload: { caught: res.filter((r) => r.caught).length, total: res.length, results: res },
    });
  }, results);

  for (const err of answerKey) {
    const item = page.getByTestId(`proof-item-${err.id}`);
    if (err.id === "err_03") {
      await expect(item).toContainText(UI.missed.en);
      await expect(item).not.toContainText(UI.caught.en);
    } else {
      await expect(item).toContainText(UI.caught.en);
      await expect(item).not.toContainText(UI.missed.en);
    }
    await expect(item).toContainText(KIND_LABELS[err.kind].en);
  }
  watch.expectClean();
});

test("Acceptance 4: before proof.scored each item shows its expected result and no verdict", async ({ page }) => {
  const watch = watchPage(page);
  await openAt(page, BEFORE);
  expect(await page.evaluate(() => window.__cindia!.player.now())).toBeLessThan(SCORED_AT);

  for (const err of answerKey) {
    const item = page.getByTestId(`proof-item-${err.id}`);
    await expect(item).toBeVisible();
    await expect(item).toContainText(KIND_LABELS[err.kind].en);
    await expect(item).toContainText(UI.expected.en);
    await expect(item).toContainText(expectedEn(err));
    await expect(item).toContainText(UI.pending.en);
    await expect(item).not.toContainText(UI.caught.en);
    await expect(item).not.toContainText(UI.missed.en);
  }
  watch.expectClean();
});
