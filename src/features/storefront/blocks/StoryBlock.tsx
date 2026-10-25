// The story block (T2): the block's title as its heading, then the community's `about` text with the
// Demo data badge and store-story-note (L8) under it. It never renders the block's `body`, from the
// mock or from a draft, so no agent ever writes a community's story (A2-22).
import { Badge } from "../../../ui";
import { L8, t } from "../strings";
import styles from "../storefront.module.css";
import { textProp } from "../workingCopy";
import { BlockHeading, type BlockProps, Placeholder } from "./parts";

export function StoryBlock({ block, community, lang, accent }: BlockProps) {
  const title = textProp(block, "title").trim();
  return (
    <>
      {title ? <BlockHeading text={title} accent={accent} lang={lang} en /> : <Placeholder lang={lang} />}
      <p className={styles.about}>{t(community.about, lang)}</p>
      <div className={styles.notes}>
        <Badge variant="demo" />
        <p className={styles.note} data-testid="store-story-note">
          {t(L8, lang)}
        </p>
      </div>
    </>
  );
}
