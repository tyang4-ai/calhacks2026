// What the public page shows (T3, B1-43, D1-50), as one pure rule:
// - the blocks of the newest storefront.published for that storefront, which carries them,
// - otherwise the mock's blocks,
// - and the draft note ("Draft. Not published yet.") only when the mock's status is draft and the
//   store holds no storefront.published for it.
// A Designer draft the owner didn't use and publish never reaches the page, because the rule reads
// only the published entry. No "came after" rule, so a paused player's tied `at` values can't
// confuse it.
import type { Storefront, StorefrontBlock } from "../../core/types";

export interface PublishedEntry {
  blocks: StorefrontBlock[];
}

export interface PageView {
  blocks: StorefrontBlock[];
  /** True when store-draft-note shows at the top of the page. */
  draftNote: boolean;
  /** Where the blocks came from. */
  from: "published" | "mock";
}

export function pageView(storefront: Storefront, published: PublishedEntry | null | undefined): PageView {
  if (published && Array.isArray(published.blocks)) return { blocks: published.blocks, draftNote: false, from: "published" };
  return { blocks: storefront.blocks, draftNote: storefront.status === "draft", from: "mock" };
}

/** The storefront at a slug, or undefined for an unknown one. */
export function storefrontBySlug(list: readonly Storefront[], slug: string | undefined): Storefront | undefined {
  if (!slug) return undefined;
  return list.find((s) => s.slug === slug);
}
