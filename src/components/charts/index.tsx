"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/shell/theme-provider";

export const SERIES_COLORS_LIGHT = [
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "rgb(26 26 31 / 0.45)",
];

export const SERIES_COLORS_DARK = [
  "#60a5fa",
  "#fbbf24",
  "#c4b5fd",
  "#f472b6",
  "#f87171",
  "rgb(250 250 252 / 0.45)",
];

function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return {
    dark,
    axis: { stroke: dark ? "rgb(250 250 252 / 0.4)" : "rgb(26 26 31 / 0.45)", fontSize: 11 },
    grid: dark ? "rgb(255 255 255 / 0.06)" : "rgb(26 26 31 / 0.08)",
    tooltip: {
      contentStyle: {
        background: dark ? "#141418" : "#ffffff",
        border: dark ? "1px solid rgb(255 255 255 / 0.1)" : "1px solid rgb(26 26 31 / 0.1)",
        borderRadius: 12,
        padding: "10px 14px",
        fontSize: 13,
        color: dark ? "rgb(250 250 252 / 0.94)" : "#1a1a1f",
        boxShadow: dark ? "0 8px 24px rgb(0 0 0 / 0.45)" : "0 4px 16px rgb(15 15 20 / 0.08)",
      },
      labelStyle: {
        color: dark ? "rgb(250 250 252 / 0.55)" : "rgb(26 26 31 / 0.62)",
        marginBottom: 6,
      },
      itemStyle: { color: dark ? "rgb(250 250 252 / 0.94)" : "#1a1a1f" },
    },
    legend: dark ? "rgb(250 250 252 / 0.55)" : "rgb(26 26 31 / 0.62)",
    reference: dark ? "rgb(255 255 255 / 0.25)" : "rgb(26 26 31 / 0.35)",
    perfect: dark ? "rgb(255 255 255 / 0.2)" : "rgb(26 26 31 / 0.25)",
    barMuted: dark ? "rgb(255 255 255 / 0.12)" : "rgb(26 26 31 / 0.12)",
    cursor: dark ? "rgb(255 255 255 / 0.04)" : "rgb(26 26 31 / 0.04)",
    accentFill: dark ? "#60a5fa" : "#2563eb",
    colors: dark ? SERIES_COLORS_DARK : SERIES_COLORS_LIGHT,
  };
}

interface Series {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

export function TrendChart({
  data,
  series,
  height = 300,
  yLabel,
  band,
  reference,
}: {
  data: Record<string, number | string>[];
  series: Series[];
  height?: number;
  yLabel?: string;
  band?: { from: number; to: number };
  reference?: { value: number; label: string };
}) {
  const t = useChartTheme();

  return (
    <div style={{ height }} className="w-full max-sm:!h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={t.grid} strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="label" tick={t.axis} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis
            tick={t.axis}
            tickLine={false}
            axisLine={false}
            width={56}
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: "insideLeft", fill: t.axis.stroke, fontSize: 11 }
                : undefined
            }
          />
          {band ? (
            <ReferenceArea y1={band.from} y2={band.to} fill={t.accentFill} fillOpacity={0.12} />
          ) : null}
          {reference ? (
            <ReferenceLine
              y={reference.value}
              stroke={t.reference}
              strokeDasharray="6 6"
              label={{ value: reference.label, fill: t.axis.stroke, fontSize: 11, position: "right" }}
            />
          ) : null}
          <Tooltip {...t.tooltip} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(v) => <span style={{ color: t.legend }}>{v}</span>}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? t.colors[i % t.colors.length]}
              strokeWidth={s.dashed ? 1.5 : 2.5}
              strokeDasharray={s.dashed ? "5 5" : undefined}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CalibrationChart({
  data,
  height = 300,
}: {
  data: { predicted: number; observed: number; count: number }[];
  height?: number;
}) {
  const t = useChartTheme();
  const points = data.map((d) => ({
    label: `${Math.round(d.predicted * 100)}%`,
    predit: d.predicted * 100,
    observe: d.observed * 100,
    parfait: d.predicted * 100,
    n: d.count,
  }));

  return (
    <div style={{ height }} className="w-full max-sm:!h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={t.grid} strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="label" tick={t.axis} tickLine={false} axisLine={false} />
          <YAxis tick={t.axis} tickLine={false} axisLine={false} width={48} unit="%" />
          <Tooltip {...t.tooltip} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(v) => <span style={{ color: t.legend }}>{v}</span>}
          />
          <Line
            type="monotone"
            dataKey="parfait"
            name="Calibration parfaite"
            stroke={t.perfect}
            strokeDasharray="5 5"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="observe"
            name="Fréquence observée"
            stroke={t.colors[0]}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionChart({
  data,
  height = 280,
}: {
  data: { sum: number; observed: number; expected: number }[];
  height?: number;
}) {
  const t = useChartTheme();
  const points = data.map((d) => ({ label: String(d.sum), observé: d.observed, attendu: d.expected }));

  return (
    <div style={{ height }} className="w-full max-sm:!h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={t.grid} strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="label" tick={t.axis} tickLine={false} axisLine={false} />
          <YAxis tick={t.axis} tickLine={false} axisLine={false} width={48} />
          <Tooltip {...t.tooltip} cursor={{ fill: t.cursor }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(v) => <span style={{ color: t.legend }}>{v}</span>}
          />
          <Bar dataKey="attendu" fill={t.barMuted} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="observé" fill={t.colors[1]} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** @deprecated Utiliser SERIES_COLORS_LIGHT ou useChartTheme */
export const SERIES_COLORS = SERIES_COLORS_LIGHT;
