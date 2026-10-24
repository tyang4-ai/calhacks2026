// The scoreboard: "Caught N of M" from proof.scored. The score line is final the moment the score
// exists; the fill bar under it fills once on the player clock (the stitch timing) when the score
// arrives while the demo plays. After a seek or reset, at mount, or under reduced motion it shows
// final at once. Before the event it says the test hasn't been scored yet.
import { useState } from "react";
import { player, useCindia, type Payloads } from "../../core";
import { stitchProgress, usePlayerTime, useReducedMotion } from "../../ui";
import { UI, caughtOf, t, type Lang } from "./strings";

type Score = Payloads["proof.scored"] | null;

interface FillState {
  score: Score;
  epoch: number;
  /** Player time the fill started, or null when the fill shows final at once. */
  startAt: number | null;
}

export function Scoreboard({ lang }: { lang: Lang }) {
  const score = useCindia((s) => s.proof.score);
  const now = usePlayerTime();
  const reduced = useReducedMotion();
  const epoch = player.epoch();

  const [fill, setFill] = useState<FillState>(() => ({ score, epoch, startAt: null }));
  if (fill.score !== score || fill.epoch !== epoch) {
    // Animate only when the score first appears during plain playback: same epoch, was empty, playing.
    const animate = score !== null && fill.score === null && fill.epoch === epoch && player.isPlaying();
    setFill({ score, epoch, startAt: animate ? player.now() : null });
  }

  const ratio = score && score.total > 0 ? score.caught / score.total : 0;
  const grown = fill.startAt === null ? 1 : stitchProgress(now, fill.startAt, reduced);
  const width = score ? ratio * grown : 0;
  const allCaught = score !== null && score.caught >= score.total;
  const barColor = allCaught ? "var(--c-color-jade)" : "var(--c-color-seal)";
  const line = score ? t(caughtOf(score.caught, score.total), lang) : t(UI.notScored, lang);
  const headingFont = lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)";

  return (
    <section
      lang={lang}
      style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-12)" }}
    >
      <div
        data-testid="proof-score"
        data-state={score ? (allCaught ? "all-caught" : "missed") : "not-scored"}
        style={{
          fontFamily: headingFont,
          fontSize: score ? "var(--c-text-36)" : "var(--c-text-24)",
          lineHeight: 1.2,
          color: score ? (allCaught ? "var(--c-color-jade)" : "var(--c-color-seal)") : "var(--c-color-ink-soft)",
        }}
      >
        {line}
      </div>
      <div
        role="progressbar"
        aria-label={line}
        aria-valuemin={0}
        aria-valuemax={score?.total ?? 0}
        aria-valuenow={score?.caught ?? 0}
        style={{
          position: "relative",
          height: "var(--c-space-12)",
          background: "var(--c-color-mat)",
          border: "1px solid var(--c-color-line)",
          borderRadius: "var(--c-radius-control)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${width * 100}%`,
            background: barColor,
          }}
        />
      </div>
      {!score && (
        <p style={{ margin: 0, fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
          {t(UI.notScoredHint, lang)}
        </p>
      )}
    </section>
  );
}

export default Scoreboard;
