import type { Lang, Text } from "../core/types";
import { chartTheme } from "./chartTheme";
import { MAP_WORDS, pickText } from "./strings";
import { mapLayout, starPath } from "./views";

export interface MapPoint {
  id: string;
  x: number;
  y: number;
  /** Such as the piece's community. Each group gets a color and a shape. */
  group?: string;
  /** Named on hover. */
  label?: Text;
}

export interface EmbeddingMapProps {
  testId?: string;
  points: MapPoint[];
  /** The query, drawn as a star. An approximate one is hollow and labeled "approximate". */
  query?: { x: number; y: number; approx?: boolean };
  /** Drawn larger with an ink ring, such as the top results. */
  highlightIds?: string[];
  /** Lines from the star to these points. */
  linkIds?: string[];
  width: number;
  height: number;
  lang: Lang;
  /** The groups in order, with their names, for the colors, shapes and the key under the map. */
  groups?: { id: string; label: Text }[];
  /** Each point gets `<pointTestIdPrefix><id>`. */
  pointTestIdPrefix?: string;
}

type Shape = "circle" | "square" | "triangle" | "diamond";
const SHAPES: Shape[] = ["circle", "square", "triangle", "diamond"];
const COLORS = chartTheme.colors.series;

function Mark({ shape, cx, cy, r, className }: { shape: Shape; cx: number; cy: number; r: number; className: string }) {
  if (shape === "square") return <rect className={className} x={cx - r * 0.85} y={cy - r * 0.85} width={r * 1.7} height={r * 1.7} />;
  if (shape === "triangle") return <path className={className} d={`M${cx},${cy - r * 1.1} L${cx + r},${cy + r * 0.75} L${cx - r},${cy + r * 0.75} Z`} />;
  if (shape === "diamond") return <path className={className} d={`M${cx},${cy - r * 1.15} L${cx + r * 1.15},${cy} L${cx},${cy + r * 1.15} L${cx - r * 1.15},${cy} Z`} />;
  return <circle className={className} cx={cx} cy={cy} r={r} />;
}

/**
 * An SVG scatter of the pieces, scaled to fit `width` by `height`, with the query as a star and a
 * line from it to each linked point. Groups differ by shape as well as color, and the key under the
 * map names them.
 */
export function EmbeddingMap({ testId, points, query, highlightIds = [], linkIds = [], width, height, lang, groups, pointTestIdPrefix }: EmbeddingMapProps) {
  const layout = mapLayout(points, query, linkIds, width, height);
  const order = groups?.map((g) => g.id) ?? [...new Set(points.map((p) => p.group).filter((g): g is string => g !== undefined))];
  const styleOf = (group?: string) => {
    const i = group === undefined ? -1 : order.indexOf(group);
    return i < 0 ? { shape: "circle" as Shape, color: "var(--c-color-ink-soft)" } : { shape: SHAPES[i % SHAPES.length], color: COLORS[i % COLORS.length] };
  };
  const highlighted = new Set(highlightIds);
  const approx = query?.approx === true;
  const queryWords = `${pickText(MAP_WORDS.query, lang)}${approx ? ` · ${pickText(MAP_WORDS.approximate, lang)}` : ""}`;
  const q = layout.query;
  const labelLeft = q ? q.cx > width * 0.6 : false;

  return (
    <figure className="c-embmap" data-testid={testId} lang={lang} style={{ width }}>
      <svg className="c-embmap__svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={queryWords}>
        <g className="c-embmap__links">
          {layout.links.map((l) => (
            <line key={l.id} className="c-embmap__link" data-link-to={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
        </g>
        <g className="c-embmap__points">
          {layout.points.map((p, i) => {
            const src = points[i];
            const { shape, color } = styleOf(src.group);
            const on = highlighted.has(p.id);
            return (
              <g
                key={p.id}
                data-testid={pointTestIdPrefix ? `${pointTestIdPrefix}${p.id}` : undefined}
                data-point-id={p.id}
                data-group={src.group}
                data-highlight={on || undefined}
                style={{ color }}
              >
                {src.label && <title>{pickText(src.label, lang)}</title>}
                <Mark shape={shape} cx={p.cx} cy={p.cy} r={on ? 7 : 4.5} className={`c-embmap__point${on ? " c-embmap__point--on" : ""}`} />
              </g>
            );
          })}
        </g>
        {q && (
          <g className={`c-embmap__query${approx ? " c-embmap__query--approx" : ""}`} data-role="query" data-approx={approx || undefined}>
            <path className="c-embmap__star" d={starPath(q.cx, q.cy)} fill={approx ? "none" : undefined} />
            <text className="c-embmap__qlabel" x={labelLeft ? q.cx - 18 : q.cx + 18} y={q.cy + 5} textAnchor={labelLeft ? "end" : "start"}>
              {queryWords}
            </text>
          </g>
        )}
      </svg>
      {groups && groups.length > 0 && (
        <figcaption className="c-embmap__key">
          {groups.map((g) => {
            const { shape, color } = styleOf(g.id);
            return (
              <span key={g.id} className="c-embmap__keyitem" data-group={g.id}>
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style={{ color }}>
                  <Mark shape={shape} cx={8} cy={8} r={5} className="c-embmap__point" />
                </svg>
                {pickText(g.label, lang)}
              </span>
            );
          })}
        </figcaption>
      )}
    </figure>
  );
}
