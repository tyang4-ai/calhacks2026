// The shell's behavior: redirects, the Shop and Sell switch, drawers and the process overlay from the
// URL, the slot props each slot gets (read from data-slot-props), robots, language resolution, the
// demo controls and their keys, video mode, the stage navigator's override on /demo, seekToEvent,
// and the live badge rule through window.__cindia.emit().
import { expect, test, type Page } from "@playwright/test";
import { SOURCE_KEYS } from "../../src/core/events";
import { L1_ZH, PROCESS_IDS, readSlotProps, seekToEvent, shownFrameId, slotTestId, waitForFonts, waitForHooks, waitForSlots, watchPage } from "./lib";

const now = (page: Page) => page.evaluate(() => window.__cindia!.player.now());
const playing = (page: Page) => page.evaluate(() => window.__cindia!.player.isPlaying());
const pathAndQuery = (page: Page) => {
  const u = new URL(page.url());
  return `${u.pathname}${u.search}`;
};

test.describe("routes and redirects", () => {
  test("the root, unknown routes and unknown Sell views redirect to /shop", async ({ page }) => {
    const watch = watchPage(page);
    for (const path of ["/", "/nowhere", "/sell/nope", "/sell", "/studio", "/studio/nope"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/shop$/);
      await expect(page.getByTestId("frame-buyer")).toBeVisible();
    }
    watch.expectClean();
  });

  test("v1's routes land on their v2 pages, keeping the query string", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/buyer");
    await expect.poll(() => pathAndQuery(page)).toBe("/shop");
    await page.goto("/studio/month?drawer=ask");
    await expect.poll(() => pathAndQuery(page)).toBe("/sell/month?drawer=ask");
    await expect(page.locator('[data-slot="studio.drawer.ask"]')).toBeVisible();
    await page.goto("/owner");
    await expect.poll(() => pathAndQuery(page)).toBe("/sell/approvals");
    await page.goto("/owner?ref=apr_01");
    await expect.poll(() => pathAndQuery(page)).toBe("/sell/approvals?ref=apr_01");
    watch.expectClean();
  });

  test("the switch goes to /sell/overview and back to /shop, and counts maker pages as Sell and store pages as Shop", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/shop");
    await expect(page.getByTestId("shell-side-shop")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("shell-side-sell").click();
    await expect.poll(() => pathAndQuery(page)).toBe("/sell/overview");
    await expect(page.getByTestId("shell-side-sell")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("shell-side-shop").click();
    await expect.poll(() => pathAndQuery(page)).toBe("/shop");
    await page.goto("/maker/mkr_01");
    await expect(page.getByTestId("shell-side-sell")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("shell-side-sell").click();
    await expect.poll(() => pathAndQuery(page)).toBe("/sell/overview");
    await page.goto("/store/dine-weavers");
    await expect(page.getByTestId("shell-side-shop")).toHaveAttribute("aria-pressed", "true");
    watch.expectClean();
  });

  test("the Sell nav lists the eleven views in route order, and switching views removes the drawer", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/sell/close?drawer=audit&ref=flg_01");
    await waitForSlots(page);
    const ids = await page.locator('[data-testid^="shell-nav-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    expect(ids).toEqual(["overview", "listings", "storefront", "projects", "map", "month", "close", "proof", "dashboard", "approvals", "watch"].map((v) => `shell-nav-${v}`));
    await expect(page.locator('[data-slot="studio.drawer.audit"]')).toBeVisible();
    await page.getByTestId("shell-nav-proof").click();
    await expect.poll(() => pathAndQuery(page)).toBe("/sell/proof");
    await expect(page.locator('[data-slot="studio.drawer.audit"]')).toHaveCount(0);
    watch.expectClean();
  });

  test("robots: /robots.txt disallows everything and every page has the noindex tag", async ({ page, request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const lines = (await res.text()).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    expect(lines).toEqual(["User-agent: *", "Disallow: /"]);
    for (const path of ["/shop", "/sell/overview", "/demo"]) {
      await page.goto(path);
      await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", "noindex");
    }
  });
});

test.describe("drawers", () => {
  const CASES: { path: string; slot: string; frame: string }[] = [
    { path: "/shop?drawer=support", slot: "shop.drawer.support", frame: "frame-buyer" },
    { path: "/shop/piece/pc_01?drawer=support", slot: "shop.drawer.support", frame: "frame-buyer" },
    { path: "/store/dine-weavers?drawer=support", slot: "shop.drawer.support", frame: "frame-store" },
    { path: "/maker/mkr_01?drawer=support", slot: "studio.drawer.support", frame: "frame-maker" },
    { path: "/sell/overview?drawer=support", slot: "studio.drawer.support", frame: "frame-studio" },
    { path: "/sell/month?drawer=ask", slot: "studio.drawer.ask", frame: "frame-studio" },
    { path: "/sell/close?drawer=audit&ref=flg_01", slot: "studio.drawer.audit", frame: "frame-studio" },
  ];

  for (const c of CASES) {
    test(`${c.path} opens ${c.slot}, one drawer at a time, and Esc closes it`, async ({ page }) => {
      const watch = watchPage(page);
      await page.goto(c.path);
      const frame = page.getByTestId(c.frame);
      await waitForSlots(page);
      await expect(frame.locator(`[data-slot="${c.slot}"]`)).toBeVisible();
      await expect(page.locator('[data-slot*=".drawer."]')).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(page.locator(`[data-slot="${c.slot}"]`)).toHaveCount(0);
      const u = new URL(page.url());
      expect(u.searchParams.get("drawer")).toBeNull();
      watch.expectClean();
    });
  }

  test("a page ignores a drawer it doesn't take", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/shop?drawer=ask");
    await waitForSlots(page);
    await expect(page.locator('[data-slot*=".drawer."]')).toHaveCount(0);
    await page.goto("/maker/mkr_01?drawer=audit&ref=flg_01");
    await waitForSlots(page);
    await expect(page.locator('[data-slot*=".drawer."]')).toHaveCount(0);
    watch.expectClean();
  });

  test("Help opens the support drawer for the page: Shop with the piece, Sell, maker and store", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/shop/piece/pc_01");
    await page.getByTestId("shell-help").click();
    await expect.poll(() => pathAndQuery(page)).toBe("/shop/piece/pc_01?drawer=support");
    expect(await readSlotProps(page, "shop.drawer.support")).toEqual({ surface: "buyer", lang: "en", side: "buyer", pieceId: "pc_01" });

    await page.goto("/sell/overview");
    await page.getByTestId("shell-help").click();
    await expect.poll(() => pathAndQuery(page)).toBe("/sell/overview?drawer=support");
    expect(await readSlotProps(page, "studio.drawer.support")).toEqual({ surface: "studio", lang: "en", side: "seller" });

    await page.goto("/maker/mkr_01");
    await page.getByTestId("shell-help").click();
    expect(await readSlotProps(page, "studio.drawer.support")).toEqual({ surface: "maker", lang: "en", side: "seller", makerId: "mkr_01" });

    await page.goto("/store/dine-weavers");
    await page.getByTestId("shell-help").click();
    expect(await readSlotProps(page, "shop.drawer.support")).toEqual({ surface: "store", lang: "en", side: "buyer", slug: "dine-weavers" });
    watch.expectClean();
  });
});

