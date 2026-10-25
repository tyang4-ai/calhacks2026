// F-dashboard T2: revenue by channel, one bar per channel (Recharts with the kit's chartTheme), with
// each channel's amount listed under the chart. Amounts are integer cents, formatted by the kit.
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Bar, BarChart, CartesianGrid, Text, Tooltip, XAxis, YAxis } from "recharts";
import { Money, chartTheme, formatCents, seriesColor } from "../../ui";
import type { ChannelRevenue } from "./figures";
import { revenueTotal } from "./figures";
import { StatTile } from "./StatTile";
import { UI, t, type Lang } from "./strings";

/**
 * The chart takes its figure's own width, measured here, so it fills the tile on the desktop view;
 * a ResponsiveContainer can measure zero in tests, so until the first measurement it draws at
 * FALLBACK_WIDTH.
 */
const FALLBACK_WIDTH = 520;
const HEIGHT = 236;
const Y_AXIS_PX = 72;
/** Two lines of 14 px labels under the bars. */
const X_AXIS_PX = 44;

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

/** A channel's name under its bar, at 14 px, wrapping onto a second line inside its bar's slot. */
function ChannelTick({ x, y, payload, slot }: { x?: number; y?: number; payload?: { value?: string }; slot: number }) {
  return (
    <Text x={x} y={(y ?? 0) + 4} width={slot} textAnchor="middle" verticalAnchor="start" {...chartTheme.axis.tick}>
      {payload?.value ?? ""}
    </Text>
  );
}

/** Whole dollars on the axis keeps the ticks short: 125000 to "$1,250". */
const axisDollars = (cents: number) => formatCents(cents).replace(/\.00$/, "");

export function RevenueTile({ rows, lang }: { rows: ChannelRevenue[]; lang: Lang }) {
  const data = rows.map((r) => ({ channelId: r.channelId, label: r.name[lang], cents: r.cents }));
  const [figureRef, width] = useWidth<HTMLElement>();
  const slot = Math.max(40, (width - Y_AXIS_PX - 16) / Math.max(1, data.length) - 8);
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
      <figure
        ref={figureRef}
        data-testid="dashboard-revenue-chart"
        aria-label={t(UI.revenueChartLabel, lang)}
        style={{ margin: "12px 0 0", minWidth: 0, maxWidth: "100%" }}
      >
        <BarChart width={width} height={HEIGHT} data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...chartTheme.grid} />
          <XAxis dataKey="label" {...chartTheme.axis} interval={0} height={X_AXIS_PX} tick={<ChannelTick slot={slot} />} />
          <YAxis {...chartTheme.axis} width={Y_AXIS_PX} tickFormatter={(v: number) => axisDollars(v)} />
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
