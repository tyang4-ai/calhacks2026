// F-approvals T2: the follow-up draft inside apr_01 and the payout lines inside apr_02.
import { expect, test, type Page } from "@playwright/test";
import type { MakerPayout, Person, Studio } from "../../src/core/types";
import { getById } from "../../src/mock/index";
import { GLOSSARY, UI } from "../../src/features/approvals/strings";
import { formatCents } from "../../src/ui/formatCents";
import { formatDate } from "../../src/ui/formatDate";
import { waitForHooks, watchPage } from "../smoke/lib";

type Text = { en: string; zh: string };
type FollowUps = Record<string, { approvalId: string; to?: Text; subject?: Text; body?: Text; sent: boolean }>;
type PayoutSent = { makerPayoutId: string; makerId: string; amountCents: number; date: string };

const MPO_IDS = ["mpo_01", "mpo_02", "mpo_03"];

async function seek(page: Page, ms: number) {
  await page.evaluate((t) => {
    window.__cindia!.player.pause();
    window.__cindia!.player.seek(t);
  }, ms);
}

async function openOwner(page: Page) {
  await page.goto("/owner");
  await waitForHooks(page);
  await expect(page.locator('[data-slot="owner.main"]')).toHaveAttribute("data-slot-state", "filled");
}

async function draftFor(page: Page, approvalId: string) {
  return page.evaluate((id) => {
    const s = window.__cindia!.store.getState() as unknown as { approvals: { followUps: FollowUps } };
    return Object.values(s.approvals.followUps).find((f) => f.approvalId === id) ?? null;
  }, approvalId);
}

async function payoutSentEvents(page: Page): Promise<PayoutSent[]> {
  return page.evaluate(() => {
    const tl = window.__cindia!.player.getTimeline();
    return (tl?.events ?? []).filter((e) => e.type === "payout.sent").map((e) => e.payload as PayoutSent);
  });
}

/** Whitespace-collapsed text, as Playwright's toContainText compares it. */
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

test("before followup.drafted the draft shows nothing", async ({ page }) => {
  await openOwner(page);
  await seek(page, 35000);
  expect(await draftFor(page, "apr_01")).toBeNull();
  await expect(page.getByTestId("approvals-item-apr_01")).toHaveCount(0);
});

test("Acceptance 1: at 36.5 s apr_01 holds the drafted follow-up, one tap opens the full body", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await seek(page, 36500);
  const draft = await draftFor(page, "apr_01");
  expect(draft?.body?.en).toBeTruthy();

  const card = page.getByTestId("approvals-item-apr_01");
  await expect(card).toBeVisible();
  // English labels, English text from the payload.
  await expect(card).toContainText(GLOSSARY.followUp.en);
  await expect(card).toContainText(UI.to.en);
  await expect(card).toContainText(UI.subject.en);
  await expect(card).toContainText(draft!.to!.en);
  await expect(card).toContainText(draft!.subject!.en);
  await expect(card).toContainText(UI.draftInEnglish.en);

  const toggle = card.getByRole("button", { name: UI.readDraft.en });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const before = (await card.boundingBox())!.height;
  await toggle.click();
  await expect(card.getByRole("button", { name: UI.showLess.en })).toHaveAttribute("aria-expanded", "true");
  const after = (await card.boundingBox())!.height;
  expect(after).toBeGreaterThan(before);

  // The open body keeps its line breaks and matches the payload.
  const shown = await card.locator("p[lang=en]").evaluate((el) => ({ text: el.textContent, ws: getComputedStyle(el).whiteSpace }));
  expect(shown.text).toBe(draft!.body!.en);
  expect(shown.ws).toBe("pre-line");
  await expect(card).toContainText(squash(draft!.body!.en));
  watch.expectClean();
});