test.describe("slot props", () => {
  test("the piece page's slots get pieceId, filled or empty", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/shop/piece/pc_01");
    await waitForSlots(page);
    expect(await readSlotProps(page, "shop.piece.main")).toEqual({ surface: "buyer", lang: "en", pieceId: "pc_01" });
    expect(await readSlotProps(page, "shop.piece.side")).toEqual({ surface: "buyer", lang: "en", pieceId: "pc_01" });
    watch.expectClean();
  });

  test("/sell/approvals?ref=apr_01 gives owner.main the approval, in the Sell site's language, with no drawer", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/sell/approvals?ref=apr_01");
    await waitForSlots(page);
    expect(await readSlotProps(page, "owner.main")).toEqual({ surface: "owner", lang: "en", refId: "apr_01" });
    await expect(page.locator('[data-slot*=".drawer."]')).toHaveCount(0);
    watch.expectClean();
  });

  test("the Shop support drawer gets orderId on a receipt", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/shop/receipt/ord_001?drawer=support");
    await waitForSlots(page);
    expect(await readSlotProps(page, "shop.drawer.support")).toEqual({ surface: "buyer", lang: "en", side: "buyer", orderId: "ord_001" });
    expect(await readSlotProps(page, "shop.receipt.main")).toMatchObject({ orderId: "ord_001" });
    watch.expectClean();
  });

  test("the search page gets q and every k, and the other pages their IDs", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/shop/search?q=red%20wool&k=red&k=wool");
    await waitForSlots(page);
    expect(await readSlotProps(page, "shop.search.main")).toMatchObject({ searchParams: { q: "red wool", k: ["red", "wool"] } });
    await page.goto("/shop/search");
    await waitForSlots(page);
    expect((await readSlotProps(page, "shop.search.main")).searchParams).toEqual({ k: [] });
    await page.goto("/shop/community/com_dine");
    await waitForSlots(page);
    expect(await readSlotProps(page, "shop.community.main")).toMatchObject({ communityId: "com_dine" });
    await page.goto("/shop/projects/wip_01");
    await waitForSlots(page);
    expect(await readSlotProps(page, "shop.projects.main")).toMatchObject({ projectId: "wip_01" });
    await page.goto("/shop/projects");
    await waitForSlots(page);
    expect(await readSlotProps(page, "shop.projects.main")).not.toHaveProperty("projectId");
    await page.goto("/store/dine-weavers");
    await waitForSlots(page);
    expect(await readSlotProps(page, "store.main")).toMatchObject({ surface: "store", slug: "dine-weavers" });
    await page.goto("/maker/mkr_01");
    await waitForSlots(page);
    expect(await readSlotProps(page, "maker.side")).toMatchObject({ surface: "maker", makerId: "mkr_01" });
    await page.goto("/sell/close?drawer=audit&ref=flg_01");
    await waitForSlots(page);
    expect(await readSlotProps(page, "studio.drawer.audit")).toMatchObject({ surface: "studio", refId: "flg_01" });
    // No public-build flag on localhost.
    expect(await readSlotProps(page, "studio.close.main")).toEqual({ surface: "studio", lang: "en" });
    watch.expectClean();
  });
});

