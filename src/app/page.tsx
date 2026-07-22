import { SectionCard } from "@/components/ui/section-card";
import { RankRow } from "@/components/ui/rank-row";
import { FadeIn } from "@/components/motion/fade-in";
import { MatchRow } from "@/components/matches/match-row";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { RatingBadge } from "@/components/players/rating-badge";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { RivalryRow } from "@/components/rivalries/rivalry-row";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { SeasonHero } from "@/components/dashboard/season-hero";
import { safeQuery } from "@/server/safeQuery";
import * as dashboardService from "@/server/services/dashboard.service";
import * as matchService from "@/server/services/match.service";
import * as statsService from "@/server/services/stats.service";
import * as achievementService from "@/server/services/achievement.service";
import * as rivalryService from "@/server/services/rivalry.service";

const SEASON_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
  new Date(),
);

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
      safeQuery(() => rivalryService.listTopRivalriesWithH2H(5), []),
    ]);

  return (
    <div className="flex flex-col gap-4">
      {/* Hero de Temporada */}
      <FadeIn>
        <SeasonHero
          seasonLabel={SEASON_LABEL}
          totalMatches={summary.totalMatches}
          totalPlayers={summary.totalPlayers}
          totalSessions={summary.totalSessions}
        />
      </FadeIn>

      {/* Destaque principal: Quem Tá Voando + Últimas Batalhas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeIn delay={0.08} className="lg:col-span-2">
          <SectionCard title="🎮 Últimas Batalhas" variant="highlight">
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

        <FadeIn delay={0.12}>
          <SectionCard title="🔥 Quem Tá Voando" variant="highlight">
            {topRating.length === 0 ? (
              <EmptyState message="Sem dados suficientes ainda." />
            ) : (
              <div className="flex flex-col gap-1">
                {topRating.map((entry, index) =>
                  entry.player ? (
                    <RankRow
                      key={entry.player.id}
                      position={index + 1}
                      podium
                      icon={
                        <PlayerAvatar
                          nickname={entry.player.nickname}
                          avatarUrl={entry.player.avatarUrl}
                          size="sm"
                        />
                      }
                      title={entry.player.nickname}
                      trailing={<RatingBadge rating={entry.value} />}
                    />
                  ) : null,
                )}
              </div>
            )}
          </SectionCard>
        </FadeIn>
      </div>

      {/* Confrontos Quentes */}
      <FadeIn delay={0.16}>
        <SectionCard title="⚔️ Confrontos Quentes">
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

      {/* Grid secundário */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <SectionCard title="Winrate por Mapa">
            <MapWinrateChart data={mapWinrates} />
          </SectionCard>
        </FadeIn>

        <FadeIn delay={0.25}>
          <SectionCard title="🏆 Mural da Fama">
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
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-muted-foreground py-8 text-center text-sm">{message}</p>;
}
