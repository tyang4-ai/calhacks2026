// T3: the rule for what /store/:slug shows (acceptance 4, D1-50). Expected values come from src/mock/.
import { describe, expect, it } from "vitest";
import type { Storefront, StorefrontBlock } from "../../core/types";
import { storefronts } from "../../mock";
import { pageView, storefrontBySlug } from "./pageView";

const sto01 = storefronts.find((s) => s.id === "sto_01")!;

/** sto_01 as a draft, the way a storefront that isn't published yet sits in the mock. */
const draftStore: Storefront = { ...sto01, status: "draft" };

/** sto_01's blocks with the hero's tagline edited, as a publish would carry them. */
function editedBlocks(): StorefrontBlock[] {
  return sto01.blocks.map((b) => (b.kind === "hero" ? { ...b, props: { ...b.props, tagline: `${String(b.props.tagline)} (edited)` } } : b));
}

describe("pageView", () => {
  it("a published storefront with no publish event shows the mock's blocks and no draft note", () => {
    expect(sto01.status).toBe("published");
    const view = pageView(sto01, null);
    expect(view.blocks).toEqual(sto01.blocks);
    expect(view.draftNote).toBe(false);
    expect(view.from).toBe("mock");
  });

  it("a publish event's blocks replace the mock's, edits included, with no draft note", () => {
    const blocks = editedBlocks();
    const view = pageView(sto01, { blocks });
    expect(view.blocks).toEqual(blocks);
    expect(view.blocks).not.toEqual(sto01.blocks);
    expect(view.draftNote).toBe(false);
    expect(view.from).toBe("published");
  });

  it("a draft storefront with no publish shows its mock blocks under the draft note", () => {
    const view = pageView(draftStore, undefined);
    expect(view.blocks).toEqual(draftStore.blocks);
    expect(view.draftNote).toBe(true);
    expect(view.from).toBe("mock");
  });

  it("a draft storefront that was then published shows the published blocks and no note", () => {
    const blocks = editedBlocks();
    const view = pageView(draftStore, { blocks });
    expect(view.blocks).toEqual(blocks);
    expect(view.draftNote).toBe(false);
    expect(view.from).toBe("published");
  });

  it("finds a storefront by its slug, and nothing for an unknown slug", () => {
    for (const s of storefronts) expect(storefrontBySlug(storefronts, s.slug)?.id).toBe(s.id);
    expect(storefrontBySlug(storefronts, "no-such-slug")).toBeUndefined();
    expect(storefrontBySlug(storefronts, undefined)).toBeUndefined();
  });
});
