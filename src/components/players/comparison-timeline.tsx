"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { PlayerComparisonDTO } from "@/server/dtos/playerComparison.dto";

export function ComparisonTimeline({
  timeline,
  playerIdA,
  playerIdB,
  nicknameA,
  nicknameB,
}: {
  timeline: PlayerComparisonDTO["timeline"];
  playerIdA: string;
  playerIdB: string;
  nicknameA: string;
  nicknameB: string;
}) {
  const [activeMetric, setActiveMetric] = useState<"rating" | "elo">("rating");

  if (timeline.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground bg-white/[0.01] border border-white/5 rounded-2xl">
        Sem dados de evolução temporal suficientes.
      </div>
    );
  }

  // Aplanar dados para o Recharts
  const chartData = timeline.map((point) => ({
    playedAt: typeof point.playedAt === "string" ? point.playedAt : new Date(point.playedAt).toISOString(),
    [`metric_${playerIdA}`]: point.metrics[playerIdA]?.[activeMetric],
    [`metric_${playerIdB}`]: point.metrics[playerIdB]?.[activeMetric],
  }));

  const keyA = `metric_${playerIdA}`;
  const keyB = `metric_${playerIdB}`;

  const fillIdA = `fillCompareA`;
  const fillIdB = `fillCompareB`;

  return (
    <div className="glass-panel p-5 border border-white/10 bg-white/[0.01] rounded-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Evolução Temporal
        </h3>
        
        {/* Toggle Selector */}
        <div className="inline-flex rounded-lg bg-white/5 p-0.5">
          <button
            onClick={() => setActiveMetric("rating")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeMetric === "rating" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-white"
            }`}
          >
            Rating 2.0
          </button>
          <button
            onClick={() => setActiveMetric("elo")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeMetric === "elo" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-white"
            }`}
          >
            Histórico ELO
          </button>
        </div>
      </div>

      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={fillIdA} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={fillIdB} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-2)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--series-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="playedAt"
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
              }
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={10}
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
                fontSize: 11,
              }}
              labelFormatter={(value) => new Date(String(value)).toLocaleDateString("pt-BR")}
              formatter={(value, name) => {
                const finalName = name === keyA ? nicknameA : nicknameB;
                const formattedVal = activeMetric === "rating" ? Number(value).toFixed(2) : Math.round(Number(value));
                return [formattedVal, finalName];
              }}
            />
            <Area
              name={keyA}
              type="monotone"
              dataKey={keyA}
              stroke="var(--series-1)"
              strokeWidth={2}
              fill={`url(#${fillIdA})`}
              connectNulls
            />
            <Area
              name={keyB}
              type="monotone"
              dataKey={keyB}
              stroke="var(--series-2)"
              strokeWidth={2}
              fill={`url(#${fillIdB})`}
              connectNulls
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => {
                return value === keyA ? nicknameA : nicknameB;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