test.describe("the process overlay", () => {
  for (const id of PROCESS_IDS) {
    test(`?process=${id} opens the overlay with both process slots on ${id}, and Esc closes it`, async ({ page }) => {
      const watch = watchPage(page);
      await page.goto(`/shop?process=${id}`);
      await waitForSlots(page);
      await expect(page.getByTestId("process-view").or(page.getByTestId(slotTestId("process.view"))).first()).toBeVisible();
      expect(await readSlotProps(page, "process.view")).toMatchObject({ processId: id });
      expect(await readSlotProps(page, "process.bar")).toMatchObject({ processId: id });
      await page.keyboard.press("Escape");
      await expect(page.locator('[data-slot="process.view"]')).toHaveCount(0);
      expect(new URL(page.url()).searchParams.get("process")).toBeNull();
      expect(await readSlotProps(page, "process.bar")).not.toHaveProperty("processId");
      watch.expectClean();
    });
  }

  test("the top bar and the process bar stay uncovered above the overlay, a click on the scrim closes it, and no shell element carries a process- test ID", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/sell/month?process=swarm");
    await waitForSlots(page);
    await expect(page.locator('[data-slot="process.view"]')).toBeVisible();
    // Only the process feature renders process- test IDs, always inside a slot.
    const outside = await page.locator('[data-testid^="process-"]').evaluateAll((els) => els.filter((e) => !e.closest("[data-slot]")).length);
    expect(outside).toBe(0);
    // The top bar and the process bar stay uncovered above the open view.
    const hitAt = async (testId: string) => {
      const b = (await page.getByTestId(testId).first().boundingBox())!;
      return page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-testid]")?.getAttribute("data-testid") ?? null, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
    };
    expect(await hitAt("shell-help")).toBe("shell-help");
    const bar = (await page.locator('[data-slot="process.bar"]').boundingBox())!;
    const barHit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-slot]")?.getAttribute("data-slot") ?? null, { x: bar.x + bar.width / 2, y: bar.y + bar.height / 2 });
    expect(barHit).toBe("process.bar");
    // The scrim covers the page body around the 1200 by 720 panel: click its top left corner.
    const frame = page.getByTestId("frame-studio");
    await frame.click({ position: { x: 20, y: 140 } });
    await expect(page.locator('[data-slot="process.view"]')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("process")).toBeNull();
    watch.expectClean();
  });

  test("an open drawer sits above the overlay, and Esc closes the drawer first", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/sell/month?process=money&drawer=ask");
    await waitForSlots(page);
    await expect(page.locator('[data-slot="studio.drawer.ask"]')).toBeVisible();
    await expect(page.locator('[data-slot="process.view"]')).toBeAttached();
    // The drawer is on top where the two overlap.
    const box = (await page.locator('[data-slot="studio.drawer.ask"]').boundingBox())!;
    const onTop = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-slot]")?.getAttribute("data-slot") ?? null,
      { x: box.x + 20, y: box.y + box.height / 2 },
    );
    expect(onTop).toBe("studio.drawer.ask");
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="studio.drawer.ask"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="process.view"]')).toBeAttached();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="process.view"]')).toHaveCount(0);
    watch.expectClean();
  });

  test("an unknown process ID is ignored", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/shop?process=nope");
    await waitForSlots(page);
    await expect(page.locator('[data-slot="process.view"]')).toHaveCount(0);
    watch.expectClean();
  });
});

