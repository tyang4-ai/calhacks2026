// F-ask-cindy T1: the chart for one of Cindy's answers, drawn from its ChartSpec with Recharts.
// Values are integer cents; axis ticks and the tooltip format them through the UI kit.
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartSpec } from "../../core/events";
import { chartTheme, formatCents, seriesColor } from "../../ui";
import { STRINGS, t, type Lang } from "./strings";

export interface AnswerChartProps {
  chart: ChartSpec;
  lang: Lang;
}

/** Fixed size: the drawer is 400 px wide, and a ResponsiveContainer can measure zero in tests. */
const WIDTH = 340;
const HEIGHT = 220;

/** Whole dollars on the axis keeps the ticks short: 125000 to "$1,250". */
const axisDollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");

export function AnswerChart({ chart, lang }: AnswerChartProps) {
  const rows = chart.labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    chart.series.forEach((s, j) => {
      row[`s${j}`] = s.valuesCents[i] ?? 0;
    });
    return row;
  });
  const longLabels = chart.labels.some((l) => l.length > 4) || chart.labels.length > 4;
  const tick = { ...chartTheme.axis.tick, fontSize: 11 };
  const xAxis = (
    <XAxis
      dataKey="label"
      {...chartTheme.axis}
      tick={tick}
      interval={0}
      angle={longLabels ? -30 : 0}
      textAnchor={longLabels ? "end" : "middle"}
      height={longLabels ? 56 : 24}
    />
  );
  const yAxis = <YAxis {...chartTheme.axis} tick={tick} width={56} tickFormatter={(v: number) => axisDollars(v)} />;
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
    <figure data-testid="ask-cindy-chart" aria-label={t(STRINGS.chartLabel, lang)} style={{ margin: "12px 0 0" }}>
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
        <LineChart width={WIDTH} height={HEIGHT} data={rows} margin={margin}>
          <CartesianGrid {...chartTheme.grid} />
          {xAxis}
          {yAxis}
          {tooltip}
          {showLegend && <Legend />}
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
        <BarChart width={WIDTH} height={HEIGHT} data={rows} margin={margin}>
          <CartesianGrid {...chartTheme.grid} />
          {xAxis}
          {yAxis}
          {tooltip}
          {showLegend && <Legend />}
          {chart.series.map((s, j) => (
            <Bar key={j} dataKey={`s${j}`} name={s.name[lang]} fill={seriesColor(j)} radius={chartTheme.bar.radius} {...chartTheme.animation} />
          ))}
        </BarChart>
      )}
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--c-color-ink-soft)" }}>{t(STRINGS.chartNote, lang)}</p>
    </figure>
  );
}
