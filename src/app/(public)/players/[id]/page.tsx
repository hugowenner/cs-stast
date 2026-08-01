import { notFound } from "next/navigation";
import { Crosshair, Skull, Target, Trophy, Percent, Gamepad2, Award, Handshake, Flame, Swords } from "lucide-react";
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
import { SeasonSelect } from "@/components/dashboard/season-select";
import { listSeasons } from "@/server/services/season.service";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const { season } = await searchParams;
  const targetSeason = season === "all" ? undefined : season;

  const allSeasons = await safeQuery(() => listSeasons(), []);
  const seasonOptions = [
    { id: "all", name: "Carreira (Histórico)", status: "CLOSED" as const },
    ...allSeasons.map((s) => ({ id: s.id, name: s.name, status: s.status })),
  ];
  const currentSeason = season || "all";

  const detail = await safeQuery(() => playerService.getPlayerDetail(id, targetSeason), null);
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
          subtitle={
            <>
              <span>Gamers Club ID: {player.gamersClubId ?? "Não associado"}</span>
              {player.levelGc !== null && player.levelGc !== undefined && (
                <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-md px-2 py-0.5 font-bold text-xs text-primary">
                  Gamers Club LVL {player.levelGc}
                </span>
              )}
            </>
          }
          icon={<PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="lg" />}
          actions={
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <SeasonSelect seasons={seasonOptions} currentSeasonId={currentSeason} />
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Perfil Watchlist
                </span>
                <span className="inline-flex items-center rounded-full bg-status-good/15 px-2.5 py-0.5 text-xs font-semibold text-status-good mt-1 border border-status-good/20">
                  Monitoramento Ativo
                </span>
              </div>
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
        <CoachReportCard apiUrl={`/api/coach/player/${player.id}?season=${currentSeason}`} />
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

      {/* Estatísticas de Impacto */}
      <FadeIn delay={0.11}>
        <div className="mb-3 mt-1">
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">Estatísticas de Impacto</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile
            label="Assistências"
            value={`${overview.assistsAvg.toFixed(1)} média`}
            icon={Handshake}
            accent="violet"
            context="Colaboração por partida"
          />
          <StatTile
            label="Impacto"
            value={overview.impactAvg.toFixed(2)}
            icon={Flame}
            accent="cyan"
            context="Dano e agressividade"
          />
          <StatTile
            label="Entry"
            value={overview.entryKills.toString()}
            icon={Swords}
            accent="violet"
            context="Primeiras eliminações"
          />
        </div>
      </FadeIn>

      {/* Métricas Nativas Gamers Club */}
      <FadeIn delay={0.115}>
        <div className="mb-3 mt-1">
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">Métricas Nativas Gamers Club</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="GC Rating Médio"
            value={overview.gcRatingAvg !== null ? overview.gcRatingAvg.toFixed(2) : "N/A"}
            icon={Trophy}
            accent="violet"
            context="Rating da plataforma"
          />
          <StatTile
            label="Dano Total"
            value={overview.totalDamage.toLocaleString()}
            icon={Target}
            accent="cyan"
            context={`${overview.totalMatches > 0 ? (overview.totalDamage / overview.totalMatches).toFixed(0) : 0} média por partida`}
          />
          <StatTile
            label="Trade Kills"
            value={overview.tradeKills.toString()}
            icon={Swords}
            accent="violet"
            context={`${overview.totalMatches > 0 ? (overview.tradeKills / overview.totalMatches).toFixed(1) : 0} média por partida`}
          />
          <StatTile
            label="Assistências de Flash"
            value={overview.flashAssists.toString()}
            icon={Handshake}
            accent="cyan"
            context={`${overview.totalMatches > 0 ? (overview.flashAssists / overview.totalMatches).toFixed(1) : 0} média por partida`}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.118}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatTile
            label="Clutches Vencidos"
            value={overview.clutchesWon.toString()}
            icon={Trophy}
            accent="violet"
            context="Situações de clutch vencidas"
          />
          
          <div className="rounded-2xl border border-white/5 bg-zinc-950 p-4 flex flex-col justify-between hover:bg-white/[0.02] transition-colors min-h-[96px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Multikills
              </span>
              <Gamepad2 className="size-4 text-primary" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center mt-2">
              <div>
                <span className="text-sm font-black text-foreground block">{overview.doubleKills}</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold">2K</span>
              </div>
              <div>
                <span className="text-sm font-black text-foreground block">{overview.tripleKills}</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold">3K</span>
              </div>
              <div>
                <span className="text-sm font-black text-foreground block">{overview.quadKills}</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold">4K</span>
              </div>
              <div>
                <span className="text-sm font-black text-foreground block">{overview.aces}</span>
                <span className="text-[8px] text-muted-foreground uppercase font-bold">Aces</span>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Gráficos de Evolução */}
      <FadeIn delay={0.125}>
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
                      Desempenho: {match.kills} kills / {match.deaths} mortes / {match.assists} assistências · {match.hsPercentage.toFixed(0)}% HS
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
