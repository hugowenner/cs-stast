import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { safeQuery } from "@/server/safeQuery";
import * as statsService from "@/server/services/stats.service";
import { cn } from "@/lib/utils";

const METRICS = [
  { value: "rating", label: "Rating" },
  { value: "elo", label: "ELO" },
  { value: "adr", label: "ADR" },
  { value: "kast", label: "KAST" },
  { value: "impact", label: "Impact" },
] as const;

type Metric = (typeof METRICS)[number]["value"];

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string }>;
}) {
  const { metric: rawMetric } = await searchParams;
  const metric = (METRICS.some((m) => m.value === rawMetric) ? rawMetric : "rating") as Metric;

  const ranking = await safeQuery(
    () => (metric === "elo" ? statsService.getEloRanking(50) : statsService.getRanking(metric, 50)),
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <FadeIn>
        <h1 className="text-2xl font-bold tracking-tight">Rankings</h1>
      </FadeIn>

      <FadeIn delay={0.05} className="flex gap-2">
        {METRICS.map((m) => (
          <Link
            key={m.value}
            href={`/rankings?metric=${m.value}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              metric === m.value
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-white/5",
            )}
          >
            {m.label}
          </Link>
        ))}
      </FadeIn>

      <FadeIn delay={0.1}>
        <SectionCard>
          {ranking.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Sem dados suficientes ainda.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {ranking.map((entry, index) =>
                entry.player ? (
                  <div
                    key={entry.player.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2"
                  >
                    <span className="text-muted-foreground w-6 text-sm font-semibold">
                      {index + 1}
                    </span>
                    <PlayerAvatar
                      nickname={entry.player.nickname}
                      avatarUrl={entry.player.avatarUrl}
                      size="sm"
                    />
                    <span className="flex-1 truncate text-sm font-medium">
                      {entry.player.nickname}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{entry.value}</span>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}
