// The block renderer the builder's preview and the public page share (T2). It renders each block in
// order as store-block-<blockId>, one component per kind, with the theme's accent drawn as
// var(--c-color-<accent>) and never a hex. The layout (story_first or grid_first) is the order of
// the story and the pieces, which the blocks already carry, so it is kept here as data-layout.
// - Block text props are English strings from the data, so they keep lang="en" in Chinese.
// - Missing props render a quiet placeholder, and an unknown kind or community renders one too,
//   never a crash.
import type { Community, Lang, Piece, StorefrontBlock } from "../../core/types";
import { getById } from "../../mock";
import { firstListedPiece } from "./blockData";
import { HeroBlock } from "./blocks/HeroBlock";
import { type BlockProps, type Density, Placeholder } from "./blocks/parts";
import { PiecesBlock } from "./blocks/PiecesBlock";
import { ProcessStepsBlock } from "./blocks/ProcessStepsBlock";
import { ProjectsBlock } from "./blocks/ProjectsBlock";
import { StoryBlock } from "./blocks/StoryBlock";
import { VisitBlock } from "./blocks/VisitBlock";
import styles from "./storefront.module.css";
import { accentOf, accentVar, type Layout } from "./workingCopy";

export interface StoreBlocksProps {
  blocks: readonly StorefrontBlock[];
  theme: { accent: string; layout: Layout };
  /** The storefront's community (Storefront.communityId). */
  communityId: string;
  lang: Lang;
  /** The public page, or the builder's narrower preview. */
  density?: Density;
}

export function StoreBlocks({ blocks, theme, communityId, lang, density = "page" }: StoreBlocksProps) {
  const community = getById<Community>(communityId);
  const accent = accentVar(theme.accent);
  const firstPiece = firstListedPiece(blocks, communityId);
  return (
    <div
      className={density === "preview" ? styles.blocksPreview : styles.blocks}
      data-accent={accentOf(theme.accent)}
      data-layout={theme.layout}
      data-density={density}
      lang={lang}
    >
      {blocks.map((block) => {
        const props: BlockProps | null = community ? { block, community, lang, accent, density } : null;
        return (
          <section
            key={block.blockId}
            className={block.kind === "hero" ? styles.heroBlock : styles.block}
            data-testid={`store-block-${block.blockId}`}
            data-kind={block.kind}
            style={block.kind === "hero" ? { borderLeftColor: accent } : undefined}
          >
            {props ? <BlockBody props={props} firstPiece={firstPiece} /> : <Placeholder lang={lang} />}
          </section>
        );
      })}
    </div>
  );
}

function BlockBody({ props, firstPiece }: { props: BlockProps; firstPiece: Piece | undefined }) {
  switch (props.block.kind) {
    case "hero":
      return <HeroBlock {...props} />;
    case "story":
      return <StoryBlock {...props} />;
    case "pieces":
      return <PiecesBlock {...props} />;
    case "process":
      return <ProcessStepsBlock {...props} piece={firstPiece} />;
    case "projects":
      return <ProjectsBlock {...props} />;
    case "visit":
      return <VisitBlock {...props} />;
    default:
      return <Placeholder lang={props.lang} />;
  }
}
