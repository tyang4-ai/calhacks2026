// The four storefronts, sto_01 to sto_04, one per community in community order, all published.
// DEMO DATA: fictional storefronts made for a demo. Block props are single strings or string lists
// (data-model.md, Storefront blocks), built from the community and catalog records:
// - hero: tagline, a plain craft line with no slogan about spirit, ancestors or authenticity (R23),
// - story: title and body, the community's about, which the page renders under L8,
// - pieces: pieceIds, the community's own pieces,
// - process: title and body, the community's physical steps from its pieces' process data (the
//   body never renders),
// - projects: projectIds,
// - visit: address, the region only, and hours "Visits by arrangement". No street address, phone,
//   email or opening hours (R22).
// Block IDs run blk_01 onward across the four, so run_03's drafted blocks come after them.
import type { Community, Storefront, StorefrontBlock } from "../core/types";
import { pieces } from "./catalog";
import { communities } from "./communities";

interface Look {
  slug: string;
  accent: "jade" | "seal" | "amber" | "ink";
  layout: Storefront["theme"]["layout"];
  tagline: string;
  storyTitle: string;
}

const LOOKS: Record<string, Look> = {
  com_dine: { slug: "dine-weavers", accent: "seal", layout: "story_first", tagline: "Handwoven wool and stamped silver", storyTitle: "About the co-op" },
  com_ojibwe: { slug: "ojibwe-beadwork", accent: "jade", layout: "grid_first", tagline: "Floral beadwork on cloth and leather", storyTitle: "About the co-op" },
  com_acoma: { slug: "acoma-pottery", accent: "amber", layout: "story_first", tagline: "Coil-built pots, painted by hand", storyTitle: "About the studio" },
  com_seminole: { slug: "seminole-patchwork", accent: "ink", layout: "grid_first", tagline: "Patchwork skirts and jackets, sewn in bands", storyTitle: "About the co-op" },
};

let nextBlock = 1;
function block(kind: StorefrontBlock["kind"], props: StorefrontBlock["props"]): StorefrontBlock {
  return { blockId: `blk_${String(nextBlock++).padStart(2, "0")}`, kind, props };
}

function storefront(c: Community): Storefront {
  const look = LOOKS[c.id];
  const own = pieces.filter((p) => p.communityId === c.id);
  // The process body lists the community's physical steps, from the pieces' own process data.
  const steps = [...new Set(own.flatMap((p) => p.process.map((s) => s.step.en)))];
  const stepList = `${steps.map((s, i) => (i === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1))).join(", ")}.`;
  const hero = block("hero", { tagline: look.tagline });
  const story = () => block("story", { title: look.storyTitle, body: c.about.en });
  const grid = () => block("pieces", { pieceIds: own.map((p) => p.id) });
  // story_first puts the story before the pieces, grid_first the pieces before the story.
  const middle = look.layout === "story_first" ? [story(), grid()] : [grid(), story()];
  return {
    id: c.storefrontId,
    communityId: c.id,
    slug: look.slug,
    theme: { accent: look.accent, layout: look.layout },
    blocks: [
      hero,
      ...middle,
      block("process", { title: "How the work is made", body: stepList }),
      block("projects", { projectIds: [...c.projectIds] }),
      block("visit", { address: c.place.en, hours: "Visits by arrangement" }),
    ],
    status: "published",
  };
}

export const storefronts: Storefront[] = communities.map(storefront);
