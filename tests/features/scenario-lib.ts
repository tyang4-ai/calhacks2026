// Shared helper for the scenario specs that test the scripted fallback in live mode.
import type { Page } from "@playwright/test";

/**
 * Hides b05 from /api/health for this page, so the b05-scenario adapter reports unhealthy and the
 * registry answers with the scripted fallback, whether or not the API has b05 loaded. Other routers
 * stay as the API reports them. Install it before switching to live mode (health is checked then).
 * The live path itself is tested in scenario-live.spec.ts.
 */
export async function hideB05(page: Page) {
  await page.route("**/api/health", async (route) => {
    let body: { ok: boolean; routers?: string[]; [k: string]: unknown } = { ok: true, routers: [] };
    try {
      const res = await route.fetch();
      if (res.ok()) body = (await res.json()) as typeof body;
    } catch {
      // No API running: answer with no routers, so every adapter stays unhealthy.
    }
    body.routers = (body.routers ?? []).filter((r) => r !== "b05");
    await route.fulfill({ status: 200, json: body });
  });
}