test("Acceptance 2: at 39 s apr_02 lists the three payouts with name, amount, held total and over-limit marks", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await seek(page, 39000);
  const card = page.getByTestId("approvals-item-apr_02");
  await expect(card).toBeVisible();

  const sentEvents = await payoutSentEvents(page);
  const limit = getById<Studio>("std_dine")!.payoutLimitCents;
  expect(limit).toBe(50000);

  let heldTotal = 0;
  for (const id of MPO_IDS) {
    const ev = sentEvents.find((e) => e.makerPayoutId === id);
    expect(ev, `payout.sent for ${id} in the timeline`).toBeTruthy();
    const mpo = getById<MakerPayout>(id)!;
    expect(mpo.amountCents).toBe(ev!.amountCents);
    const maker = getById<Person>(ev!.makerId)!;
    const line = card.getByTestId(`approvals-payout-${id}`);
    await expect(line).toBeVisible();
    await expect(line).toContainText(maker.name.en);
    await expect(line).toContainText(maker.surnameChar);
    await expect(line).toContainText(formatCents(ev!.amountCents));
    if (mpo.heldCents > 0) {
      await expect(line).toContainText(GLOSSARY.held.en);
      await expect(line).toContainText(formatCents(mpo.heldCents));
    }
    if (ev!.amountCents > limit) await expect(line).toContainText(GLOSSARY.overLimit.en);
    else await expect(line).not.toContainText(GLOSSARY.overLimit.en);
    // Not sent yet at 39 s.
    await expect(line).not.toContainText(GLOSSARY.sent.en);
    heldTotal += mpo.heldCents;
  }

  // The held total is the gallery's short payment, $340.00 (data-model figure 9).
  expect(heldTotal).toBe(34000);
  await expect(card).toContainText(UI.heldTotal.en);
  await expect(card).toContainText("$340.00");
  await expect(card).toContainText(GLOSSARY.heldNote.en);
  watch.expectClean();
});

test("Acceptance 4: after 43 s every payout line and the draft read sent", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await seek(page, 43000);
  const sentEvents = await payoutSentEvents(page);
  for (const id of MPO_IDS) {
    const ev = sentEvents.find((e) => e.makerPayoutId === id)!;
    const line = page.getByTestId("approvals-item-apr_02").getByTestId(`approvals-payout-${id}`);
    await expect(line).toContainText(GLOSSARY.sent.en);
    await expect(line).toContainText(formatDate(ev.date, "en"));
  }
  const draft = await draftFor(page, "apr_01");
  expect(draft?.sent).toBe(true);
  await expect(page.getByTestId("approvals-item-apr_01")).toContainText(GLOSSARY.sent.en);
  watch.expectClean();
});

test("Acceptance 7: in Chinese the labels change and the follow-up body does not", async ({ page }) => {
  const watch = watchPage(page);
  await openOwner(page);
  await seek(page, 39000);
  const card = page.getByTestId("approvals-item-apr_01");
  // The owner's page opens in English.
  expect(await page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("auto");
  await expect(card).toHaveAttribute("lang", "en");
  await expect(card).toContainText(GLOSSARY.followUp.en);
  await card.getByRole("button", { name: UI.readDraft.en }).click();
  const bodyEn = await card.locator("p[lang=en]").textContent();

  // The toggle cycles auto, en, zh: two taps from the start give Chinese.
  const toggle = page.getByTestId("demo-lang-toggle");
  await toggle.click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("en");
  await toggle.click();
  await expect.poll(() => page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("zh");
  await expect(card).toHaveAttribute("lang", "zh");
  await expect(card).toContainText(GLOSSARY.followUp.zh);
  await expect(card).toContainText(UI.to.zh);
  await expect(card).toContainText(UI.draftInEnglish.zh);
  const bodyZh = await card.locator("p[lang=en]").textContent();
  expect(bodyZh).toBe(bodyEn);
  const draft = await draftFor(page, "apr_01");
  expect(bodyZh).toBe(draft!.body!.en);

  const line = page.getByTestId("approvals-payout-mpo_01");
  const maker = getById<Person>(getById<MakerPayout>("mpo_01")!.makerId)!;
  await expect(line).toContainText(maker.name.zh);
  watch.expectClean();
});
