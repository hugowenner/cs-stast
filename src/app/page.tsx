import { Gamepad2, Swords, Trophy, Users } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { SectionCard } from "@/components/ui/section-card";
import { FadeIn } from "@/components/motion/fade-in";
import { MatchRow } from "@/components/matches/match-row";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { RatingBadge } from "@/components/players/rating-badge";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { RivalryRow } from "@/components/rivalries/rivalry-row";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { safeQuery } from "@/server/safeQuery";
import * as dashboardService from "@/server/services/dashboard.service";
import * as matchService from "@/server/services/match.service";
import * as statsService from "@/server/services/stats.service";
import * as achievementService from "@/server/services/achievement.service";
import * as rivalryService from "@/server/services/rivalry.service";

export default async function DashboardPage() {
  const [summary, recentMatches, topRating, mapWinrates, recentAchievements, topRivalries] =
    await Promise.all([
      safeQuery(() => dashboardService.getDashboardSummary(), {
        totalMatches: 0,
        totalPlayers: 0,
        totalSessions: 0,
        latestSession: null,
      }),
      safeQuery(() => matchService.listRecentMatches(6), []),
      safeQuery(() => statsService.getRanking("rating", 5), []),
      safeQuery(() => statsService.getMapWinrates(), []),
      safeQuery(() => achievementService.listRecent(6), []),
      safeQuery(() => rivalryService.listTopRivalries(5), []),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <FadeIn>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {summary.latestSession
              ? `Última sessão: ${summary.latestSession.name}`
              : "Nenhuma partida sincronizada ainda"}
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Partidas" value={summary.totalMatches} icon={Gamepad2} accent="violet" />
        <StatTile label="Jogadores" value={summary.totalPlayers} icon={Users} accent="cyan" />
        <StatTile label="Sessões" value={summary.totalSessions} icon={Trophy} accent="violet" />
        <StatTile
          label="Rivalidades ativas"
          value={topRivalries.length}
          icon={Swords}
          accent="cyan"
        />
      </FadeIn>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <SectionCard title="Últimos jogos">
            {recentMatches.length === 0 ? (
              <EmptyState message="Nenhuma partida sincronizada ainda. Conecte o GC Companion para começar." />
            ) : (
              <div className="flex flex-col gap-1">
                {recentMatches.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            )}
          </SectionCard>
        </FadeIn>

        <FadeIn delay={0.15}>
          <SectionCard title="Top jogadores · Rating">
            {topRating.length === 0 ? (
              <EmptyState message="Sem dados suficientes ainda." />
            ) : (
              <div className="flex flex-col gap-3">
                {topRating.map((entry, index) =>
                  entry.player ? (
                    <div key={entry.player.id} className="flex items-center gap-3">
                      <span className="text-muted-foreground w-4 text-xs font-semibold">
                        {index + 1}
                      </span>
                      <PlayerAvatar
                        nickname={entry.player.nickname}
                        avatarUrl={entry.player.avatarUrl}
                        size="sm"
                      />
                      <span className="flex-1 truncate text-sm">{entry.player.nickname}</span>
                      <RatingBadge rating={entry.value} />
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </SectionCard>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <SectionCard title="Winrate por mapa">
            <MapWinrateChart data={mapWinrates} />
          </SectionCard>
        </FadeIn>

        <FadeIn delay={0.25}>
          <SectionCard title="Conquistas recentes">
            {recentAchievements.length === 0 ? (
              <EmptyState message="Nenhuma conquista desbloqueada ainda." />
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {recentAchievements.map((entry) => (
                  <AchievementFeedItem key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </SectionCard>
        </FadeIn>
      </div>

      <FadeIn delay={0.3}>
        <SectionCard title="Rivalidades em destaque">
          {topRivalries.length === 0 ? (
            <EmptyState message="Ainda não há confrontos suficientes para formar rivalidades." />
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {topRivalries.map((rivalry) => (
                <RivalryRow key={rivalry.id} rivalry={rivalry} />
              ))}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-muted-foreground py-8 text-center text-sm">{message}</p>;
}
