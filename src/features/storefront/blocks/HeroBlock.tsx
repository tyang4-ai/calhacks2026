// The hero block (T2): the community's name, its place and the block's tagline, a plain craft line
// (A2 R23). The tagline is an English string from the data, so it keeps lang="en" in Chinese.
import { t } from "../strings";
import styles from "../storefront.module.css";
import { textProp } from "../workingCopy";
import { type BlockProps, Placeholder } from "./parts";

export function HeroBlock({ block, community, lang }: BlockProps) {
  const tagline = textProp(block, "tagline").trim();
  return (
    <>
      <h1 className={styles.heroName}>{t(community.name, lang)}</h1>
      <p className={styles.heroPlace}>{t(community.place, lang)}</p>
      {tagline ? (
        <p className={styles.heroTagline} lang="en">
          {tagline}
        </p>
      ) : (
        <Placeholder lang={lang} />
      )}
    </>
  );
}
