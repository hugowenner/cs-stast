import { listPlayers } from "@/server/repositories/player.repository";
import { getPlayerComparison } from "@/server/services/comparison.service";
import { ComparisonSelector } from "@/components/players/comparison-selector";
import { ComparisonRadar } from "@/components/players/comparison-radar";
import { ComparisonStats } from "@/components/players/comparison-stats";
import { ComparisonMaps } from "@/components/players/comparison-maps";
import { ComparisonTimeline } from "@/components/players/comparison-timeline";
import { ComparisonInsights } from "@/components/players/comparison-insights";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/motion/fade-in";
import { Users, ShieldAlert, Award, HeartHandshake } from "lucide-react";
import { safeQuery } from "@/server/safeQuery";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ playerA?: string; playerB?: string }>;
}) {
  const query = await searchParams;
  const playerAId = query.playerA;
  const playerBId = query.playerB;

  // Carregar todos os jogadores ativos monitorados para o seletor
  const allPlayers = await safeQuery(() => listPlayers(), []);

  const selectorPlayers = allPlayers.map((p) => ({
    id: p.id,
    nickname: p.nickname,
  }));

  // Se os dois parâmetros foram passados, buscar a comparação
  const hasParams = !!playerAId && !!playerBId;
  const comparison = hasParams
    ? await safeQuery(() => getPlayerComparison(playerAId, playerBId), null)
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <FadeIn>
        <PageHeader
          title="Scout H2H"
          subtitle="Comparação estatística detalhada de performance entre membros do time"
          icon={
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Users className="size-6" />
            </div>
          }
        />
      </FadeIn>

      {/* Seletor de Comparação */}
      <FadeIn delay={0.05}>
        <ComparisonSelector
          players={selectorPlayers}
          initialPlayerA={playerAId}
          initialPlayerB={playerBId}
        />
      </FadeIn>

      {hasParams && !comparison && (
        <FadeIn delay={0.1}>
          <EmptyState
            message="Não foi possível carregar a comparação. Verifique se os jogadores existem e fazem parte da watchlist."
            icon={ShieldAlert}
          />
        </FadeIn>
      )}

      {comparison && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna da Esquerda: Insights, Compatibilidade e Radar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Bloco de Compatibilidade / Sinergia */}
            <FadeIn delay={0.1} className="glass-panel p-5 border border-white/10 bg-white/[0.01] rounded-2xl flex items-center justify-between">
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
            <FadeIn delay={0.12}>
              <ComparisonRadar players={comparison.players} />
            </FadeIn>

            {/* Histórico H2H */}
            <FadeIn delay={0.14}>
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

            {/* Insights Baseados em Regras */}
            <FadeIn delay={0.16}>
              <SectionCard title="Dicas e Análise Tática">
                <ComparisonInsights insights={comparison.insights} />
              </SectionCard>
            </FadeIn>

            {/* Relatório Avançado do Coach IA */}
            <FadeIn delay={0.18}>
              <CoachReportCard
                apiUrl={`/api/coach/compare?playerA=${comparison.players[0].id}&playerB=${comparison.players[1].id}`}
              />
            </FadeIn>
          </div>

          {/* Coluna da Direita: Métricas, Timeline e Mapas */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Cards de Métricas Principais */}
            <FadeIn delay={0.1}>
              <ComparisonStats players={comparison.players} />
            </FadeIn>

            {/* Gráfico Combinado Temporal */}
            <FadeIn delay={0.12}>
              <ComparisonTimeline
                timeline={comparison.timeline}
                playerIdA={comparison.players[0].id}
                playerIdB={comparison.players[1].id}
                nicknameA={comparison.players[0].nickname}
                nicknameB={comparison.players[1].nickname}
              />
            </FadeIn>

            {/* Performance por Mapa */}
            <FadeIn delay={0.14}>
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
            <FadeIn delay={0.16}>
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
                          {/* Player A badge */}
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

                          {/* Player B badge */}
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
      )}
    </div>
  );
}
