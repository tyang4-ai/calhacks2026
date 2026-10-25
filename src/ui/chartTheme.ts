// Recharts settings (design drop 3): series from --c-chart-1 to --c-chart-5 in order, never cycled
// past five, grid lines from --c-chart-grid, axis text from --c-chart-axis, values from --c-chart-value.
// Spread these into Recharts components, e.g. <XAxis {...chartTheme.axis} />.

export const chartTheme = {
  colors: {
    ink: "var(--c-color-ink)",
    inkSoft: "var(--c-color-ink-soft)",
    line: "var(--c-color-line)",
    paper: "var(--c-color-paper)",
    series: ["var(--c-chart-1)", "var(--c-chart-2)", "var(--c-chart-3)", "var(--c-chart-4)", "var(--c-chart-5)"],
    grid: "var(--c-chart-grid)",
    axis: "var(--c-chart-axis)",
    value: "var(--c-chart-value)",
  },
  axis: {
    stroke: "var(--c-chart-axis)",
    tick: { fill: "var(--c-chart-axis)", fontSize: 14, fontFamily: "var(--c-font-body)" },
    tickLine: false,
    axisLine: { stroke: "var(--c-chart-axis)" },
  },
  /** Values and direct labels on bars and lines. */
  label: { fill: "var(--c-chart-value)", fontSize: 14, fontFamily: "var(--c-font-body)" },
  grid: {
    stroke: "var(--c-chart-grid)",
    strokeDasharray: "2 4",
    vertical: false,
  },
  tooltip: {
    contentStyle: {
      background: "var(--c-color-paper)",
      border: "1px solid var(--c-color-line)",
      borderRadius: 2,
      fontFamily: "var(--c-font-body)",
      fontVariantNumeric: "tabular-nums",
      fontSize: 14,
      color: "var(--c-chart-value)",
    },
    cursor: { fill: "var(--c-color-mat)" },
  },
  bar: { radius: [2, 2, 0, 0] as [number, number, number, number] },
  line: { strokeWidth: 2, dot: false },
  /** Under reduced motion or in tests, charts appear finished. */
  animation: { isAnimationActive: false },
} as const;

/**
 * Series i's color, in order. The palette is five long and never cycles: past five series a chart
 * folds the rest into Other, so any later index gets the last color.
 */
export function seriesColor(i: number): string {
  const series = chartTheme.colors.series;
  return series[Math.min(Math.max(0, i), series.length - 1)];
}