async function frameLangs(page: Page) {
  const out: Record<string, string | null> = {};
  for (const f of ["buyer", "studio", "maker", "store"]) out[f] = await page.getByTestId(`frame-${f}`).getAttribute("lang");
  return out;
}

/** Every frame has slots, and each slot's content (placeholder or feature) is in its frame's language. */
async function expectSlotsFollowFrames(page: Page) {
  await waitForSlots(page);
  for (const f of ["buyer", "studio", "maker", "store"]) {
    const frame = page.getByTestId(`frame-${f}`);
    const want = await frame.getAttribute("lang");
    const slots = await frame.locator("[data-slot]").evaluateAll((els) =>
      Object.fromEntries(
        els.map((el) => {
          const root = el.firstElementChild ?? el;
          return [el.getAttribute("data-slot"), root.closest("[lang]")?.getAttribute("lang") ?? null];
        }),
      ),
    );
    expect(Object.keys(slots).length, `frame-${f} has a slot`).toBeGreaterThan(0);
    for (const [slot, lang] of Object.entries(slots)) expect(lang, `${slot} follows frame-${f}`).toBe(want);
  }
}

test.describe("language", () => {
  test("auto starts the four frames in English, then the toggle cycles en, zh and back to auto", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/demo");
    await waitForHooks(page);
    const setting = () => page.evaluate(() => window.__cindia!.store.getState().lang);
    expect(await setting()).toBe("auto");
    const en = { buyer: "en", studio: "en", maker: "en", store: "en" };
    expect(await frameLangs(page)).toEqual(en);
    await expectSlotsFollowFrames(page);
    await page.getByTestId("demo-lang-toggle").click();
    expect(await setting()).toBe("en");
    expect(await frameLangs(page)).toEqual(en);
    await expectSlotsFollowFrames(page);
    await page.getByTestId("demo-lang-toggle").click();
    expect(await setting()).toBe("zh");
    expect(await frameLangs(page)).toEqual({ buyer: "zh", studio: "zh", maker: "zh", store: "zh" });
    await expectSlotsFollowFrames(page);
    // L1 in Chinese, word for word.
    await expect(page.getByTestId("frame-buyer").getByTestId("shell-topnav")).toContainText(L1_ZH);
    await page.getByTestId("demo-lang-toggle").click();
    expect(await setting()).toBe("auto");
    expect(await frameLangs(page)).toEqual(en);
    await expectSlotsFollowFrames(page);
    watch.expectClean();
  });

  test("the maker page starts in the maker's own language, English after R0, and the toggle switches it to Chinese", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/maker/mkr_01");
    await waitForHooks(page);
    await expect(page.getByTestId("frame-maker")).toHaveAttribute("lang", "en");
    expect((await readSlotProps(page, "maker.main")).lang).toBe("en");
    await page.getByTestId("demo-lang-toggle").click();
    await page.getByTestId("demo-lang-toggle").click();
    await expect(page.getByTestId("frame-maker")).toHaveAttribute("lang", "zh");
    expect((await readSlotProps(page, "maker.main")).lang).toBe("zh");
    watch.expectClean();
  });
});

