// I2-kit T4: the new Badge variants, the kit gallery and the index.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import { KitGallery } from "./gallery";
import * as kit from "./index";

function textOf(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

describe("badge variants", () => {
  // English only (Gordon, Oct 24, 11:35 PM): the labeled variants read their glossary words in English.
  it("reads each labeled variant's glossary words, in English only", () => {
    const words: Record<string, string> = {
      simulated: "Simulated",
      live: "Live",
      demo: "Demo data",
      rule: "Rule-based",
      estimate: "Estimate",
    };
    for (const [variant, label] of Object.entries(words)) {
      const html = renderToStaticMarkup(createElement(Badge, { variant: variant as kit.BadgeVariant, testId: `kit-badge-${variant}` }, "ignored"));
      expect(textOf(html)).toBe(label);
      expect(html).toContain(`data-testid="kit-badge-${variant}"`);
      expect(html).toContain(`c-badge--${variant}`);
    }
  });
  it("keeps the Simulated badge's own test ID, and the word variants' children", () => {
    expect(renderToStaticMarkup(createElement(Badge, { variant: "simulated" }))).toContain('data-testid="simulated-badge"');
    expect(renderToStaticMarkup(createElement(Badge, { variant: "live" }))).not.toContain("data-testid");
    expect(textOf(renderToStaticMarkup(createElement(Badge, { variant: "jade" }, "Matched")))).toBe("Matched");
  });
});

describe("kit gallery", () => {
  for (const lang of ["en", "zh"] as const) {
    it(`renders every component with its own test ID, each once (${lang})`, () => {
      const html = renderToStaticMarkup(createElement(KitGallery, { lang }));
      const ids = [...html.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1]).filter((id) => id !== "simulated-badge");
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(dupes).toEqual([]);
      for (const id of [
        "kit-gallery",
        "kit-page",
        "kit-topnav",
        "kit-sideswitch",
        "kit-pblock-11",
        "kit-drawer",
        "kit-tabs",
        "kit-link",
        "kit-search",
        "kit-search-chip-remove-1",
        "kit-chip",
        "kit-piece-demo",
        "kit-verification-demo",
        "kit-community",
        "kit-project-progress",
        "kit-milestone-kit_m1",
        "kit-score-jade",
        "kit-stat-attention",
        "kit-chat",
        "kit-bubble-demo",
        "kit-graph",
        "kit-map",
        "kit-log",
        "kit-pview-close",
        "kit-sbs-similarity",
        "kit-block-kit_b1",
        "kit-badge-estimate",
        "kit-panel",
        "kit-seal",
        "kit-seal-small",
        "kit-makermark-small",
        "kit-thread",
        "kit-toast",
        "kit-console",
      ]) {
        expect(ids, id).toContain(id);
      }
      // Every sample says so.
      expect(html).toContain(lang === "en" ? ">Sample<" : ">示例<");
    });
  }
});

describe("kit index", () => {
  it("exports the v2 components and leaves PhoneFrame out", () => {
    for (const name of [
      "PageFrame",
      "TopNav",
      "SideSwitch",
      "ProcessBlock",
      "Drawer",
      "Tabs",
      "Link",
      "SearchBar",
      "Chip",
      "PieceCard",
      "VerificationLine",
      "CommunityCard",
      "ProjectCard",
      "MilestoneTimeline",
      "ScoreBar",
      "StatTile",
      "ChatThread",
      "ChatBubble",
      "AgentGraph",
      "EmbeddingMap",
      "EventLog",
      "ProcessView",
      "SideBySide",
      "BlockEditor",
      "Badge",
      "ConsoleFrame",
    ]) {
      expect(typeof (kit as Record<string, unknown>)[name], name).toBe("function");
    }
    expect(kit.PAGE_WIDTH).toBe(1440);
    expect(kit.PAGE_HEIGHT).toBe(900);
    expect("PhoneFrame" in kit).toBe(false);
    expect("PHONE_WIDTH" in kit).toBe(false);
  });
});
