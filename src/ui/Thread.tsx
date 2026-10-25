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
  /** Player time (ms) when the money started moving. The thread draws in 700 ms (--c-motion-stitch) from here. */
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

/** The short-paid pattern, the same as --c-thread-dash-attention. */
const SHORT_DASH = "8 6";

/**
 * One movement of money (design drop 3, kit change 9): a solid 4 px thread (--c-stroke-thread-map)
 * that draws itself along its path from `from` to `to` on the player clock, ease-out over 700 ms
 * (past half by 300 ms, so the amount shows by then). A short-paid thread (tone "out") is madder and dashed. The amount sits on a paper label at
 * the midpoint, in mono. Render it inside an <svg>. Under reduced motion it appears finished.
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
  const label = amountCents !== undefined ? formatCents(amountCents) : "";
  // Mono figures: about 0.6 em each at 14 px, plus 8 px each side.
  const labelW = Math.max(56, Math.round(label.length * 8.4) + 16);

  return (
    <g data-testid={testId} data-progress={p.toFixed(2)}>
      <path
        d={d}
        fill="none"
        stroke={color}
        style={{ strokeWidth: "var(--c-stroke-thread-map)" }}
        strokeLinecap="butt"
        strokeDasharray={tone === "out" ? SHORT_DASH : undefined}
      />
      {p < 1 && <circle cx={head.x} cy={head.y} r={4} fill={color} />}
      {amountCents !== undefined && p >= 0.5 && (
        <g transform={`translate(${mid.x} ${mid.y})`} opacity={Math.min(1, (p - 0.5) * 4)}>
          <rect x={-labelW / 2} y={-13} width={labelW} height={26} rx={2} fill="var(--c-color-paper)" stroke="var(--c-color-line)" />
          <text className="c-thread__label" textAnchor="middle" dominantBaseline="central" fill={color}>
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
