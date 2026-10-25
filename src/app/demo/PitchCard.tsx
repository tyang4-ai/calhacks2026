// One pitch card, full frame on the stage while the camera is pitch (ui-contract.md, Camera states):
// a title and at most four short lines in large type, from pitch.ts, with L1 in small type at its
// foot, because the pitch camera has no top bar. The Cindia card's first line is the tagline.
// I3-redesign's T6 can own the card's look later.
import { L1 } from "../strings";
import { TAGLINE, type PitchCardText } from "./pitch";
import styles from "./stage.module.css";

export function PitchCard({ card }: { card: PitchCardText }) {
  return (
    <section className={styles.pitchCard} data-testid={`pitch-card-${card.id}`} data-card={card.id} lang="en">
      <div className={styles.pitchInner}>
        <h1 className={styles.pitchTitle}>{card.title}</h1>
        <ul className={styles.pitchLines}>
          {card.lines.map((line) => (
            <li key={line} className={line === TAGLINE ? styles.pitchTagline : styles.pitchLine}>
              {line}
            </li>
          ))}
        </ul>
      </div>
      <p className={styles.pitchFoot}>{L1.en}</p>
    </section>
  );
}
