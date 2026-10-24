// The Excel workbook card. It drops onto the console once on workbook.ready, on the player clock.
//
// The drop starts at the workbook.ready event's time on the loaded timeline (or, for a live or test
// emit that isn't on it, when the card mounts), and follows the player's clock from there. It renders
// finished at once when the card mounts while the player is paused (a seek() from a test or the demo
// controls), when the player's epoch changes after mount (a seek or reset), and under reduced motion.
import { useState } from "react";
import type { Payloads } from "../../core/events";
import { player } from "../../core/player";
import { uiProgress, usePlayerTime, useReducedMotion } from "../../ui";
import { GLOSSARY, UI, t, type Lang } from "./strings";

export interface WorkbookCardProps {
  workbook: Payloads["workbook.ready"];
  lang: Lang;
}

interface DropStart {
  at: number;
  epoch: number;
  finished: boolean;
}

function dropStart(fileName: string): DropStart {
  const scripted = player
    .getTimeline()
    ?.events.find((e) => e.type === "workbook.ready" && (e.payload as Payloads["workbook.ready"]).fileName === fileName);
  return { at: scripted ? scripted.at : player.now(), epoch: player.epoch(), finished: !player.isPlaying() };
}

export function WorkbookCard({ workbook, lang }: WorkbookCardProps) {
  const now = usePlayerTime();
  const reduced = useReducedMotion();
  const [start] = useState(() => dropStart(workbook.fileName));
  const finished = reduced || start.finished || player.epoch() !== start.epoch;
  const p = finished ? 1 : uiProgress(now, start.at);

  return (
    <article
      data-testid="close-workbook"
      style={{
        border: "1px solid var(--c-color-line)",
        background: "var(--c-color-paper)",
        padding: 16,
        marginBottom: 12,
        opacity: p,
        transform: `translateY(${(1 - p) * -16}px)`,
      }}
    >
      <div style={{ color: "var(--c-color-ink-soft)", fontSize: "0.875rem" }}>{t(GLOSSARY.workbook, lang)}</div>
      <div style={{ fontWeight: 600, fontSize: "1.125rem", margin: "4px 0 8px" }}>{workbook.fileName}</div>
      <div style={{ fontSize: "0.875rem" }}>
        <span style={{ color: "var(--c-color-ink-soft)" }}>{t(UI.sheets, lang)}: </span>
        <ul style={{ display: "inline", listStyle: "none", margin: 0, padding: 0 }}>
          {workbook.sheets.map((name, i) => (
            <li key={`${name}-${i}`} style={{ display: "inline" }}>
              {i > 0 ? " · " : ""}
              {name}
            </li>
          ))}
        </ul>
      </div>
      <p style={{ color: "var(--c-color-ink-soft)", fontSize: "0.8125rem", margin: "8px 0 0" }}>
        {t(workbook.url ? UI.builtOnServer : UI.builtInBrowser, lang)}
      </p>
    </article>
  );
}
