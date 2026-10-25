// The builder's working copy (T4): pure functions over a storefront's blocks and its theme. Each
// returns a new copy and never changes the one it was given, so the builder keeps its edits in
// component state and nothing reaches the store until the owner publishes.
// - The layout is the order of the story and the pieces: story_first puts the first story block
//   before the first pieces block, grid_first after it. Setting the layout swaps the two, and a
//   move recomputes it, so the switch and the order never disagree, and a publish carries the
//   layout in its blocks.
// - The accent is a kit color token name (data-model.md, Storefront), drawn as
//   var(--c-color-<accent>), never a hex.
import type { Storefront, StorefrontBlock } from "../../core/types";

export type Layout = Storefront["theme"]["layout"];
export type BlockKind = StorefrontBlock["kind"];

export interface WorkingCopy {
  blocks: StorefrontBlock[];
  accent: string;
  layout: Layout;
}

/** The kit color tokens the accent picker offers (tokens.css, `--c-color-<name>`), in order. */
export const ACCENTS = ["seal", "jade", "amber", "ink"] as const;
export type Accent = (typeof ACCENTS)[number];

export const LAYOUTS: readonly Layout[] = ["story_first", "grid_first"];

/** A known accent token name, or ink for anything else. */
export function accentOf(name: string | undefined): Accent {
  return (ACCENTS as readonly string[]).includes(name ?? "") ? (name as Accent) : "ink";
}

/** The accent's CSS variable, such as var(--c-color-jade). */
export function accentVar(name: string | undefined): string {
  return `var(--c-color-${accentOf(name)})`;
}

/** A deep copy of a blocks list, so a working copy never shares a list prop with the store or the mock. */
export function cloneBlocks(blocks: readonly StorefrontBlock[]): StorefrontBlock[] {
  return blocks.map((b) => ({
    blockId: b.blockId,
    kind: b.kind,
    props: Object.fromEntries(Object.entries(b.props ?? {}).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])),
  }));
}

/** The layout the order shows: story_first when the first story comes before the first pieces block. */
export function layoutOf(blocks: readonly StorefrontBlock[], fallback: Layout): Layout {
  const story = blocks.findIndex((b) => b.kind === "story");
  const grid = blocks.findIndex((b) => b.kind === "pieces");
  if (story < 0 || grid < 0) return fallback;
  return story < grid ? "story_first" : "grid_first";
}

/** A copy with the given blocks, its layout read from their order. */
function withBlocks(copy: WorkingCopy, blocks: StorefrontBlock[]): WorkingCopy {
  return { ...copy, blocks, layout: layoutOf(blocks, copy.layout) };
}

/**
 * The working copy the builder starts from: the blocks of the newest storefront.published for the
 * storefront when there is one, otherwise the mock's. Never a Designer draft (applyDraft does that).
 */
export function startCopy(storefront: Storefront, publishedBlocks?: readonly StorefrontBlock[] | null): WorkingCopy {
  const blocks = cloneBlocks(publishedBlocks ?? storefront.blocks);
  return { blocks, accent: accentOf(storefront.theme.accent), layout: layoutOf(blocks, storefront.theme.layout) };
}

/** Moves a block one place up or down. The first can't move up and the last can't move down. */
export function moveBlock(copy: WorkingCopy, blockId: string, direction: "up" | "down"): WorkingCopy {
  const i = copy.blocks.findIndex((b) => b.blockId === blockId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= copy.blocks.length) return copy;
  const blocks = [...copy.blocks];
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  return withBlocks(copy, blocks);
}

export function moveUp(copy: WorkingCopy, blockId: string): WorkingCopy {
  return moveBlock(copy, blockId, "up");
}

export function moveDown(copy: WorkingCopy, blockId: string): WorkingCopy {
  return moveBlock(copy, blockId, "down");
}

/** Sets one text prop of one block. An unknown block leaves the copy as it is. */
export function setText(copy: WorkingCopy, blockId: string, prop: string, value: string): WorkingCopy {
  if (!copy.blocks.some((b) => b.blockId === blockId)) return copy;
  const blocks = copy.blocks.map((b) => (b.blockId === blockId ? { ...b, props: { ...b.props, [prop]: value } } : b));
  return { ...copy, blocks };
}

/** Sets the theme accent to a kit color token name (ink for an unknown one). */
export function setAccent(copy: WorkingCopy, accent: string): WorkingCopy {
  return { ...copy, accent: accentOf(accent) };
}

/** Sets the layout: swaps the first story and the first pieces block when their order says otherwise. */
export function setLayout(copy: WorkingCopy, layout: Layout): WorkingCopy {
  const story = copy.blocks.findIndex((b) => b.kind === "story");
  const grid = copy.blocks.findIndex((b) => b.kind === "pieces");
  if (story < 0 || grid < 0) return { ...copy, layout };
  if (layoutOf(copy.blocks, copy.layout) === layout) return { ...copy, layout };
  const blocks = [...copy.blocks];
  [blocks[story], blocks[grid]] = [blocks[grid], blocks[story]];
  return { ...copy, blocks, layout };
}

/** Replaces the working copy's blocks with the Designer's, keeping the accent. Only storefront-use-draft calls it. */
export function applyDraft(copy: WorkingCopy, draftBlocks: readonly StorefrontBlock[]): WorkingCopy {
  return withBlocks(copy, cloneBlocks(draftBlocks));
}

/** The text props the editor offers for a block kind. The story's and process's body never render, so neither is offered. */
export function textPropsOf(kind: BlockKind): string[] {
  switch (kind) {
    case "hero":
      return ["tagline"];
    case "story":
    case "process":
      return ["title"];
    case "visit":
      return ["address", "hours"];
    default:
      return [];
  }
}

/** A prop as a single string, or "" when it's missing or a list. */
export function textProp(block: StorefrontBlock, prop: string): string {
  const v = block.props?.[prop];
  return typeof v === "string" ? v : "";
}

/** A prop as a list of strings, or [] when it's missing or a single string. */
export function listProp(block: StorefrontBlock, prop: string): string[] {
  const v = block.props?.[prop];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** True when two blocks lists hold the same blocks, in the same order, with the same props. */
export function sameBlocks(a: readonly StorefrontBlock[], b: readonly StorefrontBlock[]): boolean {
  return JSON.stringify(cloneBlocks(a)) === JSON.stringify(cloneBlocks(b));
}
