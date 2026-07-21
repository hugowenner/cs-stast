"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TimelineChartPoint {
  playedAt: string;
  value: number;
}

export function TimelineChart({
  data,
  metricName = "Valor",
  color = "var(--series-1)",
  idPrefix = "timeline",
}: {
  data: TimelineChartPoint[];
  metricName?: string;
  color?: string;
  idPrefix?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        Sem partidas suficientes ainda.
      </p>
    );
  }

  const fillId = `${idPrefix}Fill`;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="playedAt"
          tickFormatter={(value: string) =>
            new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
          }
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelFormatter={(value) => new Date(String(value)).toLocaleDateString("pt-BR")}
          formatter={(value) => [String(value), metricName]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${fillId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
