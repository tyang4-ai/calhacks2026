// Recharts settings: ink axes, line grid, jade and seal series, Inter tabular numbers.
// Spread these into Recharts components, e.g. <XAxis {...chartTheme.axis} />.

export const chartTheme = {
  colors: {
    ink: "var(--c-color-ink)",
    inkSoft: "var(--c-color-ink-soft)",
    line: "var(--c-color-line)",
    paper: "var(--c-color-paper)",
    series: ["var(--c-color-jade)", "var(--c-color-seal)", "var(--c-color-amber)", "var(--c-color-ink-soft)"],
  },
  axis: {
    stroke: "var(--c-color-ink)",
    tick: { fill: "var(--c-color-ink-soft)", fontSize: 14, fontFamily: "var(--c-font-body)" },
    tickLine: false,
    axisLine: { stroke: "var(--c-color-ink)" },
  },
  grid: {
    stroke: "var(--c-color-line)",
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
    },
    cursor: { fill: "var(--c-color-mat)" },
  },
  bar: { radius: [2, 2, 0, 0] as [number, number, number, number] },
  line: { strokeWidth: 2, dot: false },
  /** Under reduced motion or in tests, charts appear finished. */
  animation: { isAnimationActive: false },
} as const;

export function seriesColor(i: number): string {
  return chartTheme.colors.series[i % chartTheme.colors.series.length];
}
