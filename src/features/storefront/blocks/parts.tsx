// What the block components share (T2): their props, the quiet placeholder for a missing prop, and
// a block heading with the accent's short rule before it.
import type { Community, Lang, StorefrontBlock } from "../../../core/types";
import { UI, t } from "../strings";
import styles from "../storefront.module.css";

export type Density = "page" | "preview";

/** What every block component gets. */
export interface BlockProps {
  block: StorefrontBlock;
  community: Community;
  lang: Lang;
  /** The accent's CSS variable, var(--c-color-<accent>). */
  accent: string;
  density: Density;
}

/** A quiet line in place of a missing prop or block. */
export function Placeholder({ lang }: { lang: Lang }) {
  return (
    <p className={styles.placeholder} data-placeholder="true">
      {t(UI.emptyProp, lang)}
    </p>
  );
}

/** A block's heading with the accent's short rule before it. `en` marks a heading taken from a block prop. */
export function BlockHeading({ text, accent, lang, en = false }: { text: string; accent: string; lang: Lang; en?: boolean }) {
  return (
    <h2 className={styles.blockHeading} lang={en ? "en" : lang}>
      <span className={styles.rule} style={{ background: accent }} aria-hidden="true" />
      <span>{text}</span>
    </h2>
  );
}