test.describe("the stage on /demo", () => {
  test("Help in the shown frame opens its drawer without touching the URL, and the next beat.started closes it", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/demo");
    await waitForHooks(page);
    await seekToEvent(page, "beat.started", { beatId: "d02-story" }, 500);
    await expect(page.getByTestId("demo-stage")).toHaveAttribute("data-camera", "shop-legacy");
    expect(await shownFrameId(page)).toBe("frame-buyer");
    const buyer = page.getByTestId("frame-buyer");
    await buyer.getByTestId("shell-help").click();
    await expect(buyer.locator('[data-slot="shop.drawer.support"]')).toBeVisible();
    expect(await readSlotProps(page, "shop.drawer.support", buyer)).toMatchObject({ side: "buyer" });
    expect(pathAndQuery(page)).toBe("/demo");
    // The next beat.started (d03-split) closes it.
    await page.evaluate(() => window.__cindia!.player.play());
    await expect.poll(() => page.evaluate(() => (window.__cindia!.store.getState().demo as { beatId: string }).beatId), { timeout: 10000 }).toBe("d03-split");
    await expect(buyer.locator('[data-slot="shop.drawer.support"]')).toHaveCount(0);
    await page.evaluate(() => window.__cindia!.player.pause());
    watch.expectClean();
  });

  test("a seek clears the override, and a kit Link click (the Sell nav) changes nothing on /demo", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/demo");
    await waitForHooks(page);
    await seekToEvent(page, "beat.started", { beatId: "d06-month" }, 500);
    await expect(page.getByTestId("demo-stage")).toHaveAttribute("data-camera", "sell-month");
    const studio = page.getByTestId("frame-studio");
    await expect(studio.locator("main[data-view]")).toHaveAttribute("data-view", "month");
    await studio.getByTestId("shell-help").click();
    await expect(studio.locator('[data-slot="studio.drawer.support"]')).toBeVisible();
    await page.evaluate(() => window.__cindia!.player.seek(window.__cindia!.player.now() + 100));
    await expect(studio.locator('[data-slot="studio.drawer.support"]')).toHaveCount(0);
    await studio.getByTestId("shell-nav-proof").click();
    expect(pathAndQuery(page)).toBe("/demo");
    await expect(studio.locator("main[data-view]")).toHaveAttribute("data-view", "month");
    // The switch calls navigate() too, which does nothing here.
    await studio.getByTestId("shell-side-shop").click();
    expect(pathAndQuery(page)).toBe("/demo");
    await expect(page.getByTestId("demo-stage")).toHaveAttribute("data-camera", "sell-month");
    watch.expectClean();
  });

  test("the stage ignores ?drawer= and ?process= in its own URL", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/demo?drawer=support&process=swarm");
    await waitForHooks(page);
    await waitForSlots(page, page.getByTestId("frame-buyer"));
    await expect(page.locator('[data-slot*=".drawer."]')).toHaveCount(0);
    await expect(page.locator('[data-slot="process.view"]')).toHaveCount(0);
    watch.expectClean();
  });

  test("the search page gets no q, or only the latest query's own text, and never makes a person's search", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/demo");
    await waitForHooks(page);
    const buyer = page.getByTestId("frame-buyer");
    await page.evaluate(() =>
      window.__cindia!.emit({ id: "evt_smoke_0001", type: "beat.started", at: 0, source: "scripted", payload: { beatId: "smoke-search", camera: "shop-search" } }),
    );
    await expect(page.getByTestId("demo-stage")).toHaveAttribute("data-camera", "shop-search");
    await waitForSlots(page, buyer);
    expect((await readSlotProps(page, "shop.search.main", buyer)).searchParams).toEqual({ k: [] });
    await page.evaluate(() =>
      window.__cindia!.emit({
        id: "evt_smoke_0002",
        type: "search.queried",
        at: 0,
        source: "scripted",
        key: "b12-search",
        payload: { queryId: "sq_smoke_01", text: "a warm red wool weaving for my mom", keywords: ["red", "wool"], lang: "en" },
      }),
    );
    await expect.poll(async () => (await readSlotProps(page, "shop.search.main", buyer)).searchParams).toEqual({ q: "a warm red wool weaving for my mom", k: ["red", "wool"] });
    const userSearches = await page.evaluate(() =>
      (window.__cindia!.store.getState().log as { entries: { type: string; source: string }[] }).entries.filter((e) => e.type === "search.queried" && e.source === "user").length,
    );
    expect(userSearches).toBe(0);
    watch.expectClean();
  });
});

