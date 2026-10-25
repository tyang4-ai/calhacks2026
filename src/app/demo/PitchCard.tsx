// One pitch card, full frame on the stage while the camera is pitch (ui-contract.md, Camera states):
// a title and at most four short lines in large type, from pitch.ts, with L1 in small type at its
// foot, because the pitch camera has no top bar. The Cindia card's first line is the tagline.
// The look is design drop 3's (design/screens/pitch-card--what.png, --why, --how): the walnut beam
// as the ground, a thread across the top, the card's place in the three, and one dyed dot per line.
import { L1 } from "../strings";
import { PITCH_CARDS, TAGLINE, type PitchCardText } from "./pitch";
import styles from "./stage.module.css";

export function PitchCard({ card }: { card: PitchCardText }) {
  const place = PITCH_CARDS.findIndex((c) => c.id === card.id) + 1;
  return (
    <section className={styles.pitchCard} data-testid={`pitch-card-${card.id}`} data-card={card.id} lang="en">
      <div className={styles.pitchThread} aria-hidden="true" />
      <p className={styles.pitchCount}>
        {place} of {PITCH_CARDS.length}
      </p>
      <h1 className={styles.pitchTitle}>{card.title}</h1>
      <ul className={styles.pitchLines}>
        {card.lines.map((line) => (
          <li key={line} className={line === TAGLINE ? styles.pitchTagline : styles.pitchLine}>
            {line}
          </li>
        ))}
      </ul>
      <p className={styles.pitchFoot}>{L1.en}</p>
    </section>
  );
}
