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

export interface EloChartPoint {
  playedAt: string;
  elo: number;
}

export function EloChart({ data }: { data: EloChartPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        Sem partidas suficientes ainda.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
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
          formatter={(value) => [String(value), "ELO"]}
        />
        <Area
          type="monotone"
          dataKey="elo"
          stroke="var(--series-1)"
          strokeWidth={2}
          fill="url(#eloFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
