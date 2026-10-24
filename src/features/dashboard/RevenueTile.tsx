// F-dashboard T2: revenue by channel, one bar per channel (Recharts with the kit's chartTheme), with
// each channel's amount listed under the chart. Amounts are integer cents, formatted by the kit.
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Money, chartTheme, formatCents, seriesColor } from "../../ui";
import type { ChannelRevenue } from "./figures";
import { revenueTotal } from "./figures";
import { StatTile } from "./StatTile";
import { UI, t, type Lang } from "./strings";

/** Fixed size: the tile is about 600 px wide, and a ResponsiveContainer can measure zero in tests. */
const WIDTH = 520;
const HEIGHT = 220;

/** Whole dollars on the axis keeps the ticks short: 125000 to "$1,250". */
const axisDollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");

export function RevenueTile({ rows, lang }: { rows: ChannelRevenue[]; lang: Lang }) {
  const data = rows.map((r) => ({ channelId: r.channelId, label: r.name[lang], cents: r.cents }));
  return (
    <StatTile
      testId="dashboard-tile-revenue"
      title={t(UI.revenueTitle, lang)}
      lang={lang}
      value={
        <span data-role="value">
          <Money cents={revenueTotal(rows)} />
        </span>
      }
    >
      <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--c-color-ink-soft)" }}>
        {t(UI.total, lang)} · {t(UI.revenueNote, lang)}
      </p>
      <figure data-testid="dashboard-revenue-chart" aria-label={t(UI.revenueChartLabel, lang)} style={{ margin: "12px 0 0" }}>
        <BarChart width={WIDTH} height={HEIGHT} data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...chartTheme.grid} />
          <XAxis dataKey="label" {...chartTheme.axis} interval={0} height={28} />
          <YAxis {...chartTheme.axis} width={72} tickFormatter={(v: number) => axisDollars(v)} />
          <Tooltip
            {...chartTheme.tooltip}
            formatter={(value) => formatCents(Number(value))}
            isAnimationActive={chartTheme.animation.isAnimationActive}
          />
          <Bar dataKey="cents" name={t(UI.revenueTitle, lang)} fill={seriesColor(0)} radius={chartTheme.bar.radius} {...chartTheme.animation} />
        </BarChart>
        <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
          {rows.map((r) => (
            <li key={r.channelId} data-channel={r.channelId} data-cents={r.cents} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ color: "var(--c-color-ink-soft)" }}>{r.name[lang]}</span>
              <Money cents={r.cents} />
            </li>
          ))}
        </ul>
      </figure>
    </StatTile>
  );
}
