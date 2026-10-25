// F-ask-cindy T1: the chart for one of Cindy's answers, drawn from its ChartSpec with Recharts.
// Values are integer cents; axis ticks and the tooltip format them through the UI kit.
import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartSpec } from "../../core/events";
import { chartTheme, formatCents, seriesColor } from "../../ui";
import { STRINGS, t, type Lang } from "./strings";

export interface AnswerChartProps {
  chart: ChartSpec;
  lang: Lang;
}

/**
 * The chart takes its figure's own width, measured here, so it fits whatever width the shell gives
 * the kit Drawer (440 px on the desktop Sell site) with no sideways scroll. A ResponsiveContainer can
 * measure zero in tests, so until the first measurement it draws at FALLBACK_WIDTH.
 */
const FALLBACK_WIDTH = 320;
const HEIGHT = 220;
/** The kit's smallest text, for the axis ticks too. */
const TICK_PX = 14;
/** Room for "$1,250" at 14 px. */
const Y_AXIS_PX = 60;

/** The key under a numbered chart: number, the label in full, its amount. */
const keyStyle: CSSProperties = {
  listStyle: "none",
  margin: "8px 0 0",
  padding: 0,
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  columnGap: 8,
  rowGap: 2,
  fontSize: "var(--c-text-14)",
};

const keyRowStyle: CSSProperties = { display: "contents" };

/** About how wide a label draws at 14 px: Latin narrow, Chinese square, plus a little air. */
function labelPx(label: string): number {
  let w = 0;
  for (const ch of label) w += /[⺀-鿿＀-￯]/.test(ch) ? 14 : 8;
  return w + 8;
}

/** The element's content width, kept current as it resizes. */
function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.clientWidth);
      if (w > 0) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Whole dollars on the axis keeps the ticks short: 125000 to "$1,250". */
const axisDollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");

export function AnswerChart({ chart, lang }: AnswerChartProps) {
  const [figureRef, width] = useWidth<HTMLElement>();
  const rows = chart.labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    chart.series.forEach((s, j) => {
      row[`s${j}`] = s.valuesCents[i] ?? 0;
    });
    return row;
  });
  // Every label reads in full at the kit's 14 px. When they all fit level under their bars, they
  // sit there; otherwise (one bar per piece, long titles, in the drawer's width) each bar is numbered
  // and the key under the chart names it in full with its amount, so nothing is cut or rotated.
  const slotPx = Math.max(1, (width - Y_AXIS_PX - 16) / Math.max(1, chart.labels.length));
  const numbered = chart.labels.some((l) => labelPx(l) > slotPx);
  const tick = { ...chartTheme.axis.tick, fontSize: TICK_PX };
  const xAxis = (
    <XAxis
      dataKey="label"
      {...chartTheme.axis}
      tick={tick}
      interval={0}
      height={28}
      tickFormatter={numbered ? (_label: string, i: number) => String(i + 1) : undefined}
    />
  );
  const yAxis = <YAxis {...chartTheme.axis} tick={tick} width={Y_AXIS_PX} tickFormatter={(v: number) => axisDollars(v)} />;
  const tooltip = (
    <Tooltip
      {...chartTheme.tooltip}
      formatter={(value) => formatCents(Number(value))}
      isAnimationActive={chartTheme.animation.isAnimationActive}
    />
  );
  const showLegend = chart.series.length > 1;
  const margin = { top: 8, right: 8, bottom: 0, left: 0 };

  return (
    // AnswerCard renders the chart only for the latest answer, so exactly one chart test ID is on screen.
    <figure
      ref={figureRef}
      data-testid="ask-cindy-chart"
      aria-label={t(STRINGS.chartLabel, lang)}
      style={{ margin: "12px 0 0", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}
    >
      <figcaption
        style={{
          fontFamily: lang === "zh" ? "var(--c-font-heading-zh)" : "var(--c-font-heading-en)",
          fontSize: 14,
          color: "var(--c-color-ink)",
          marginBottom: 6,
        }}
      >
        {chart.title[lang]}
      </figcaption>
      {chart.type === "line" ? (
        <LineChart width={width} height={HEIGHT} data={rows} margin={margin}>
          <CartesianGrid {...chartTheme.grid} />
          {xAxis}
          {yAxis}
          {tooltip}
          {showLegend && <Legend wrapperStyle={{ fontSize: TICK_PX }} />}
          {chart.series.map((s, j) => (
            <Line
              key={j}
              type="monotone"
              dataKey={`s${j}`}
              name={s.name[lang]}
              stroke={seriesColor(j)}
              {...chartTheme.line}
              {...chartTheme.animation}
            />
          ))}
        </LineChart>
      ) : (
        <BarChart width={width} height={HEIGHT} data={rows} margin={margin}>
          <CartesianGrid {...chartTheme.grid} />
          {xAxis}
          {yAxis}
          {tooltip}
          {showLegend && <Legend wrapperStyle={{ fontSize: TICK_PX }} />}
          {chart.series.map((s, j) => (
            <Bar key={j} dataKey={`s${j}`} name={s.name[lang]} fill={seriesColor(j)} radius={chartTheme.bar.radius} {...chartTheme.animation} />
          ))}
        </BarChart>
      )}
      {numbered && (
        <ol aria-label={chart.title[lang]} style={keyStyle}>
          {chart.labels.map((label, i) => (
            <li key={`${label}-${i}`} style={keyRowStyle}>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--c-color-ink-soft)" }}>{i + 1}</span>
              <span style={{ minWidth: 0 }}>{label}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {chart.series.map((s) => formatCents(s.valuesCents[i] ?? 0)).join(" · ")}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p style={{ margin: "4px 0 0", fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>{t(STRINGS.chartNote, lang)}</p>
    </figure>
  );
}
