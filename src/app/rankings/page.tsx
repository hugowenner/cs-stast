import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { PageHeader } from "@/components/ui/page-header";
import { RankRow } from "@/components/ui/rank-row";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { safeQuery } from "@/server/safeQuery";
import * as statsService from "@/server/services/stats.service";
import { cn } from "@/lib/utils";

const METRICS = [
  { value: "rating", label: "Rating" },
  { value: "elo", label: "Rating do Hub" },
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
        <PageHeader title="🏆 Rankings" subtitle="Liga interna baseada nas últimas partidas sincronizadas" />
      </FadeIn>

      <FadeIn delay={0.05} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap flex-nowrap shrink-0">
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
        <SectionCard variant="highlight">
          {ranking.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Sem dados suficientes ainda.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {ranking.map((entry, index) =>
                entry.player ? (
                  <RankRow
                    key={entry.player.id}
                    position={index + 1}
                    podium
                    href={`/players/${entry.player.id}`}
                    icon={
                      <PlayerAvatar
                        nickname={entry.player.nickname}
                        avatarUrl={entry.player.avatarUrl}
                        size="sm"
                      />
                    }
                    title={
                      <span className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{entry.player.nickname}</span>
                        {entry.player.levelGc !== null && entry.player.levelGc !== undefined && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-primary inline-block">
                            LVL {entry.player.levelGc}
                          </span>
                        )}
                      </span>
                    }
                    trailing={
                      <span className="text-sm font-semibold tabular-nums text-white">
                        {entry.value}
                      </span>
                    }
                  />
                ) : null,
              )}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}