test.describe("seekToEvent", () => {
  test("pauses at the event's time, and throws naming the type and the match when the timeline lacks it", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/demo");
    await waitForHooks(page);
    const at = await page.evaluate(
      () => window.__cindia!.player.getTimeline()!.events.find((e) => e.type === "beat.started" && (e.payload as { beatId: string }).beatId === "d07-catch")!.at,
    );
    await page.evaluate(() => window.__cindia!.player.play());
    expect(await seekToEvent(page, "beat.started", { beatId: "d07-catch" })).toBe(at);
    expect(await now(page)).toBe(at);
    expect(await playing(page)).toBe(false);
    expect(await seekToEvent(page, "beat.started", { beatId: "d07-catch" }, 250)).toBe(at + 250);
    expect(await now(page)).toBe(at + 250);
    await expect(seekToEvent(page, "beat.started", { beatId: "no-such-beat" })).rejects.toThrow(/beat\.started.*no-such-beat/);
    await expect(seekToEvent(page, "no.such_type", {})).rejects.toThrow(/no\.such_type/);
    watch.expectClean();
  });
});

test.describe("demo controls", () => {
  test("they respond to clicks", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/demo");
    await waitForHooks(page);
    const controls = page.getByTestId("demo-controls");
    await expect(controls).toBeVisible();

    // Play and pause are one button: exactly one of the two test IDs is on screen.
    await expect(page.getByTestId("demo-play")).toBeVisible();
    await expect(page.getByTestId("demo-pause")).toHaveCount(0);
    await page.getByTestId("demo-play").click();
    await expect(page.getByTestId("demo-pause")).toBeVisible();
    await expect(page.getByTestId("demo-play")).toHaveCount(0);
    await expect.poll(() => now(page)).toBeGreaterThan(0);
    await page.getByTestId("demo-pause").click();
    await expect(page.getByTestId("demo-play")).toBeVisible();
    expect(await playing(page)).toBe(false);

    await expect(page.getByTestId("demo-speed")).toHaveText("1x");
    for (const x of ["2x", "4x", "8x", "1x"]) {
      await page.getByTestId("demo-speed").click();
      await expect(page.getByTestId("demo-speed")).toHaveText(x);
    }

    await page.getByTestId("demo-reset").click();
    expect(await now(page)).toBe(0);

    // Localhost keeps the Live switch; only the public build hides it.
    await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Scripted/);
    await page.getByTestId("demo-mode-toggle").click();
    await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Live/);
    expect(await page.evaluate(() => window.__cindia!.store.getState().mode)).toBe("live");
    // One dot per source key in live mode.
    await expect(page.getByTestId("demo-mode-toggle").locator("[data-source-key]")).toHaveCount(SOURCE_KEYS.length);
    await page.getByTestId("demo-mode-toggle").click();
    await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Scripted/);

    // Start at the catch seeks to d07-catch's beat.started and plays. With no catch beat loaded it does nothing.
    await expect(page.getByTestId("demo-start-at-catch")).toBeVisible();
    const catchAt = await page.evaluate(
      () =>
        window.__cindia!.player.getTimeline()?.events.find(
          (e) => e.type === "beat.started" && (e.payload as { beatId: string }).beatId === "d07-catch",
        )?.at ?? null,
    );
    await page.getByTestId("demo-start-at-catch").click();
    if (catchAt === null) {
      expect(await now(page)).toBe(0);
      expect(await playing(page)).toBe(false);
    } else {
      await expect(page.getByTestId("demo-pause")).toBeVisible();
      await expect.poll(() => now(page)).toBeGreaterThanOrEqual(catchAt);
      // Pause, so no beat draws anything new while the network is cut below.
      await page.getByTestId("demo-pause").click();
      await expect(page.getByTestId("demo-play")).toBeVisible();
    }

    // demo-offline only shows while the browser has no network. Going offline cuts localhost too,
    // so first let the page finish loading what it shows: every slot's feature, and every font
    // subset its text needs. watch.setOffline() tells the check which failures the test caused.
    await waitForSlots(page);
    await waitForFonts(page);
    await expect(page.getByTestId("demo-offline")).toHaveCount(0);
    await watch.setOffline(true);
    await expect(page.getByTestId("demo-offline")).toBeVisible();
    await watch.setOffline(false);
    await expect(page.getByTestId("demo-offline")).toHaveCount(0);
    watch.expectClean();
  });

  test("they respond to their keys, except in a text input", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/sell/map");
    await waitForHooks(page);
    await page.locator("body").click({ position: { x: 5, y: 5 } });

    await page.keyboard.press("Space");
    await expect(page.getByTestId("demo-pause")).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("demo-play")).toBeVisible();

    await page.keyboard.press("s");
    await expect(page.getByTestId("demo-speed")).toHaveText("2x");
    await page.keyboard.press("m");
    await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Live/);
    await page.keyboard.press("m");
    await expect(page.getByTestId("demo-mode-toggle")).toHaveText(/Scripted/);
    await page.keyboard.press("l");
    expect(await page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("en");
    await page.keyboard.press("l");
    await page.keyboard.press("l");
    expect(await page.evaluate(() => window.__cindia!.store.getState().lang)).toBe("auto");
    await page.keyboard.press("Space");
    await expect.poll(() => now(page)).toBeGreaterThan(0);
    await page.keyboard.press("r");
    await expect(page.getByTestId("demo-play")).toBeVisible();
    expect(await now(page)).toBe(0);
    // c starts at the catch: seek to d07-catch's beat.started and play. With no catch beat loaded it does nothing.
    const [catchAt, nextBeatAt] = await page.evaluate(() => {
      const beats = (window.__cindia!.player.getTimeline()?.events ?? []).filter((e) => e.type === "beat.started");
      const i = beats.findIndex((e) => (e.payload as { beatId: string }).beatId === "d07-catch");
      if (i < 0) return [null, null] as const;
      return [beats[i].at, beats[i + 1]?.at ?? Number.POSITIVE_INFINITY] as const;
    });
    await page.keyboard.press("c");
    if (catchAt === null) {
      expect(await now(page)).toBe(0);
      expect(await playing(page)).toBe(false);
    } else {
      await expect(page.getByTestId("demo-pause")).toBeVisible();
      expect(await playing(page)).toBe(true);
      await expect.poll(() => now(page)).toBeGreaterThanOrEqual(catchAt);
      // Pause, so the input check below proves Space typed in an input doesn't start the player.
      await page.keyboard.press("Space");
      await expect(page.getByTestId("demo-play")).toBeVisible();
      expect(await playing(page)).toBe(false);
      const pausedAt = await now(page);
      expect(pausedAt).toBeGreaterThanOrEqual(catchAt);
      // It landed in d07-catch, not somewhere later in the demo.
      expect(pausedAt).toBeLessThan(nextBeatAt!);
    }

    // While a text input has focus, the keys are left alone.
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "smoke-input";
      document.body.appendChild(input);
    });
    await page.locator("#smoke-input").focus();
    await page.keyboard.press("s");
    await page.keyboard.press("Space");
    await expect(page.getByTestId("demo-speed")).toHaveText("2x");
    await expect(page.locator("#smoke-input")).toHaveValue("s ");
    expect(await playing(page)).toBe(false);
    watch.expectClean();
  });

  test("they drive the same player on every route", async ({ page }) => {
    const watch = watchPage(page);
    for (const path of ["/shop", "/sell/approvals", "/maker/mkr_01", "/sell/close", "/store/dine-weavers"]) {
      await page.goto(path);
      await waitForHooks(page);
      await expect(page.getByTestId("demo-controls")).toBeVisible();
      const id = await page.evaluate(() => window.__cindia!.player.getTimeline()?.id ?? null);
      expect(id).toBe("demo");
    }
    watch.expectClean();
  });

  test("video mode hides them", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/demo?video=1");
    await expect(page.getByTestId("demo-stage")).toBeVisible();
    await expect(page.getByTestId("demo-controls")).toHaveCount(0);
    watch.expectClean();
  });

  test("start=catch seeks to the catch beat when the timeline has one", async ({ page }) => {
    const watch = watchPage(page);
    await page.goto("/demo?start=catch");
    await waitForHooks(page);
    const catchAt = await page.evaluate(
      () =>
        window.__cindia!.player.getTimeline()?.events.find(
          (e) => e.type === "beat.started" && (e.payload as { beatId: string }).beatId === "d07-catch",
        )?.at ?? null,
    );
    if (catchAt === null) {
      expect(await now(page)).toBe(0);
      expect(await playing(page)).toBe(false);
    } else {
      await expect.poll(() => now(page)).toBeGreaterThanOrEqual(catchAt);
    }
    watch.expectClean();
  });
});

test("a live account.synced clears only the b04-bank source", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/demo");
  await waitForHooks(page);
  const sources = await page.evaluate(() => {
    window.__cindia!.emit({
      id: "evt_live_0001",
      type: "account.synced",
      at: 0,
      source: "live",
      key: "b04-bank",
      payload: { accountId: "acct_studio", balanceCents: 15648, asOf: "2026-09-01" },
    });
    return window.__cindia!.store.getState().sources;
  });
  expect(sources["b04-bank"]).toBe("live");
  const others = Object.entries(sources).filter(([k]) => k !== "b04-bank");
  expect(others).toHaveLength(SOURCE_KEYS.length - 1);
  for (const [, v] of others) expect(v).toBe("scripted");
  watch.expectClean();
});
