// T4: the working copy's pure functions. Expected values come from src/mock/.
import { describe, expect, it } from "vitest";
import type { Storefront } from "../../core/types";
import { storefronts, swarmRuns } from "../../mock";
import {
  ACCENTS,
  accentOf,
  accentVar,
  applyDraft,
  layoutOf,
  moveDown,
  moveUp,
  sameBlocks,
  setAccent,
  setLayout,
  setText,
  startCopy,
  textPropsOf,
} from "./workingCopy";

const sto01 = storefronts.find((s) => s.id === "sto_01")!;
const sto02 = storefronts.find((s) => s.id === "sto_02")!;
const ids = (blocks: { blockId: string }[]) => blocks.map((b) => b.blockId);
const run03 = swarmRuns.find((r) => r.runId === "run_03")!;
const drafted = run03.final.find((e) => e.type === "storefront.drafted")!.payload as { blocks: Storefront["blocks"] };

describe("startCopy", () => {
  it("starts from the mock's blocks and theme when nothing was published", () => {
    const copy = startCopy(sto01);
    expect(copy.blocks).toEqual(sto01.blocks);
    expect(copy.blocks).not.toBe(sto01.blocks);
    expect(copy.accent).toBe(sto01.theme.accent);
    expect(copy.layout).toBe(sto01.theme.layout);
  });

  it("starts from the published blocks when there are some", () => {
    const published = sto01.blocks.toReversed();
    const copy = startCopy(sto01, published);
    expect(ids(copy.blocks)).toEqual(ids(published));
  });

  it("reads each mock storefront's layout from its order", () => {
    for (const s of storefronts) expect(layoutOf(s.blocks, "story_first")).toBe(s.theme.layout);
  });
});

describe("moves", () => {
  it("moves the second block up and the first down, and never changes the copy it was given", () => {
    const copy = startCopy(sto01);
    const before = ids(copy.blocks);
    const up = moveUp(copy, copy.blocks[1].blockId);
    expect(ids(up.blocks)).toEqual([before[1], before[0], ...before.slice(2)]);
    expect(ids(copy.blocks)).toEqual(before);
    const down = moveDown(copy, copy.blocks[0].blockId);
    expect(ids(down.blocks)).toEqual(ids(up.blocks));
  });

  it("leaves the first block's move up and the last block's move down as they are", () => {
    const copy = startCopy(sto01);
    expect(moveUp(copy, copy.blocks[0].blockId)).toBe(copy);
    expect(moveDown(copy, copy.blocks[copy.blocks.length - 1].blockId)).toBe(copy);
    expect(moveUp(copy, "blk_none")).toBe(copy);
  });

  it("recomputes the layout when a move puts the pieces before the story", () => {
    const copy = startCopy(sto01);
    const pieces = copy.blocks.find((b) => b.kind === "pieces")!;
    expect(copy.layout).toBe("story_first");
    expect(moveUp(copy, pieces.blockId).layout).toBe("grid_first");
  });
});

describe("text, accent and layout", () => {
  it("sets one text prop of one block in a new copy", () => {
    const copy = startCopy(sto01);
    const hero = copy.blocks.find((b) => b.kind === "hero")!;
    const next = setText(copy, hero.blockId, "tagline", "New tagline");
    expect(next.blocks.find((b) => b.blockId === hero.blockId)!.props.tagline).toBe("New tagline");
    expect(copy.blocks.find((b) => b.blockId === hero.blockId)!.props.tagline).toBe(sto01.blocks[0].props.tagline);
    expect(sameBlocks(next.blocks, copy.blocks)).toBe(false);
    expect(setText(copy, "blk_none", "tagline", "x")).toBe(copy);
  });

  it("sets the accent to a kit token name, and ink for an unknown one", () => {
    const copy = startCopy(sto01);
    for (const a of ACCENTS) expect(setAccent(copy, a).accent).toBe(a);
    expect(setAccent(copy, "#ff0000").accent).toBe("ink");
    expect(accentOf(undefined)).toBe("ink");
    expect(accentVar("jade")).toBe("var(--c-color-jade)");
  });

  it("switches the layout by swapping the story and the pieces", () => {
    const copy = startCopy(sto01);
    const grid = setLayout(copy, "grid_first");
    expect(grid.layout).toBe("grid_first");
    expect(layoutOf(grid.blocks, "story_first")).toBe("grid_first");
    const back = setLayout(grid, "story_first");
    expect(ids(back.blocks)).toEqual(ids(copy.blocks));
    expect(ids(setLayout(startCopy(sto02), "grid_first").blocks)).toEqual(ids(sto02.blocks));
  });
});

describe("applyDraft", () => {
  it("replaces the blocks with the Designer's and keeps the accent", () => {
    const copy = setAccent(startCopy(sto01), "jade");
    const next = applyDraft(copy, drafted.blocks);
    expect(next.blocks).toEqual(drafted.blocks);
    expect(next.accent).toBe("jade");
    expect(next.layout).toBe(layoutOf(drafted.blocks, copy.layout));
  });

  it("offers no body to edit, since neither body ever renders", () => {
    expect(textPropsOf("story")).toEqual(["title"]);
    expect(textPropsOf("process")).toEqual(["title"]);
    expect(textPropsOf("hero")).toEqual(["tagline"]);
    expect(textPropsOf("visit")).toEqual(["address", "hours"]);
    expect(textPropsOf("pieces")).toEqual([]);
  });
});
