import * as React from "react";
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
import { SectionContainer } from "@/components/dashboard/section-container";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/motion/fade-in";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { Swords, ShieldAlert, HeartHandshake, Award, Crosshair, Target, Shield, Trophy } from "lucide-react";
import { safeQuery } from "@/server/safeQuery";
import { SeasonSelect } from "@/components/dashboard/season-select";
import { listSeasons } from "@/server/services/season.service";
import { cn } from "@/lib/utils";

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

  const allSeasons = await safeQuery(() => listSeasons(), []);
  const seasonOptions = [
    { id: "all", name: "Carreira (Histórico)", status: "CLOSED" as const },
    ...allSeasons.map((s) => ({ id: s.id, name: s.name, status: s.status })),
  ];
  const currentSeason = season || "all";

  const allPlayers = await safeQuery(() => listPlayersWithBasicStats(), []);

  const selectorPlayers = allPlayers.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl,
    levelGc: p.levelGc,
    rating: p.rating,
  }));

  const hasParams = !!playerAId && !!playerBId;
  const comparison = hasParams
    ? await safeQuery(() => getPlayerComparison(playerAId, playerBId, targetSeason), null)
    : null;

  return (
    <div className="flex flex-col gap-10 lg:gap-12 pb-16">
      
      {/* ═══ 01. HEADER & VERSUS TITLE ═══ */}
      <FadeIn>
        <div className="bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col shadow-lg">
          <div className="h-[2px] w-full bg-gradient-to-r from-primary via-cyan-400 to-transparent" />
          
          <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 bg-surface-deck/40">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex size-10 items-center justify-center bg-primary/10 border border-primary/25 rounded-xs text-primary shrink-0">
                <Swords className="size-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                    VERSUS INTELLIGENCE ARENA
                  </span>
                  <TacticalBadge label="H2H SCOUT" variant="primary" size="xs" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight truncate mt-0.5">
                  Confronto Direto (Player vs Player)
                </h1>
              </div>
            </div>

            <div className="shrink-0">
              <SeasonSelect seasons={seasonOptions} currentSeasonId={currentSeason} />
            </div>
          </div>

          <div className="p-4 bg-surface-deck/20 text-xs font-sans text-muted-foreground/75 leading-relaxed">
            Compare o histórico competitivo, duelos diretos e eficiência de dois jogadores. As conclusões partem exclusivamente dos dados do servidor.
          </div>
        </div>
      </FadeIn>

      {/* ═══ 02. COMPARISON SELECTOR ═══ */}
      <FadeIn delay={0.04}>
        <ComparisonSelector
          players={selectorPlayers}
          initialPlayerA={playerAId}
          initialPlayerB={playerBId}
        />
      </FadeIn>

      {/* Error state if params exist but comparison failed */}
      {hasParams && !comparison && (
        <FadeIn delay={0.06}>
          <EmptyState
            message="Não foi possível carregar o duelo. Certifique-se de que os jogadores selecionados são válidos e estão ativos na temporada."
            icon={ShieldAlert}
          />
        </FadeIn>
      )}

      {/* Initial state before selection */}
      {!hasParams && (
        <FadeIn delay={0.06}>
          <div className="p-8 bg-surface-panel border border-border/60 rounded-sm text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-2 shadow-md">
            <div className="flex size-12 items-center justify-center rounded-xs bg-surface-deck border border-border/60 text-primary mb-4">
              <Swords className="size-5" />
            </div>
            <h3 className="text-base font-mono font-black text-foreground uppercase tracking-wider mb-2">
              Selecione os dois oponentes acima
            </h3>
            <p className="text-xs text-muted-foreground/75 font-sans max-w-md mb-6 leading-relaxed">
              O módulo de Scout H2H analisa métricas auditadas, duelos quando jogaram juntos, confrontos diretos e mapas dominantes:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-md w-full border-t border-border/30 pt-4">
              <div className="p-3 bg-surface-deck rounded-xs border border-border/40">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary block">
                  RÉGUA DE COMBATE
                </span>
                <span className="text-[11px] text-muted-foreground/70 block mt-0.5">
                  Rating 2.0, ADR, K/D, Impacto e HS%
                </span>
              </div>
              <div className="p-3 bg-surface-deck rounded-xs border border-border/40">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                  HISTÓRICO H2H
                </span>
                <span className="text-[11px] text-muted-foreground/70 block mt-0.5">
                  Partidas jogadas juntos vs jogando contra
                </span>
              </div>
              <div className="p-3 bg-surface-deck rounded-xs border border-border/40">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold block">
                  BALANÇO DE MAPAS
                </span>
                <span className="text-[11px] text-muted-foreground/70 block mt-0.5">
                  Aproveitamento percentual por cenário
                </span>
              </div>
              <div className="p-3 bg-surface-deck rounded-xs border border-border/40">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-status-good block">
                  ÍNDICE DE SINERGIA
                </span>
                <span className="text-[11px] text-muted-foreground/70 block mt-0.5">
                  Compatibilidade tática da dupla
                </span>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="flex flex-col gap-10">
          
          {/* ═══ 01 / PLACAR DO DUELO ═══ */}
          <SectionContainer
            index={1}
            tag="PLACAR COMPETITIVO"
            title="Vantagem Tática e Categorias"
            subtitle="Balanço direto das 7 métricas principais do CS2 Stats."
            delay={0.06}
          >
            <ComparisonOverview comparison={comparison} />
          </SectionContainer>

          {/* ═══ 02 / RÉGUA COMPARATIVA ═══ */}
          <SectionContainer
            index={2}
            tag="RÉGUA DE COMBATE"
            title="Comparativo Detalhado de Métricas"
            subtitle="Vantagem matemática em cada pilar de desempenho."
            delay={0.08}
          >
            <ComparisonStats players={comparison.players} />
          </SectionContainer>

          {/* ═══ 03 / GRID DE SINERGIA, RADAR & MAPAS ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Coluna Esquerda: Sinergia, Radar, Histórico H2H, Insights, Coach IA */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Sinergia */}
              <div className="p-4 bg-surface-panel border border-border/60 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xs bg-status-good/10 text-status-good border border-status-good/25">
                    <HeartHandshake className="size-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block">
                      ÍNDICE DE SINERGIA
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {comparison.compatibility.label}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xl font-black text-status-good tabular-nums">
                  {comparison.compatibility.score}%
                </span>
              </div>

              {/* Radar */}
              <div className="bg-surface-panel border border-border/60 rounded-sm p-4">
                <ComparisonRadar players={comparison.players} />
              </div>

              {/* Histórico H2H Direto */}
              <div className="bg-surface-panel border border-border/60 rounded-sm p-4 flex flex-col gap-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
                  Histórico no Servidor (H2H)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Juntos */}
                  <div className="p-3 bg-surface-deck border border-border/40 rounded-xs flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-muted-foreground/60 uppercase font-bold">
                      JOGARAM JUNTOS
                    </span>
                    <span className="font-mono text-base font-black text-foreground tabular-nums">
                      {comparison.h2h.together.total} partidas
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      {comparison.h2h.together.wins}V / {comparison.h2h.together.losses}D ({comparison.h2h.together.winrate}% WR)
                    </span>
                  </div>

                  {/* Contra */}
                  <div className="p-3 bg-surface-deck border border-border/40 rounded-xs flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-muted-foreground/60 uppercase font-bold">
                      JOGANDO CONTRA
                    </span>
                    <span className="font-mono text-base font-black text-foreground tabular-nums">
                      {comparison.h2h.against.total} confrontos
                    </span>
                    <div className="flex flex-col gap-0.5 text-[10px] font-mono text-muted-foreground/75 mt-0.5">
                      {comparison.players.map((p) => (
                        <div key={p.id} className="flex justify-between">
                          <span className="truncate">{p.nickname}:</span>
                          <span className="font-bold text-foreground">
                            {comparison.h2h.against.wins[p.id] ?? 0}V
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights Táticos */}
              <div className="bg-surface-panel border border-border/60 rounded-sm p-4">
                <ComparisonInsights insights={comparison.insights} />
              </div>

              {/* Relatório do Coach IA */}
              <CoachReportCard
                apiUrl={`/api/coach/compare?playerA=${comparison.players[0].id}&playerB=${comparison.players[1].id}&season=${currentSeason}`}
              />
            </div>

            {/* Coluna Direita: Timeline, Mapas e Conquistas */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Timeline */}
              <div className="bg-surface-panel border border-border/60 rounded-sm p-4">
                <ComparisonTimeline
                  timeline={comparison.timeline}
                  playerIdA={comparison.players[0].id}
                  playerIdB={comparison.players[1].id}
                  nicknameA={comparison.players[0].nickname}
                  nicknameB={comparison.players[1].nickname}
                />
              </div>

              {/* Desempenho por Mapa */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70">
                  BALANÇO POR MAPA
                </span>
                <ComparisonMaps
                  maps={comparison.maps}
                  playerIdA={comparison.players[0].id}
                  playerIdB={comparison.players[1].id}
                  nicknameA={comparison.players[0].nickname}
                  nicknameB={comparison.players[1].nickname}
                />
              </div>

              {/* Conquistas Comparadas */}
              <div className="bg-surface-panel border border-border/60 rounded-sm p-4 flex flex-col gap-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
                  Conquistas Compartilhadas
                </span>

                <div className="flex flex-col divide-y divide-border/30">
                  {comparison.achievements.map((ach) => {
                    const earnedA = ach.earnedBy[comparison.players[0].id];
                    const earnedB = ach.earnedBy[comparison.players[1].id];

                    return (
                      <div key={ach.code} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Award className="size-4 text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-foreground truncate block">{ach.name}</span>
                            <span className="text-[9px] text-muted-foreground/50 font-mono">
                              CÓD: {ach.code}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0 font-mono text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground/60">{comparison.players[0].nickname}:</span>
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                earnedA ? "bg-status-good" : "bg-border/60"
                              )}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground/60">{comparison.players[1].nickname}:</span>
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                earnedB ? "bg-status-good" : "bg-border/60"
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
