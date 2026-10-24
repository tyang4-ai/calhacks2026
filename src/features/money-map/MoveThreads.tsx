// One kit Thread per money move, drawn inside the map's <svg viewBox="0 0 1000 600">.
// Moves between the same two parties (same direction) share one path: the newest is drawn full
// with the pair's running total as its label, and the older ones stay on the path, faded and unlabeled.
// Everything follows the player clock, so a seek() always renders the same frame.
import { useCindia, type MoneyMove } from "../../core";
import { Thread, usePlayerTime } from "../../ui";
import { anchor, partyPoint } from "./partyLayout";
import { strings, t, type Lang } from "./strings";
import { groupMoves, moveTone } from "./threadGroups";

/** Opacity of older moves on a shared path. */
const OLDER_OPACITY = 0.35;

export function MoveThreads({ lang }: { lang: Lang }) {
  const now = usePlayerTime();
  const moveIds = useCindia((s) => s.money.moveIds);
  const movesById = useCindia((s) => s.money.moves);

  // Only moves that have fired by the player clock count toward a path and its total.
  const moves = moveIds.map((id) => movesById[id]).filter((m): m is MoneyMove => Boolean(m) && m.at <= now);
  const groups = groupMoves(moves);

  return (
    <g aria-label={t(strings.moneyFlow, lang)}>
      {groups.map((g) => {
        const from = anchor(g.from, partyPoint(g.to));
        const to = anchor(g.to, partyPoint(g.from));
        const newestId = g.moveIds[g.moveIds.length - 1];
        return (
          <g key={g.key} data-pair={g.key}>
            {g.moveIds.map((id) => {
              const m = movesById[id];
              if (!m) return null;
              const newest = id === newestId;
              const thread = (
                <Thread
                  testId={`money-map-thread-${id}`}
                  from={from}
                  to={to}
                  startAt={m.at}
                  amountCents={newest ? g.totalCents : undefined}
                  tone={moveTone(m.kind, m.to)}
                />
              );
              return newest ? (
                <g key={id}>{thread}</g>
              ) : (
                <g key={id} opacity={OLDER_OPACITY}>
                  {thread}
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
