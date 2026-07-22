import { notFound } from "next/navigation";
import { Crosshair, Skull, Target, Trophy, Percent, Gamepad2, Award } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { StatTile } from "@/components/ui/stat-tile";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { RatingBadge } from "@/components/players/rating-badge";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { CoachSummaryCard } from "@/components/ui/coach-summary-card";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { ProfileChartsSection } from "@/components/players/profile-charts-section";
import { ItemProgressList } from "@/components/ui/item-progress-list";
import { RelationshipList } from "@/components/ui/relationship-list";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { safeQuery } from "@/server/safeQuery";
import * as playerService from "@/server/services/player.service";
import { winrateContext, ratingContext, adrContext, kastContext, hsContext } from "@/lib/statContext";

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const detail = await safeQuery(() => playerService.getPlayerDetail(id), null);
  if (!detail) notFound();

  const { player, overview, maps, timeline, achievements, partners, recentMatches } = detail;

  const mapProgressItems = maps.map((m) => ({
    name: m.mapName,
    count: m.appearances,
    percentage: m.winrate,
    subtitle: `${m.appearances} ${m.appearances === 1 ? "partida" : "partidas"}`,
  }));

  const relationshipItems = partners.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl,
    count: p.matchesTogether,
  }));

  const eloTimelinePoints = timeline.map((t) => ({
    playedAt: t.playedAt.toISOString(),
    value: t.elo,
  }));

  const ratingTimelinePoints = timeline.map((t) => ({
    playedAt: t.playedAt.toISOString(),
    value: t.rating,
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho */}
      <FadeIn>
        <PageHeader
          title={player.nickname}
          subtitle={`Gamers Club ID: ${player.gamersClubId ?? "Não associado"}`}
          icon={<PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="lg" />}
          actions={
            <div className="text-right">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Perfil Watchlist
              </span>
              <span className="inline-flex items-center rounded-full bg-status-good/15 px-2.5 py-0.5 text-xs font-semibold text-status-good mt-1 border border-status-good/20">
                Monitoramento Ativo
              </span>
            </div>
          }
        />
      </FadeIn>

      {/* Grid de Métricas Principais */}
      <FadeIn delay={0.05} className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Partidas Disputadas"
          value={overview.totalMatches}
          icon={Gamepad2}
          accent="violet"
        />
        <StatTile
          label="Vitórias / Derrotas"
          value={`${overview.wins}V - ${overview.losses}D`}
          icon={Trophy}
          accent="cyan"
        />
        <StatTile
          label="Winrate Geral"
          value={`${overview.winrate}%`}
          icon={Percent}
          accent="violet"
          context={winrateContext(overview.winrate)}
        />
        <StatTile
          label="K/D Ratio"
          value={overview.kd.toFixed(2)}
          icon={Crosshair}
          accent="cyan"
        />
      </FadeIn>

      {/* Análise Técnica (Coach IA) */}
      <FadeIn delay={0.08}>
        <CoachSummaryCard data={overview.summaryCoach} />
      </FadeIn>

      {/* Relatório de Análise Avançada do Coach IA */}
      <FadeIn delay={0.09}>
        <CoachReportCard apiUrl={`/api/coach/player/${player.id}`} />
      </FadeIn>

      {/* Métricas Avançadas */}
      <FadeIn delay={0.1} className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Rating"
          value={overview.ratingAvg.toFixed(2)}
          icon={Trophy}
          accent="violet"
          context={ratingContext(overview.ratingAvg)}
        />
        <StatTile
          label="ADR"
          value={overview.adrAvg.toFixed(1)}
          icon={Target}
          accent="cyan"
          context={adrContext(overview.adrAvg)}
        />
        <StatTile
          label="KAST"
          value={`${overview.kastAvg.toFixed(1)}%`}
          icon={Percent}
          accent="violet"
          context={kastContext(overview.kastAvg)}
        />
        <StatTile
          label="HS%"
          value={`${overview.hsPercentage.toFixed(1)}%`}
          icon={Skull}
          accent="cyan"
          context={hsContext(overview.hsPercentage)}
        />
      </FadeIn>

      {/* Gráficos de Evolução */}
      <FadeIn delay={0.12}>
        <ProfileChartsSection
          eloTimeline={eloTimelinePoints}
          ratingTimeline={ratingTimelinePoints}
        />
      </FadeIn>

      {/* Mapas e Conquistas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FadeIn delay={0.15}>
          <SectionCard title="Performance por Mapa">
            {mapProgressItems.length === 0 ? (
              <EmptyState message="Sem estatísticas de mapa ainda." />
            ) : (
              <ItemProgressList items={mapProgressItems} emptyMessage="Sem estatísticas de mapa ainda." />
            )}
          </SectionCard>
        </FadeIn>

        <FadeIn delay={0.18}>
          <SectionCard title="Conquistas Recentes">
            {achievements.length === 0 ? (
              <EmptyState message="Nenhuma conquista ainda." icon={Award} />
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {achievements.slice(0, 5).map((entry) => (
                  <AchievementFeedItem key={entry.id} entry={{ ...entry, player }} />
                ))}
              </div>
            )}
          </SectionCard>
        </FadeIn>
      </div>

      {/* Parceiros Frequentes */}
      <FadeIn delay={0.2}>
        <SectionCard title="Parceiros mais Frequentes (Watchlist)">
          {relationshipItems.length === 0 ? (
            <EmptyState message="Nenhuma parceria registrada ainda." />
          ) : (
            <RelationshipList
              items={relationshipItems}
              labelSuffix="partidas jogadas juntas"
              emptyMessage="Nenhuma partida com outros membros do grupo registrada ainda."
            />
          )}
        </SectionCard>
      </FadeIn>

      {/* Últimas Partidas */}
      <FadeIn delay={0.22}>
        <SectionCard title="Últimos 10 Jogos">
          {recentMatches.length === 0 ? (
            <EmptyState message="Nenhuma partida disputada ainda." />
          ) : (
            <div className="flex flex-col gap-2">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      {match.mapName} · {match.playedAt.toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Desempenho: {match.kills} kills / {match.deaths} mortes / {match.assists} assistências
                    </p>
                  </div>
                  <RatingBadge rating={match.rating} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </FadeIn>
    </div>
  );
}
