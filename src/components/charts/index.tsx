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

const AXIS = { stroke: "rgb(55 53 47 / 0.45)", fontSize: 11 };
const GRID = "rgb(55 53 47 / 0.08)";

const TOOLTIP = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid rgb(55 53 47 / 0.09)",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: 13,
    color: "#37352f",
    boxShadow: "0 4px 12px rgb(15 15 15 / 0.08)",
  },
  labelStyle: { color: "rgb(55 53 47 / 0.65)", marginBottom: 6 },
  itemStyle: { color: "#37352f" },
} as const;

export const SERIES_COLORS = [
  "#2383e2",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "rgb(55 53 47 / 0.45)",
];

interface Series {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

/** Courbe de tendance générique : plusieurs séries sur un axe temporel. */
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
  /** Bande de tolérance horizontale, par exemple ±2 écarts-types */
  band?: { from: number; to: number };
  reference?: { value: number; label: string };
}) {
  return (
    <div style={{ height }} className="w-full max-sm:!h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={56}
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: "insideLeft", fill: AXIS.stroke, fontSize: 11 }
                : undefined
            }
          />
          {band && (
            <ReferenceArea
              y1={band.from}
              y2={band.to}
              fill="#2383e2"
              fillOpacity={0.1}
            />
          )}
          {reference && (
            <ReferenceLine
              y={reference.value}
              stroke="rgb(55 53 47 / 0.35)"
              strokeDasharray="6 6"
              label={{ value: reference.label, fill: AXIS.stroke, fontSize: 11, position: "right" }}
            />
          )}
          <Tooltip {...TOOLTIP} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(v) => <span style={{ color: "rgb(55 53 47 / 0.65)" }}>{v}</span>}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]}
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

/** Diagramme de fiabilité : probabilité annoncée contre fréquence observée. */
export function CalibrationChart({
  data,
  height = 300,
}: {
  data: { predicted: number; observed: number; count: number }[];
  height?: number;
}) {
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
          <CartesianGrid stroke={GRID} strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} unit="%" />
          <Tooltip {...TOOLTIP} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(v) => <span style={{ color: "rgb(55 53 47 / 0.65)" }}>{v}</span>}
          />
          <Line
            type="monotone"
            dataKey="parfait"
            name="Calibration parfaite"
            stroke="rgb(55 53 47 / 0.25)"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="observe"
            name="Fréquence observée"
            stroke={SERIES_COLORS[0]}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Histogramme comparant une distribution observée à sa loi exacte. */
export function DistributionChart({
  data,
  height = 280,
}: {
  data: { sum: number; observed: number; expected: number }[];
  height?: number;
}) {
  const points = data.map((d) => ({ label: String(d.sum), observé: d.observed, attendu: d.expected }));

  return (
    <div style={{ height }} className="w-full max-sm:!h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} />
          <Tooltip {...TOOLTIP} cursor={{ fill: "rgb(55 53 47 / 0.04)" }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(v) => <span style={{ color: "rgb(55 53 47 / 0.65)" }}>{v}</span>}
          />
          <Bar dataKey="attendu" fill="rgb(55 53 47 / 0.15)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="observé" fill={SERIES_COLORS[1]} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
