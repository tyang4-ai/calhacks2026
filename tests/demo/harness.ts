// The demo harness. In S1 it opens /demo, checks the stage, the four frames and the controls,
// presses play and reset, and saves one screenshot. The integrator fills in the beats in I1
// (tests/demo/demo.spec.ts and tests/demo/beats.ts).
import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { waitForHooks } from "../smoke/lib";

export const ARTIFACTS_DEMO = path.join(process.env.CINDIA_ROOT ?? process.cwd(), "artifacts", "demo");

/** Live mode for G5, set by the gate through CINDIA_DEMO_MODE=live. */
export const DEMO_MODE: "scripted" | "live" = process.env.CINDIA_DEMO_MODE === "live" ? "live" : "scripted";

export async function screenshot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACTS_DEMO, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACTS_DEMO, `${name}.png`) });
}

/** Opens /demo and checks the stage, frames and controls. Switches to live mode when the gate asks. */
export async function openStage(page: Page) {
  await page.goto("/demo");
  await waitForHooks(page);
  await expect(page.getByTestId("demo-stage")).toBeVisible();
  for (const f of ["frame-buyer", "frame-studio", "frame-owner", "frame-maker"]) {
    await expect(page.getByTestId(f)).toBeVisible();
  }
  await expect(page.getByTestId("demo-controls")).toBeVisible();
  if (DEMO_MODE === "live") {
    await page.getByTestId("demo-mode-toggle").click();
    await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Live/);
  }
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

/** The S1 run: play, see the clock move, reset, and save one screenshot. */
export async function playAndReset(page: Page) {
  await page.getByTestId("demo-play").click();
  await expect(page.getByTestId("demo-pause")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__cindia!.player.now())).toBeGreaterThan(0);
  await page.getByTestId("demo-reset").click();
  await expect(page.getByTestId("demo-play")).toBeVisible();
  expect(await page.evaluate(() => window.__cindia!.player.now())).toBe(0);
  await screenshot(page, "s1-stage");
}
