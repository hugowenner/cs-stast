"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cleanMapName } from "@/lib/utils";

export interface MapWinrate {
  map: string;
  cleanMapName?: string;
  matchesPlayed: number;
  winrate: number;
  directMatchesExcluded?: number;
}

export function MapWinrateChart({ data }: { data: MapWinrate[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        Sem partidas suficientes ainda.
      </p>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    displayName: item.cleanMapName || cleanMapName(item.map),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="displayName"
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
          unit="%"
          domain={[0, 100]}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value, _name, item) => {
            const payload = item.payload as MapWinrate & { displayName: string };
            const matchesText = `${payload.matchesPlayed} ${payload.matchesPlayed === 1 ? "partida" : "partidas"}`;
            const excludedText =
              payload.directMatchesExcluded && payload.directMatchesExcluded > 0
                ? ` • ${payload.directMatchesExcluded} confronto${payload.directMatchesExcluded > 1 ? "s" : ""} interno${payload.directMatchesExcluded > 1 ? "s" : ""} excluído${payload.directMatchesExcluded > 1 ? "s" : ""}`
                : "";
            return [
              `${value}% (${matchesText}${excludedText})`,
              "Aproveitamento",
            ];
          }}
        />
        <Bar dataKey="winrate" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
