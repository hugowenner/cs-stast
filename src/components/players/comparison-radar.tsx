"use client";

import {
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { ComparisonPlayerDTO } from "@/server/dtos/playerComparison.dto";

// Função auxiliar para normalizar as métricas de 0 a 100 para o Radar
function normalize(metric: string, value: number): number {
  switch (metric) {
    case "rating": // 0.5 a 1.5
      return Math.min(Math.max(((value - 0.5) / 1.0) * 100, 0), 100);
    case "adr": // 50 a 110
      return Math.min(Math.max(((value - 50) / 60) * 100, 0), 100);
    case "kast": // 50 a 90
      return Math.min(Math.max(((value - 50) / 40) * 100, 0), 100);
    case "hsPercentage": // 15 a 65
      return Math.min(Math.max(((value - 15) / 50) * 100, 0), 100);
    case "kd": // 0.5 a 1.8
      return Math.min(Math.max(((value - 0.5) / 1.3) * 100, 0), 100);
    case "impact": // 0.5 a 1.8
      return Math.min(Math.max(((value - 0.5) / 1.3) * 100, 0), 100);
    default:
      return value;
  }
}

export function ComparisonRadar({ players }: { players: ComparisonPlayerDTO[] }) {
  if (players.length < 2) return null;

  const [pA, pB] = players;

  const radarData = [
    {
      subject: "Rating",
      [pA.nickname]: normalize("rating", pA.metrics.rating),
      [pB.nickname]: normalize("rating", pB.metrics.rating),
      rawA: pA.metrics.rating.toFixed(2),
      rawB: pB.metrics.rating.toFixed(2),
    },
    {
      subject: "ADR",
      [pA.nickname]: normalize("adr", pA.metrics.adr),
      [pB.nickname]: normalize("adr", pB.metrics.adr),
      rawA: pA.metrics.adr.toFixed(1),
      rawB: pB.metrics.adr.toFixed(1),
    },
    {
      subject: "KAST",
      [pA.nickname]: normalize("kast", pA.metrics.kast),
      [pB.nickname]: normalize("kast", pB.metrics.kast),
      rawA: `${pA.metrics.kast.toFixed(1)}%`,
      rawB: `${pB.metrics.kast.toFixed(1)}%`,
    },
    {
      subject: "HS %",
      [pA.nickname]: normalize("hsPercentage", pA.metrics.hsPercentage),
      [pB.nickname]: normalize("hsPercentage", pB.metrics.hsPercentage),
      rawA: `${pA.metrics.hsPercentage.toFixed(1)}%`,
      rawB: `${pB.metrics.hsPercentage.toFixed(1)}%`,
    },
    {
      subject: "K/D",
      [pA.nickname]: normalize("kd", pA.metrics.kd),
      [pB.nickname]: normalize("kd", pB.metrics.kd),
      rawA: pA.metrics.kd.toFixed(2),
      rawB: pB.metrics.kd.toFixed(2),
    },
    {
      subject: "Impact",
      [pA.nickname]: normalize("impact", pA.metrics.impact),
      [pB.nickname]: normalize("impact", pB.metrics.impact),
      rawA: pA.metrics.impact.toFixed(2),
      rawB: pB.metrics.impact.toFixed(2),
    },
  ];

  return (
    <div className="glass-panel p-5 border border-white/10 bg-white/[0.01] rounded-2xl flex flex-col items-center justify-center">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Gráfico Radar de Scout
      </h3>
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="subject" stroke="var(--muted-foreground)" fontSize={11} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border)" tick={false} axisLine={false} />
            
            <Radar
              name={pA.nickname}
              dataKey={pA.nickname}
              stroke="var(--series-1)"
              fill="var(--series-1)"
              fillOpacity={0.2}
            />
            <Radar
              name={pB.nickname}
              dataKey={pB.nickname}
              stroke="var(--series-2)"
              fill="var(--series-2)"
              fillOpacity={0.2}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
            <Tooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const dataObj = payload[0].payload;
                return (
                  <div className="glass-panel p-3 border border-white/10 bg-zinc-950 text-xs rounded-xl shadow-xl flex flex-col gap-1.5">
                    <p className="font-bold text-white mb-0.5 border-b border-white/5 pb-1">
                      {dataObj.subject}
                    </p>
                    <p className="flex justify-between gap-4 text-xs">
                      <span className="text-[var(--series-1)] font-semibold">{pA.nickname}:</span>
                      <span className="text-white font-mono">{dataObj.rawA}</span>
                    </p>
                    <p className="flex justify-between gap-4 text-xs">
                      <span className="text-[var(--series-2)] font-semibold">{pB.nickname}:</span>
                      <span className="text-white font-mono">{dataObj.rawB}</span>
                    </p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
