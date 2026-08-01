import { listPlayersWithBasicStats } from "@/server/repositories/player.repository";
import { getPlayerComparison } from "@/server/services/comparison.service";
import { ComparisonSelector } from "@/components/players/comparison-selector";
import { ComparisonRadar } from "@/components/players/comparison-radar";
import { ComparisonStats } from "@/components/players/comparison-stats";
import { ComparisonMaps } from "@/components/players/comparison-maps";
import { ComparisonTimeline } from "@/components/players/comparison-timeline";
import { ComparisonInsights } from "@/components/players/comparison-insights";
import { ComparisonOverview } from "@/components/players/comparison-overview";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/motion/fade-in";
import { Swords, ShieldAlert, HeartHandshake, Award } from "lucide-react";
import { safeQuery } from "@/server/safeQuery";
import { SeasonSelect } from "@/components/dashboard/season-select";
import { listSeasons } from "@/server/services/season.service";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ playerA?: string; playerB?: string; season?: string }>;
}) {
  const query = await searchParams;
  const playerAId = query.playerA;
  const playerBId = query.playerB;
  const season = query.season;
  const targetSeason = season === "all" ? undefined : season;

  // Carregar todas as temporadas para o seletor
  const allSeasons = await safeQuery(() => listSeasons(), []);
  const seasonOptions = [
    { id: "all", name: "Carreira (Histórico)", status: "CLOSED" as const },
    ...allSeasons.map((s) => ({ id: s.id, name: s.name, status: s.status })),
  ];
  const currentSeason = season || "all";

  // Carregar todos os jogadores ativos monitorados com rating calculado
  const allPlayers = await safeQuery(() => listPlayersWithBasicStats(), []);

  const selectorPlayers = allPlayers.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl,
    levelGc: p.levelGc,
    rating: p.rating,
  }));

  // Se os dois parâmetros foram passados, buscar a comparação
  const hasParams = !!playerAId && !!playerBId;
  const comparison = hasParams
    ? await safeQuery(() => getPlayerComparison(playerAId, playerBId, targetSeason), null)
    : null;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 sm:px-6">
      {/* Cabeçalho */}
      <FadeIn>
        <PageHeader
          title="Scout H2H"
          subtitle="Duelo direto entre jogadores da temporada — Compare estilo de jogo, impacto e consistência antes de montar seu time."
          icon={
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Swords className="size-6" />
            </div>
          }
          actions={
            <SeasonSelect seasons={seasonOptions} currentSeasonId={currentSeason} />
          }
        />
      </FadeIn>

      {/* Seletor de Comparação */}
      <FadeIn delay={0.03}>
        <ComparisonSelector
          players={selectorPlayers}
          initialPlayerA={playerAId}
          initialPlayerB={playerBId}
        />
      </FadeIn>

      {/* Caso tenha parâmetros mas deu erro no carregamento */}
      {hasParams && !comparison && (
        <FadeIn delay={0.06}>
          <EmptyState
            message="Não foi possível carregar o duelo. Certifique-se de que os jogadores selecionados são válidos e estão ativos."
            icon={ShieldAlert}
          />
        </FadeIn>
      )}

      {/* Estado Inicial sem Seleção */}
      {!hasParams && (
        <FadeIn delay={0.06}>
          <div className="glass-panel p-8 border border-white/[0.06] bg-white/[0.005] rounded-2xl text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-4 select-none">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/[0.06] text-muted-foreground/30 mb-5">
              <Swords className="size-6 text-primary" />
            </div>
            <h3 className="text-base font-black text-white mb-2">⚔️ Monte seu duelo</h3>
            <p className="text-xs text-muted-foreground/60 max-w-md mb-6 leading-relaxed">
              Escolha dois jogadores do grupo acima e inicie o confronto scout para descobrir:
            </p>
            
            {/* Grid de Bullets explicativos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md w-full border-t border-white/[0.04] pt-5">
              <div className="flex items-start gap-2.5">
                <span className="text-xs">📊</span>
                <div>
                  <p className="text-xs font-bold text-white/90 leading-none">Maior Impacto</p>
                  <p className="text-[10px] text-muted-foreground/65 mt-1 leading-tight">Quem causa mais dano e abre mais rounds</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-xs">🏆</span>
                <div>
                  <p className="text-xs font-bold text-white/90 leading-none">Retrospecto H2H</p>
                  <p className="text-[10px] text-muted-foreground/65 mt-1 leading-tight">Quem tem a maior taxa de vitória direta no servidor</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-xs">🔥</span>
                <div>
                  <p className="text-xs font-bold text-white/90 leading-none">Clutches Decisivos</p>
                  <p className="text-[10px] text-muted-foreground/65 mt-1 leading-tight">Quem garante a vitória sob extrema pressão</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-xs">🗺️</span>
                <div>
                  <p className="text-xs font-bold text-white/90 leading-none">Domínio de Mapas</p>
                  <p className="text-[10px] text-muted-foreground/65 mt-1 leading-tight">Quem é o rei em cada local de combate</p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Resultados do Confronto */}
      {comparison && (
        <div className="flex flex-col gap-6">
          {/* Placar Comparativo do Duelo (Full Width) */}
          <FadeIn delay={0.06}>
            <ComparisonOverview comparison={comparison} />
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna da Esquerda: Insights, Radar e H2H */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Sinergia / Compatibilidade */}
              <FadeIn delay={0.08} className="glass-panel p-5 border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-status-good/10 text-status-good border border-status-good/20">
                    <HeartHandshake className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Índice de Sinergia</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {comparison.compatibility.label}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-status-good">
                    {comparison.compatibility.score}%
                  </span>
                </div>
              </FadeIn>

              {/* Radar Scout */}
              <FadeIn delay={0.1}>
                <ComparisonRadar players={comparison.players} />
              </FadeIn>

              {/* Histórico H2H */}
              <FadeIn delay={0.12}>
                <SectionCard title="Confronto Direto (H2H)">
                  <div className="flex flex-col gap-4 text-sm">
                    {/* Jogando Juntos */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Jogaram Juntos
                      </span>
                      <p className="font-bold text-white text-base">
                        {comparison.h2h.together.total} partidas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {comparison.h2h.together.wins} vitórias / {comparison.h2h.together.losses} derrotas (
                        {comparison.h2h.together.winrate}% winrate)
                      </p>
                    </div>

                    {/* Jogando Contra */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Jogando Contra
                      </span>
                      <p className="font-bold text-white text-base">
                        {comparison.h2h.against.total} partidas
                      </p>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-1">
                        {comparison.players.map((p) => (
                          <p key={p.id} className="flex justify-between">
                            <span>{p.nickname} venceu:</span>
                            <span className="font-bold text-white">
                              {comparison.h2h.against.wins[p.id] ?? 0}
                            </span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </FadeIn>

              {/* Insights */}
              <FadeIn delay={0.14}>
                <SectionCard title="Dicas e Análise Tática">
                  <ComparisonInsights insights={comparison.insights} />
                </SectionCard>
              </FadeIn>

              {/* Coach IA Report */}
              <FadeIn delay={0.16}>
                <CoachReportCard
                  apiUrl={`/api/coach/compare?playerA=${comparison.players[0].id}&playerB=${comparison.players[1].id}&season=${currentSeason}`}
                />
              </FadeIn>
            </div>

            {/* Coluna da Direita: Métricas, Gráfico Temporal, Mapas e Conquistas */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Métricas Detalhadas (Destaques) */}
              <FadeIn delay={0.08}>
                <ComparisonStats players={comparison.players} />
              </FadeIn>

              {/* Gráfico Temporal */}
              <FadeIn delay={0.1}>
                <ComparisonTimeline
                  timeline={comparison.timeline}
                  playerIdA={comparison.players[0].id}
                  playerIdB={comparison.players[1].id}
                  nicknameA={comparison.players[0].nickname}
                  nicknameB={comparison.players[1].nickname}
                />
              </FadeIn>

              {/* Desempenho por Mapa */}
              <FadeIn delay={0.12}>
                <SectionCard title="Desempenho comparado por mapa">
                  <ComparisonMaps
                    maps={comparison.maps}
                    playerIdA={comparison.players[0].id}
                    playerIdB={comparison.players[1].id}
                    nicknameA={comparison.players[0].nickname}
                    nicknameB={comparison.players[1].nickname}
                  />
                </SectionCard>
              </FadeIn>

              {/* Conquistas Comparadas */}
              <FadeIn delay={0.14}>
                <SectionCard title="Conquistas Compartilhadas">
                  <div className="flex flex-col divide-y divide-white/5">
                    {comparison.achievements.map((ach) => {
                      const earnedA = ach.earnedBy[comparison.players[0].id];
                      const earnedB = ach.earnedBy[comparison.players[1].id];

                      return (
                        <div key={ach.code} className="py-3.5 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <Award className="size-4.5 text-accent-cyan" />
                            <div>
                              <p className="font-bold text-white">{ach.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                CÓD: {ach.code}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            {/* Jogador A */}
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-muted-foreground">
                                {comparison.players[0].nickname}
                              </span>
                              <span
                                className={`inline-block size-2 rounded-full mt-1.5 ${
                                  earnedA ? "bg-status-good shadow-[0_0_8px_var(--status-good)]" : "bg-white/10"
                                }`}
                              />
                            </div>

                            {/* Jogador B */}
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-muted-foreground">
                                {comparison.players[1].nickname}
                              </span>
                              <span
                                className={`inline-block size-2 rounded-full mt-1.5 ${
                                  earnedB ? "bg-status-good shadow-[0_0_8px_var(--status-good)]" : "bg-white/10"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </FadeIn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

