// The visit block (T2): the block's `address` and `hours` text. The data holds only the community's
// region and "Visits by arrangement" there, never a street address, a phone number, an email or
// opening hours (A2 R22). Both are English strings from the data, so they keep lang="en".
import { PROP_LABELS, UI, t } from "../strings";
import styles from "../storefront.module.css";
import { textProp } from "../workingCopy";
import { BlockHeading, type BlockProps, Placeholder } from "./parts";

export function VisitBlock({ block, lang, accent }: BlockProps) {
  const address = textProp(block, "address").trim();
  const hours = textProp(block, "hours").trim();
  return (
    <>
      <BlockHeading text={t(UI.visitHeading, lang)} accent={accent} lang={lang} />
      {address || hours ? (
        <dl className={styles.visit}>
          {address && (
            <div className={styles.visitRow}>
              <dt className={styles.visitLabel}>{t(PROP_LABELS.address, lang)}</dt>
              <dd className={styles.visitValue} lang="en">
                {address}
              </dd>
            </div>
          )}
          {hours && (
            <div className={styles.visitRow}>
              <dt className={styles.visitLabel}>{t(PROP_LABELS.hours, lang)}</dt>
              <dd className={styles.visitValue} lang="en">
                {hours}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <Placeholder lang={lang} />
      )}
    </>
  );
}
