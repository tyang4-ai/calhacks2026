import { formatCents } from "./formatCents";
import { stitchProgress, usePlayerTime, useReducedMotion } from "./motion";

export interface Point {
  x: number;
  y: number;
}

export interface ThreadProps {
  testId?: string;
  from: Point;
  to: Point;
  /** Player time (ms) when the money started moving. The stitch takes 900 ms from here. */
  startAt: number;
  amountCents?: number;
  tone?: "in" | "out" | "neutral" | "pending";
  /** How far the curve bows to one side, as a fraction of its length. 0 draws a straight line. */
  bow?: number;
  /** Override the player clock, for stills and tests. */
  now?: number;
}

const TONE: Record<NonNullable<ThreadProps["tone"]>, string> = {
  in: "var(--c-color-jade)",
  out: "var(--c-color-seal)",
  neutral: "var(--c-color-ink)",
  pending: "var(--c-color-amber)",
};

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * One movement of money, drawn as a running stitch that sews itself from `from` to `to` on the
 * player clock. Render it inside an <svg>. Under reduced motion it appears finished.
 */
export function Thread({ testId, from, to, startAt, amountCents, tone = "neutral", bow = 0.18, now }: ThreadProps) {
  const playerNow = usePlayerTime();
  const reduced = useReducedMotion();
  const t = now ?? playerNow;
  const p = stitchProgress(t, startAt, reduced);
  if (t < startAt && !reduced) return null;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ctrl = { x: (from.x + to.x) / 2 - (dy / len) * len * bow, y: (from.y + to.y) / 2 + (dx / len) * len * bow };
  // De Casteljau: the part of the quadratic curve from 0 to p.
  const c1 = lerp(from, ctrl, p);
  const head = lerp(c1, lerp(ctrl, to, p), p);
  const d = `M ${from.x} ${from.y} Q ${c1.x} ${c1.y} ${head.x} ${head.y}`;
  const mid = lerp(lerp(from, ctrl, 0.5), lerp(ctrl, to, 0.5), 0.5);
  const color = TONE[tone];
  // The dash offset runs while sewing, so it reads as a stitch being pulled through.
  const offset = p < 1 ? -(t - startAt) / 40 : 0;

  return (
    <g data-testid={testId} data-progress={p.toFixed(2)}>
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="10 7" strokeDashoffset={offset} />
      {p < 1 && <circle cx={head.x} cy={head.y} r={3.5} fill={color} />}
      {amountCents !== undefined && p >= 0.5 && (
        <g transform={`translate(${mid.x} ${mid.y})`} opacity={Math.min(1, (p - 0.5) * 4)}>
          <rect x={-44} y={-13} width={88} height={26} rx={2} fill="var(--c-color-paper)" stroke="var(--c-color-line)" />
          <text className="c-thread__label" textAnchor="middle" dominantBaseline="central" fill={color}>
            {formatCents(amountCents)}
          </text>
        </g>
      )}
    </g>
  );
}
