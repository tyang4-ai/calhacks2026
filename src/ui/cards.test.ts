// I2-kit T2: search and cards. The progress and share math, when the demo lines show, the chip
// test IDs, the seal's date line, and the 14 px floor on the seal and the maker mark. Components render with react-dom/server, and the hook-free
// ones are walked as element trees so a test can press their controls without a DOM.
import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  addChip,
  chipTestIds,
  formatScore,
  milestoneSegments,
  pieceVerificationText,
  progressPercent,
  progressShare,
  removeChipAt,
  scoreFraction,
  verificationLines,
} from "./cards";
import { Chip } from "./Chip";
import { CommunityCard } from "./CommunityCard";
import { formatMonthDay } from "./formatDate";
import { MakerMark } from "./MakerMark";
import { MilestoneTimeline } from "./MilestoneTimeline";
import { PieceCard, type PieceCardProps } from "./PieceCard";
import { ProjectCard } from "./ProjectCard";
import { ScoreBar } from "./ScoreBar";
import { Seal } from "./Seal";
import { SearchBar, type SearchBarProps } from "./SearchBar";
import { StatTile } from "./StatTile";
import { L3, L4 } from "./strings";
import { VerificationLine } from "./VerificationLine";

/** The visible text of some static markup, tags dropped and entities decoded. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** The inner markup of the element carrying `attr`, found by a balanced walk over its tag. */
function elementWith(html: string, attr: string): string {
  const at = html.indexOf(attr);
  if (at < 0) return "";
  const open = html.lastIndexOf("<", at);
  const tag = /^<([a-z0-9]+)/.exec(html.slice(open))?.[1] ?? "";
  let depth = 0;
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
  re.lastIndex = open;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index + m[0].length);
  }
  return html.slice(open);
}

type AnyProps = Record<string, unknown> & { children?: ReactNode };

/** Finds the first host element whose props match, calling function components on the way. */
function findElement(node: ReactNode, match: (props: AnyProps) => boolean): ReactElement<AnyProps> | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findElement(n, match);
      if (hit) return hit;
    }
    return null;
  }
  if (!isValidElement<AnyProps>(node)) return null;
  if (typeof node.type === "function") return findElement((node.type as (p: AnyProps) => ReactNode)(node.props), match);
  if (typeof node.type === "string" && match(node.props)) return node;
  return findElement(node.props.children, match);
}

const byTestId = (id: string) => (p: AnyProps) => p["data-testid"] === id;

