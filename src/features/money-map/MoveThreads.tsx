// One kit Thread per money move, drawn inside the map's <svg viewBox="0 0 1000 600">.
// Moves between the same two parties (same direction, same lane) share one path: the newest is drawn
// full with the path's running total as its label, and the older ones stay on the path, faded and
// unlabeled. A project contribution runs in its own lane, so its amount never merges into a sale.
// A move whose money.moved carries nessieId (B04, B16) says "Checked against Nessie" in words beside
// its amount, so color never carries it, placed clear of the nodes, labels and other threads.
// The amount labels are drawn here rather than by the Thread itself, sized by the canvas's units per
// pixel (`unit`), so they draw at the kit's 14 px whatever the canvas's scale. They follow the
// Thread's own look: the paper box, the tone's color, fading in once the stitch is half sewn.
// Everything follows the player clock, so a seek() always renders the same frame. One exception: a
// move the loaded timeline doesn't play (a person's milestone release, answered at the player clock
// when it arrives, and its live twin) draws finished while the player is paused, because a paused
// clock never moves and its stitch would wait at 0 forever (the approvals seal and F-process do the
// same). While the player plays, it sews on the clock like every other move.
import { useMemo, useSyncExternalStore } from "react";
import { player, useCindia, type MoneyMove, type Party, type Timeline } from "../../core";
import { Thread, formatCents, stitchProgress, usePlayerTime, useReducedMotion, type Point, type ThreadProps } from "../../ui";
import { CANVAS_H, CANVAS_W, NODE_H, NODE_W, anchor, partyKey, partyPoint, studioMakerIds } from "./partyLayout";
import { moveKindNames, strings, t, type Lang } from "./strings";
import {
  LABEL_FONT_PX,
  LABEL_HALF_H,
  LABEL_HALF_W,
  curveMid,
  groupMoves,
  laneEnds,
  moveTone,
  noteWidth,
  placeNotes,
  rectAround,
  type NoteRequest,
} from "./threadGroups";

/** Opacity of older moves on a shared path. */
const OLDER_OPACITY = 0.35;
/** Nodes grow with their text (a maker's mark, a fund's title), so notes keep clear of a taller box. */
const NODE_CLEAR_HALF_H = NODE_H / 2 + 12;

/** The Thread's tone colors (design-system.md): jade in, seal out, ink otherwise. */
const TONE_COLOR: Record<NonNullable<ThreadProps["tone"]>, string> = {
  in: "var(--c-color-jade)",
  out: "var(--c-color-seal)",
  neutral: "var(--c-color-ink)",
  pending: "var(--c-color-amber)",
};

function hasNessie(m: MoneyMove): boolean {
  return typeof m.nessieId === "string" && m.nessieId !== "";
}

/** A clock far past every move, so a stitch reads finished. */
const FINISHED = Number.MAX_SAFE_INTEGER;

/** Whether the player plays, re-read on every player change (play, pause, seek and each frame). */
function usePlaying(): boolean {
  return useSyncExternalStore(player.subscribe, player.isPlaying, player.isPlaying);
}

/** The loaded timeline, a new object only when one is loaded. */
function useTimeline(): Timeline | null {
  return useSyncExternalStore(player.subscribe, player.getTimeline, player.getTimeline);
}

/** The IDs of the moves the timeline itself plays. */
function timelineMoveIds(timeline: Timeline | null): Set<string> {
  const ids = new Set<string>();
  for (const e of timeline?.events ?? []) {
    if (e.type === "money.moved") ids.add((e.payload as { moveId: string }).moveId);
  }
  return ids;
}

