// F-process layout: at 1440 by 900, in English (the site is English only), no text in any of the eleven views is cut,
// runs past its drawing, overlaps other text or sits on a box it doesn't belong to, and every view fits
// the overlay's body above its log. The populated store is the G3 verifier's: the v1 timeline sought
// past the paid receipt, then the v2 events the tour will carry, emitted from src/mock/ (the swarm's
// newest run is the find run, so the Elastic Agent Builder tool node is on screen).
import { expect, test, type Page } from "@playwright/test";
import type { Payloads } from "../../src/core/events";
import { counterfeitCandidates, demoFundMoves, demoSearch, demoSurprise, modelId, report, scriptedScan, swarmRuns } from "../../src/mock/index";
import { waitForFonts } from "../smoke/lib";
import { emitAtClock, layoutProblems, mappedPayload, open, PROCESS_IDS, runEvents, seekToEvent } from "./process-lib";

test.use({ viewport: { width: 1440, height: 900 } });

const run01 = swarmRuns.find((r) => r.runId === "run_01")!;
const run02 = swarmRuns.find((r) => r.runId === "run_02")!;
const runElastic = swarmRuns.find((r) => r.steps.some((s) => s.toolName === "elastic_agent"))!;

/** The model's events: the report's when src/mock/model.ts has one, else a test payload of the same shape. */
const trained: Payloads["model.trained"] = report?.trained ?? { modelId, baseModel: "intfloat/multilingual-e5-small", pairs: 1200, epochs: 3, dims: 384 };
const scored: Payloads["proof.search_scored"] = report?.scored ?? {
  modelId,
  k: 5,
  queries: 50,
  systems: [
    { system: "keyword", recallAtK: 0.42, mrr: 0.38 },
    { system: "base", recallAtK: 0.55, mrr: 0.47 },
    { system: "custom", recallAtK: 0.71, mrr: 0.62 },
    { system: "hybrid", recallAtK: 0.76, mrr: 0.66 },
  ],
};

async function populate(page: Page) {
  await seekToEvent(page, "receipt.updated", { status: "paid_to_maker" }, 300);
  const hits = counterfeitCandidates.filter((c) => scriptedScan.cftIds.includes(c.id));
  const results = counterfeitCandidates.map((c) => ({ title: c.title, url: c.url, snippet: c.snippet, similarity: c.similarity, verdict: c.verdict }));
  await emitAtClock(page, [
    { type: "search.queried", payload: { ...demoSearch.query, queryId: "qry_01" } },
    { type: "search.answered", payload: { ...demoSearch.answer, queryId: "qry_01" }, key: "b12-search" },
    { type: "search.mapped", payload: mappedPayload("qry_01", modelId), key: "b11-embed" },
    { type: "surprise.asked", payload: { ...demoSurprise.ask, surpriseId: "srp_01" } },
    { type: "surprise.drawn", payload: { ...demoSurprise.draw, surpriseId: "srp_01" }, key: "b12-search" },
    ...runEvents(run01),
    { type: "listing.requested", payload: { listingId: "lst_01", makerId: "mkr_02", notes: "notes", lang: "en" } },
    ...runEvents(run02, { upTo: "listing.indexed" }),
    ...runEvents(runElastic),
    { type: "model.trained", payload: trained, key: "b11-embed" },
    { type: "proof.search_scored", payload: scored, key: "b11-embed" },
    { type: "watch.started", payload: { scanId: scriptedScan.scanId, makerId: scriptedScan.makerId, queries: scriptedScan.queries } },
    { type: "watch.scanned", payload: { scanId: scriptedScan.scanId, engine: "scripted", candidates: results.length, results }, key: "b15-watch" },
    ...hits.map((c) => ({
      type: "counterfeit.flagged" as const,
      payload: { cftId: c.id, scanId: scriptedScan.scanId, pieceId: c.pieceId, url: c.url, title: c.title, snippet: c.snippet, similarity: c.similarity, claim: c.claim },
      key: "b15-watch" as const,
    })),
    { type: "approval.requested", payload: { approvalId: scriptedScan.approvalId! }, key: "b08-approvals" },
    ...demoFundMoves.map((m) => ({ type: "money.moved" as const, payload: m, key: "b04-bank" as const })),
  ]);
}

/** Opens each view from the bar and collects its layout problems, keyed by view. */
async function auditViews(page: Page, extra?: (id: string) => Promise<Record<string, string[]>>) {
  const found: Record<string, string[]> = {};
  for (const id of PROCESS_IDS) {
    await page.getByTestId(`process-block-${id}`).click();
    await expect(page.getByTestId("process-view").getByTestId(`process-pane-${id}`)).toBeVisible();
    await waitForFonts(page);
    const problems = await layoutProblems(page, id);
    if (problems.length) found[id] = problems;
    if (extra) Object.assign(found, await extra(id));
  }
  return found;
}

/** The swarm view for each of the runs the store holds, picked one by one. */
async function everyRun(page: Page, id: string): Promise<Record<string, string[]>> {
  if (id !== "swarm") return {};
  const found: Record<string, string[]> = {};
  for (const runId of [run01.runId, run02.runId, runElastic.runId]) {
    await page.getByTestId("process-swarm-run-picker").selectOption(runId);
    await expect(page.getByTestId("process-pane-swarm")).toHaveAttribute("data-run-id", runId);
    await waitForFonts(page);
    const problems = await layoutProblems(page, "swarm");
    if (problems.length) found[`swarm ${runId}`] = problems;
  }
  return found;
}

/** The bar: eleven blocks and the summary stack inside the bar, nothing cut. */
async function barProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const bar = document.querySelector('[data-testid="process-bar"]')!;
    const br = bar.getBoundingClientRect();
    for (const el of bar.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (el.closest(".c-visually-hidden")) continue;
      if (r.top < br.top - 1 || r.bottom > br.bottom + 1 || r.left < br.left - 1 || r.right > br.right + 1) {
        out.push(`${el.getAttribute("data-testid") ?? el.tagName.toLowerCase()} outside the bar`);
      }
    }
    return [...new Set(out)];
  });
}

test("every view, fresh store, English: nothing cut, overlapping or under the log", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, "/shop");
  expect(await barProblems(page)).toEqual([]);
  expect(await auditViews(page)).toEqual({});
});

test("every view, populated, English: nothing cut, overlapping or under the log", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, "/sell/month");
  await populate(page);
  await expect(page.getByTestId("process-block-status-watch")).toHaveText(/attention/i);
  expect(await barProblems(page)).toEqual([]);
  expect(await auditViews(page, (id) => everyRun(page, id))).toEqual({});
});
