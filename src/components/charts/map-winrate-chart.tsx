"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MapWinrate {
  map: string;
  matchesPlayed: number;
  winrate: number;
}

export function MapWinrateChart({ data }: { data: MapWinrate[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        Sem partidas suficientes ainda.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="map"
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
          formatter={(value, _name, item) => [
            `${value}% (${(item.payload as MapWinrate).matchesPlayed} partidas)`,
            "Winrate",
          ]}
        />
        <Bar dataKey="winrate" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