/** A path's amount, as the kit Thread draws it, at 14 drawn pixels. */
function AmountLabel({ at, cents, tone, progress, unit }: { at: Point; cents: number; tone: NonNullable<ThreadProps["tone"]>; progress: number; unit: number }) {
  if (progress < 0.5) return null;
  const w = LABEL_HALF_W * 2 * unit;
  const h = LABEL_HALF_H * 2 * unit;
  return (
    <g transform={`translate(${at.x} ${at.y})`} opacity={Math.min(1, (progress - 0.5) * 4)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={2 * unit} fill="var(--c-color-paper)" stroke="var(--c-color-line)" strokeWidth={unit} />
      <text className="c-thread__label" textAnchor="middle" dominantBaseline="central" fill={TONE_COLOR[tone]} style={{ fontSize: `${LABEL_FONT_PX * unit}px` }}>
        {formatCents(cents)}
      </text>
    </g>
  );
}

export function MoveThreads({ lang, unit = 1 }: { lang: Lang; /** Canvas units per drawn pixel. */ unit?: number }) {
  const now = usePlayerTime();
  const reduced = useReducedMotion();
  const playing = usePlaying();
  const timeline = useTimeline();
  const scripted = useMemo(() => timelineMoveIds(timeline), [timeline]);
  const moveIds = useCindia((s) => s.money.moveIds);
  const movesById = useCindia((s) => s.money.moves);
  /** The clock a move sews on: the player's, or finished for a move from outside the timeline while paused. */
  const clockFor = (m: MoneyMove) => (!playing && !scripted.has(m.moveId) ? FINISHED : now);

  // Only moves that have fired by the player clock count toward a path and its total.
  const moves = moveIds.map((id) => movesById[id]).filter((m): m is MoneyMove => Boolean(m) && m.at <= now);
  const groups = groupMoves(moves).map((g) => ({
    ...g,
    ends: laneEnds(g.lane, g.from, anchor(g.from, partyPoint(g.to)), anchor(g.to, partyPoint(g.from))),
  }));

  // "Checked against Nessie" notes, for moves whose stitch is at least half sewn.
  const noteText = t(strings.checkedNessie, lang);
  const requests: NoteRequest[] = [];
  for (const g of groups) {
    for (const id of g.moveIds) {
      const m = movesById[id];
      if (m && hasNessie(m) && stitchProgress(clockFor(m), m.at, reduced) >= 0.5) requests.push({ id, pathId: g.key, from: g.ends.from, to: g.ends.to });
    }
  }
  const notes =
    requests.length === 0
      ? new Map()
      : (() => {
          const parties = new Map<string, Party>();
          parties.set("studio", { kind: "studio", id: "std_dine" });
          for (const id of studioMakerIds()) parties.set(`maker-${id}`, { kind: "maker", id });
          for (const g of groups) {
            parties.set(partyKey(g.from), g.from);
            parties.set(partyKey(g.to), g.to);
          }
          return placeNotes(
            requests,
            {
              nodes: [...parties.values()].map((p) => rectAround(partyPoint(p), NODE_W / 2, NODE_CLEAR_HALF_H)),
              labels: groups.map((g) => rectAround(curveMid(g.ends.from, g.ends.to), LABEL_HALF_W * unit, LABEL_HALF_H * unit)),
              paths: groups.map((g) => ({ id: g.key, from: g.ends.from, to: g.ends.to })),
            },
            noteWidth(noteText),
            { w: CANVAS_W, h: CANVAS_H },
            unit,
          );
        })();

  return (
    <g aria-label={t(strings.moneyFlow, lang)}>
      {groups.map((g) => {
        const newestId = g.moveIds[g.moveIds.length - 1];
        return (
          <g key={g.key} data-pair={g.key} data-lane={g.lane}>
            {g.moveIds.map((id) => {
              const m = movesById[id];
              if (!m) return null;
              const newest = id === newestId;
              const note = notes.get(id);
              const clock = clockFor(m);
              const progress = stitchProgress(clock, m.at, reduced);
              const tone = moveTone(m.kind, m.to);
              return (
                <g
                  key={id}
                  data-testid={`money-map-thread-${id}`}
                  data-progress={progress.toFixed(2)}
                  data-kind={m.kind}
                  aria-label={t(moveKindNames[m.kind], lang)}
                  opacity={newest ? undefined : OLDER_OPACITY}
                >
                  <Thread from={g.ends.from} to={g.ends.to} startAt={m.at} tone={tone} now={clock} />
                  {newest && <AmountLabel at={curveMid(g.ends.from, g.ends.to)} cents={g.totalCents} tone={tone} progress={progress} unit={unit} />}
                  {note && (
                    <text
                      data-nessie={m.nessieId}
                      className="c-thread__label"
                      x={note.x}
                      y={note.y}
                      textAnchor={note.anchor}
                      dominantBaseline="central"
                      fill="var(--c-color-ink)"
                      stroke="var(--c-color-paper)"
                      strokeWidth={4 * unit}
                      paintOrder="stroke"
                      style={{ fontWeight: 500, fontSize: `${LABEL_FONT_PX * unit}px` }}
                    >
                      {noteText}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

export default MoveThreads;