/** Every inline font size in some static markup, in px. */
function inlineFontPx(html: string): number[] {
  return [...html.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
}

/** A seal's markup for the demo's decision date. */
function sealHtml(lang: "en" | "zh", size: number, date = "2026-10-01"): string {
  return renderToStaticMarkup(createElement(Seal, { char: "R", date, lang, size }));
}

/** A maker mark's markup at one size. */
function markHtml(size: number): string {
  return renderToStaticMarkup(createElement(MakerMark, { testId: "kit-makermark", char: "S", size }));
}

/** The seal's date line as drawn: "14" when it shows (the kit's 14 px class, no inline size), "none" when it's left out. */
function sealDatePx(lang: "en" | "zh", size: number): string {
  const html = sealHtml(lang, size);
  if (!html.includes("c-seal__date")) return "none";
  return html.match(/c-seal__date"(?: style="font-size:(\d+)px")?/)?.[1] ?? "14";
}

const sampleText = (en: string, zh: string) => ({ en, zh });

describe("search bar chips", () => {
  const base: SearchBarProps = {
    testIds: { input: "search-input", submit: "search-submit", chipPrefix: "search-chip-" },
    value: "a soft gift",
    onChange: () => {},
    chips: ["soft wool", "under $90"],
    onSubmit: () => {},
    placeholder: sampleText("Describe a feeling", "描述一种感觉"),
    lang: "en",
  };

  it("numbers chips from 1, with the remove control's ID after the prefix", () => {
    expect(chipTestIds("search-chip-", 1)).toEqual({ chip: "search-chip-1", remove: "search-chip-remove-1" });
    expect(chipTestIds("search-chip-", 12)).toEqual({ chip: "search-chip-12", remove: "search-chip-remove-12" });
  });

  it("removes and adds chips without moving the others", () => {
    expect(removeChipAt(["a", "b", "c"], 0)).toEqual(["b", "c"]);
    expect(removeChipAt(["a", "b", "c"], 2)).toEqual(["a", "b"]);
    expect(addChip(["a"], "  river  stone ")).toEqual(["a", "river stone"]);
    expect(addChip(["River stone"], "river stone")).toEqual(["River stone"]);
    expect(addChip(["a"], "   ")).toEqual(["a"]);
  });

  it("puts every chip and remove ID on the page, and the input and submit IDs", () => {
    const html = renderToStaticMarkup(createElement(SearchBar, { ...base, onChipsChange: () => {} }));
    for (const id of ["search-input", "search-submit", "search-chip-1", "search-chip-2", "search-chip-remove-1", "search-chip-remove-2"]) {
      expect(html).toContain(`data-testid="${id}"`);
    }
    // The chip's text is its label alone: the remove control has an accessible name and no text.
    expect(textOf(elementWith(html, 'data-testid="search-chip-2"'))).toBe("under $90");
  });

  it("calls onChipsChange with only the second chip when search-chip-remove-1 is pressed", () => {
    const onChipsChange = vi.fn();
    const remove = findElement(SearchBar({ ...base, onChipsChange }), byTestId("search-chip-remove-1"));
    expect(remove).not.toBeNull();
    (remove!.props.onClick as () => void)();
    expect(onChipsChange).toHaveBeenCalledTimes(1);
    expect(onChipsChange).toHaveBeenCalledWith(["under $90"]);
  });

  it("shows read-only chips with no remove control without onChipsChange", () => {
    const html = renderToStaticMarkup(createElement(SearchBar, base));
    expect(html).toContain('data-testid="search-chip-1"');
    expect(html).not.toContain("search-chip-remove-");
  });

  it("marks a selected chip by an attribute as well as its look", () => {
    const html = renderToStaticMarkup(createElement(Chip, { testId: "kit-chip", label: "wool", selected: true, onClick: () => {} }));
    expect(html).toContain('data-selected="true"');
    expect(html).toContain('aria-pressed="true"');
  });
});

describe("demo verification lines (A2-3)", () => {
  const card: PieceCardProps = {
    testId: "kit-piece",
    image: "/images/sample.svg",
    imageAlt: sampleText("A sample drawing", "示例插图"),
    title: sampleText("Sample woven runner", "示例织带"),
    makerName: sampleText("Sample Maker", "示例匠人"),
    makerChar: "S",
    communityName: sampleText("Sample River Co-op", "示例河流合作社"),
    priceCents: 12345,
    verification: sampleText("Nation attestation", "部族认证"),
    lang: "en",
  };

  it("starts a piece card's line with L3 only with demo", () => {
    expect(pieceVerificationText(card.verification, true, "en")).toBe("Demo verification · Nation attestation");
    expect(pieceVerificationText(card.verification, true, "zh")).toBe("演示认证 · 部族认证");
    expect(pieceVerificationText(undefined, true, "en")).toBe("Demo verification");
    expect(pieceVerificationText(card.verification, false, "en")).toBe("Nation attestation");
    expect(pieceVerificationText(undefined, false, "en")).toBeNull();
  });

  it("renders the piece card's verification line starting with L3, in each language", () => {
    for (const lang of ["en", "zh"] as const) {
      const html = renderToStaticMarkup(createElement(PieceCard, { ...card, lang, demo: true, verificationTestId: "kit-piece-verif" }));
      expect(textOf(elementWith(html, 'data-testid="kit-piece-verif"')).startsWith(L3[lang])).toBe(true);
    }
    const plain = renderToStaticMarkup(createElement(PieceCard, { ...card, verificationTestId: "kit-piece-verif" }));
    expect(textOf(plain)).not.toContain(L3.en);
    expect(textOf(elementWith(plain, 'data-testid="kit-piece-verif"'))).toBe("Nation attestation");
  });

  it("always tags the picture as an illustration and prices through Money", () => {
    const html = renderToStaticMarkup(createElement(PieceCard, card));
    expect(html).toContain('data-testid="kit-piece"');
    expect(textOf(elementWith(html, 'data-role="illustration-tag"'))).toBe("Illustration");
    expect(html).toMatch(/class="c-money"[^>]*>\$123\.45</);
    const zh = renderToStaticMarkup(createElement(PieceCard, { ...card, lang: "zh" }));
    expect(textOf(elementWith(zh, 'data-role="illustration-tag"'))).toBe("插图");
  });

  it("gives a VerificationLine L3 first and L4 under it with demo, word for word in both languages", () => {
    expect(L3).toEqual({ en: "Demo verification", zh: "演示认证" });
    expect(L4).toEqual({
      en: "Demo: this shows how verification would work. No real check was done.",
      zh: "演示：这里展示认证将如何进行。并未做过真实核查。",
    });
    const props = {
      testId: "community-verification",
      method: "nation_attestation" as const,
      by: sampleText("The sample nation, in a real launch", "正式上线后由示例部族认证"),
      note: sampleText("A sample note.", "示例说明。"),
    };
    for (const lang of ["en", "zh"] as const) {
      const html = renderToStaticMarkup(createElement(VerificationLine, { ...props, lang, demo: true }));
      const text = textOf(html);
      expect(text.startsWith(L3[lang])).toBe(true);
      expect(textOf(elementWith(html, 'data-role="demo-note"'))).toBe(L4[lang]);
      expect(text.indexOf(L4[lang])).toBeGreaterThan(text.indexOf(L3[lang]));
      const plain = textOf(renderToStaticMarkup(createElement(VerificationLine, { ...props, lang })));
      expect(plain).not.toContain(L3[lang]);
      expect(plain).not.toContain(L4[lang]);
      expect(plain.startsWith(lang === "en" ? "Nation attestation" : "部族认证")).toBe(true);
    }
    expect(verificationLines({ en: "M", zh: "M" }, false, "en")).toEqual({ head: "M", demoNote: null });
  });
});

describe("community card", () => {
  it("shows the kind as its glossary word", () => {
    const props = {
      testId: "kit-community",
      name: sampleText("Sample River Co-op", "示例河流合作社"),
      people: sampleText("Sample nation", "示例部族"),
      place: sampleText("Sample valley", "示例山谷"),
      craft: sampleText("Sample weaving", "示例编织"),
      kind: "native_american" as const,
    };
    expect(textOf(elementWith(renderToStaticMarkup(createElement(CommunityCard, { ...props, lang: "en" })), 'data-role="kind"'))).toBe("Native American");
    expect(textOf(elementWith(renderToStaticMarkup(createElement(CommunityCard, { ...props, lang: "zh" })), 'data-role="kind"'))).toBe("美洲原住民");
  });
});

describe("project progress", () => {
  it("is raised over goal, held between 0 and 1", () => {
    expect(progressShare(1250, 5000)).toBe(0.25);
    expect(progressShare(0, 5000)).toBe(0);
    expect(progressShare(9000, 5000)).toBe(1);
    expect(progressShare(100, 0)).toBe(0);
    expect(progressShare(-5, 100)).toBe(0);
  });
  it("rounds the percent down, so it reads 100% only once the goal is met", () => {
    expect(progressPercent(1250, 5000)).toBe(25);
    expect(progressPercent(29, 100)).toBe(29);
    expect(progressPercent(4999, 5000)).toBe(99);
    expect(progressPercent(5000, 5000)).toBe(100);
    expect(progressPercent(7000, 5000)).toBe(100);
  });
  it("puts the raised and goal amounts through Money inside the progress test ID", () => {
    for (const lang of ["en", "zh"] as const) {
      const html = renderToStaticMarkup(
        createElement(ProjectCard, {
          testId: "kit-project",
          progressTestId: "kit-project-progress",
          title: sampleText("Sample project", "示例项目"),
          summary: sampleText("A sample summary.", "示例简介。"),
          raisedCents: 43210,
          goalCents: 172840,
          lang,
        }),
      );
      const progress = textOf(elementWith(html, 'data-testid="kit-project-progress"'));
      expect(progress).toBe(lang === "en" ? "$432.10 raised of $1,728.40 · 25%" : "已筹 $432.10，目标 $1,728.40 · 25%");
      expect(html).toContain('aria-valuenow="25"');
    }
  });
});

describe("milestone shares", () => {
  it("lays each milestone along the thread by its share, in order", () => {
    expect(milestoneSegments([3000, 4000, 3000])).toEqual([
      { start: 0, width: 0.3 },
      { start: 0.3, width: 0.4 },
      { start: 0.7, width: 0.3 },
    ]);
    // Shares short of the whole leave the rest of the thread empty, and an overfull list never runs past the end.
    expect(milestoneSegments([5000])).toEqual([{ start: 0, width: 0.5 }]);
    const over = milestoneSegments([8000, 8000]);
    expect(over[1].start + over[1].width).toBeCloseTo(1, 10);
    expect(milestoneSegments([2000, Number.NaN, -10])).toEqual([
      { start: 0, width: 0.2 },
      { start: 0.2, width: 0 },
      { start: 0.2, width: 0 },
    ]);
  });
  it("gives each milestone its prefixed test ID, its share, amount, status word and date", () => {
    const html = renderToStaticMarkup(
      createElement(MilestoneTimeline, {
        testIdPrefix: "wip-milestone-",
        lang: "en",
        milestones: [
          { milestoneId: "mls_a", label: sampleText("Sample start", "示例开始"), shareBps: 3000, amountCents: 3703, status: "paid", date: "2031-02-03" },
          { milestoneId: "mls_b", label: sampleText("Sample finish", "示例完成"), shareBps: 7000, status: "pending" },
        ],
        renderAction: (id) => (id === "mls_b" ? createElement("button", { "data-testid": "kit-release" }, "Release") : null),
      }),
    );
    const paid = textOf(elementWith(html, 'data-testid="wip-milestone-mls_a"'));
    expect(paid).toContain("30%");
    expect(paid).toContain("$37.03");
    expect(paid).toContain("Paid");
    expect(paid).toContain("Feb 3, 2031");
    const pending = elementWith(html, 'data-testid="wip-milestone-mls_b"');
    expect(textOf(pending)).toContain("Pending");
    expect(pending).toContain('data-testid="kit-release"');
    expect(elementWith(html, 'data-testid="wip-milestone-mls_a"')).not.toContain("kit-release");
  });
});

describe("score bar", () => {
  it("fills from 0 to 1 and shows the figure to two places", () => {
    expect(scoreFraction(0.914)).toBe(0.914);
    expect(scoreFraction(1.4)).toBe(1);
    expect(scoreFraction(-1)).toBe(0);
    expect(scoreFraction(Number.NaN)).toBe(0);
    expect(formatScore(0.914)).toBe("0.91");
    const html = renderToStaticMarkup(createElement(ScoreBar, { testId: "kit-score", value: 0.5, label: "closeness", tone: "jade" }));
    expect(html).toContain('data-testid="kit-score"');
    expect(textOf(html)).toBe("closeness0.50");
    expect(html).toContain("width:50%");
  });
});

describe("stat tile", () => {
  it("shows the attention rule only with attention, and the figure inside data-role=value", () => {
    const withRule = renderToStaticMarkup(createElement(StatTile, { testId: "kit-tile", title: sampleText("Sample", "示例"), lang: "en", value: 42, attention: true }));
    expect(withRule).toContain('data-role="attention-rule"');
    expect(textOf(elementWith(withRule, 'data-role="value"'))).toBe("42");
    const quiet = renderToStaticMarkup(createElement(StatTile, { testId: "kit-tile", title: sampleText("Sample", "示例"), lang: "en", value: "7" }));
    expect(quiet).not.toContain("attention-rule");
  });
  it("leaves a node's own data-role=value alone, so the figure is marked once", () => {
    const value = createElement("span", { "data-role": "value" }, "$12.34");
    const html = renderToStaticMarkup(createElement(StatTile, { testId: "kit-tile", title: sampleText("Sample", "示例"), lang: "en", value }));
    expect(html.match(/data-role="value"/g)).toHaveLength(1);
  });
});

describe("the seal's date", () => {
  it("shows the month and day only, so the date fits on one line", () => {
    expect(formatMonthDay("2026-10-01", "en")).toBe("Oct 1");
    expect(formatMonthDay("2026-10-01", "zh")).toBe("10月1日");
    expect(formatMonthDay("not a date", "en")).toBe("not a date");
    const html = renderToStaticMarkup(createElement(Seal, { testId: "kit-seal", char: "R", date: "2026-10-01", lang: "en", size: 64 }));
    expect(textOf(html)).toBe("ROct 1");
    expect(html).not.toContain("2026");
  });
  it("keeps the date at 14 px, and leaves it out of a seal too small to hold it at 14 px", () => {
    const at = sealDatePx;
    expect(at("en", 64)).toBe("14");
    expect(at("en", 52)).toBe("14");
    expect(at("en", 48)).toBe("14");
    expect(at("zh", 64)).toBe("14");
    // The approvals compact seal (48 px) and the process view's seal (52 px) can't hold "10月1日" at 14 px.
    expect(at("zh", 52)).toBe("none");
    expect(at("zh", 48)).toBe("none");
    // The seal without its date still shows its character and says it's sealed.
    const html = sealHtml("zh", 48);
    expect(textOf(html)).toBe("R");
    expect(html).toContain('aria-label="已盖章"');
  });
  it("never draws text under 14 px, at any size, date or language", () => {
    const dates = ["2026-10-01", "2026-03-04", "2026-11-28", "2026-05-22", "2026-09-30"];
    for (const lang of ["en", "zh"] as const) {
      for (let size = 16; size <= 96; size += 4) {
        for (const date of dates) {
          const html = sealHtml(lang, size, date);
          for (const px of inlineFontPx(html)) expect(px, `${lang} ${size} ${date}`).toBeGreaterThanOrEqual(14);
          // The date line never carries a size of its own, so it's the kit's 14 px.
          expect(html, `${lang} ${size} ${date}`).not.toMatch(/c-seal__date" style=/);
        }
      }
    }
  });
});

describe("maker mark glyph", () => {
  it("floors the glyph at 14 px, so a size-20 mark shows a 14 px glyph", () => {
    expect(inlineFontPx(markHtml(20))).toEqual([14]);
    expect(markHtml(20)).toContain("width:20px;height:20px");
  });
  it("keeps 55% of the mark once that's 14 px or more", () => {
    expect(inlineFontPx(markHtml(28))).toEqual([15]);
    expect(inlineFontPx(markHtml(36))).toEqual([20]);
    expect(inlineFontPx(markHtml(48))).toEqual([26]);
  });
  it("never draws its glyph under 14 px, at any size", () => {
    for (let size = 8; size <= 64; size += 1) {
      const px = inlineFontPx(markHtml(size));
      expect(px, `size ${size}`).toHaveLength(1);
      expect(px[0], `size ${size}`).toBeGreaterThanOrEqual(14);
    }
  });
});
