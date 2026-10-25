// The process block (T2): the block's `title`, then the craft's steps from the first listed piece's
// `process`, with each step's hours. It never renders the block's `body`, from the mock or from a
// draft, so the steps on the page are always the piece data's physical steps and no agent
// describes how a community works (A2-22).
import type { Piece } from "../../../core/types";
import { UI, t, tf } from "../strings";
import styles from "../storefront.module.css";
import { textProp } from "../workingCopy";
import { BlockHeading, type BlockProps, Placeholder } from "./parts";

export function ProcessStepsBlock({ block, lang, accent, piece }: BlockProps & { piece: Piece | undefined }) {
  const title = textProp(block, "title").trim();
  const steps = piece?.process ?? [];
  return (
    <>
      {title ? <BlockHeading text={title} accent={accent} lang={lang} en /> : <Placeholder lang={lang} />}
      {piece && steps.length > 0 ? (
        <>
          <p className={styles.caption}>{tf(UI.stepsFor, lang, { title: t(piece.title, lang) })}</p>
          <ol className={styles.steps} data-piece-id={piece.id}>
            {steps.map((s, i) => (
              <li key={`${i}-${s.step.en}`} className={styles.step}>
                <span className={styles.stepN}>{i + 1}</span>
                <span className={styles.stepText}>{t(s.step, lang)}</span>
                <span className={styles.stepHours}>{tf(UI.hours, lang, { h: s.hours })}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <Placeholder lang={lang} />
      )}
    </>
  );
}
