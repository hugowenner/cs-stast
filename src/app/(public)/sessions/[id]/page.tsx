import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Gamepad2,
  Trophy,
  Percent,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Zap,
  Swords,
  Clock,
  MapPin,
  Minus,
} from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { RatingBadge } from "@/components/players/rating-badge";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { safeQuery } from "@/server/safeQuery";
import * as sessionService from "@/server/services/session.service";
import { cn } from "@/lib/utils";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const summary = await safeQuery(() => sessionService.getSessionSummary(id), null);
  if (!summary) notFound();

  const { metadata, overview, timeline, players, maps, highlights, trends, bestDuo } = summary;

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case "excellent":
        return { label: "EXCELENTE", variant: "good" as const };
      case "good":
        return { label: "EM EVOLUÇÃO", variant: "good" as const };
      case "stable":
        return { label: "ESTÁVEL", variant: "neutral" as const };
      case "difficult":
        return { label: "DIFÍCIL", variant: "warning" as const };
      case "disaster":
        return { label: "CRÍTICO", variant: "critical" as const };
      default:
        return { label: "ESTÁVEL", variant: "neutral" as const };
    }
  };

  const moodBadge = getMoodBadge(metadata.mood);
  const eloSign = overview.eloChangeGroup >= 0 ? "+" : "";
  const isEloPositive = overview.eloChangeGroup >= 0;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 sm:px-6">
      {/* Header */}
      <FadeIn>
        <div className="surface-panel rounded-sm border border-border/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-widest text-primary uppercase">
                DETALHES DA SESSÃO
              </span>
              <TacticalBadge variant={moodBadge.variant} size="sm">
                {moodBadge.label}
              </TacticalBadge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-2.5">
              <Swords className="size-6 text-primary shrink-0" />
              {metadata.name}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-muted-foreground/80">
              Registrada em {new Date(metadata.date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface-deck border border-border/60">
              <span className="text-[10px] font-mono uppercase text-muted-foreground/70">
                Sinergia:
              </span>
              <span className="font-mono text-xs font-black text-foreground tabular-nums">
                {overview.teamSynergy}%
              </span>
            </div>

            {overview.eloChangeGroup !== 0 && (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-xs font-black border",
                  isEloPositive
                    ? "text-status-good border-status-good/30 bg-status-good/10"
                    : "text-status-critical border-status-critical/30 bg-status-critical/10"
                )}
              >
                {isEloPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {eloSign}{overview.eloChangeGroup} ELO
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* KPI Ribbon */}
      <FadeIn delay={0.04}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              Partidas Disputadas
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                {overview.totalMatches}
              </span>
              <span className="text-xs font-mono font-bold text-muted-foreground/70">
                ({overview.wins}V - {overview.losses}D)
              </span>
            </div>
          </div>

          <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              Aproveitamento
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-mono text-2xl sm:text-3xl font-black tabular-nums",
                  overview.winrate >= 50 ? "text-status-good" : "text-status-critical"
                )}
              >
                {overview.winrate}%
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">winrate</span>
            </div>
          </div>

          <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              Rating Médio Coletivo
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-mono text-2xl sm:text-3xl font-black tabular-nums",
                  overview.ratingAvg >= 1.15
                    ? "text-status-good"
                    : overview.ratingAvg < 0.95
                    ? "text-status-critical"
                    : "text-foreground"
                )}
              >
                {overview.ratingAvg.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">Rating 2.0</span>
            </div>
          </div>

          <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              Saldo Líquido ELO
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-mono text-2xl sm:text-3xl font-black tabular-nums",
                  isEloPositive ? "text-status-good" : "text-status-critical"
                )}
              >
                {eloSign}{overview.eloChangeGroup}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">pontos</span>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Grid Central: Coluna da Esquerda (Scout/Tendências) & Coluna da Direita (Replay/Mapas/Leaderboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Lado Esquerdo (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Tendências da Noite */}
          <FadeIn delay={0.08}>
            <div className="surface-panel rounded-sm border border-border/40 p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <TrendingUp className="size-4 text-primary" />
                <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                  Tendências vs Histórico
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {trends.map((t) => {
                  const Icon = t.direction === "up" ? TrendingUp : t.direction === "down" ? TrendingDown : Minus;
                  const colorClass =
                    t.direction === "up"
                      ? "text-status-good bg-status-good/10 border-status-good/30"
                      : t.direction === "down"
                      ? "text-status-critical bg-status-critical/10 border-status-critical/30"
                      : "text-muted-foreground bg-surface-deck border-border/40";

                  return (
                    <div
                      key={t.metric}
                      className="p-3 border border-border/40 bg-surface-deck rounded-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-muted-foreground/70 uppercase font-bold block">
                          {t.label}
                        </span>
                        <span className="text-sm font-mono font-black text-foreground mt-0.5 block tabular-nums">
                          {t.value}
                        </span>
                      </div>
                      <div className={cn("p-1.5 rounded-xs border", colorClass)}>
                        <Icon className="size-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeIn>

          {/* Scout da Noite */}
          <FadeIn delay={0.1}>
            <div className="surface-panel rounded-sm border border-border/40 p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <Trophy className="size-4 text-accent-gold" />
                <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                  Scout da Noite
                </h3>
              </div>
              <div className="flex flex-col gap-2.5">
                {highlights.map((h) => (
                  <div
                    key={h.category}
                    className="flex items-center justify-between p-2.5 border border-border/40 bg-surface-deck rounded-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar nickname={h.playerName} avatarUrl={h.playerAvatar} size="sm" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-muted-foreground/70 uppercase font-bold block truncate">
                          {h.label}
                        </span>
                        <span className="text-xs font-bold text-foreground block truncate">
                          {h.playerName}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-black text-accent-cyan ml-2 shrink-0 tabular-nums">
                      {h.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Melhor Dupla */}
          {bestDuo && (
            <FadeIn delay={0.12}>
              <div className="surface-panel rounded-sm border border-border/40 p-4 sm:p-5 flex flex-col gap-3">
                <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
                  DUPLA DO SERVIDOR
                </span>
                <div className="p-3 border border-border/40 bg-surface-deck rounded-xs flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs">{bestDuo.playerAName}</span>
                      <span className="text-muted-foreground/40 text-xs font-mono">+</span>
                      <span className="font-bold text-foreground text-xs">{bestDuo.playerBName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                      Maior aproveitamento conjunto
                    </span>
                  </div>
                  <span className="font-mono text-sm font-black text-status-good tabular-nums">
                    {bestDuo.wins}V - {bestDuo.losses}D
                  </span>
                </div>
              </div>
            </FadeIn>
          )}
        </div>

        {/* Lado Direito (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Relatório Avançado do Coach IA */}
          <FadeIn delay={0.08}>
            <CoachReportCard apiUrl={`/api/coach/session/${metadata.id}`} />
          </FadeIn>

          {/* Replay da Sessão (Timeline de Partidas) */}
          <FadeIn delay={0.1}>
            <div className="surface-panel rounded-sm border border-border/40 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                    Replay da Sessão & Acontecimentos
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground/60">
                  {timeline.length} eventos registrados
                </span>
              </div>

              {timeline.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-muted-foreground/60">
                  Sem acontecimentos registrados na sessão.
                </div>
              ) : (
                <div className="relative pl-5 sm:pl-6 border-l border-border/40 flex flex-col gap-5 my-1 ml-2">
                  {timeline.map((event, idx) => {
                    const isMilestone = event.type === "milestone";
                    const isWin = event.outcome === "win";
                    const isLoss = event.outcome === "loss";

                    return (
                      <div key={idx} className="relative group">
                        {/* Indicador de Timeline */}
                        <span
                          className={cn(
                            "absolute -left-[25px] sm:-left-[29px] top-1.5 flex size-3.5 items-center justify-center rounded-xs border",
                            isMilestone
                              ? "bg-accent-violet border-accent-violet/50"
                              : isWin
                              ? "bg-status-good border-status-good/50"
                              : isLoss
                              ? "bg-status-critical border-status-critical/50"
                              : "bg-surface-deck border-border/80"
                          )}
                        />

                        {/* Conteúdo do Evento */}
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4
                              className={cn(
                                "text-xs font-mono font-bold",
                                isMilestone ? "text-accent-cyan" : "text-foreground"
                              )}
                            >
                              {event.title}
                            </h4>
                            {event.matchId && (
                              <Link
                                href={`/matches/${event.matchId}`}
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline font-bold shrink-0"
                              >
                                Ver Partida <ArrowRight className="size-3" />
                              </Link>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </FadeIn>

          {/* Desempenho por Mapa */}
          <FadeIn delay={0.12}>
            <div className="surface-panel rounded-sm border border-border/40 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <MapPin className="size-4 text-accent-cyan" />
                <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                  Aproveitamento por Mapa na Sessão
                </h3>
              </div>

              {maps.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-muted-foreground/60">
                  Sem dados de mapas disputados.
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs text-left border-collapse min-w-[480px]">
                    <thead>
                      <tr className="border-b border-border/40 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                        <th className="px-3 py-2 font-bold">Mapa</th>
                        <th className="px-3 py-2 font-bold text-center">Partidas</th>
                        <th className="px-3 py-2 font-bold text-right">Winrate</th>
                        <th className="px-3 py-2 font-bold w-1/3 text-center">Aproveitamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {maps.map((map) => (
                        <tr key={map.mapName} className="hover:bg-surface-elevated/40 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-bold text-foreground">
                            {map.mapName.replace(/^de_/i, "").toUpperCase()}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono tabular-nums text-muted-foreground">
                            {map.matchesPlayed}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-accent-cyan tabular-nums">
                            {map.winrate.toFixed(0)}%
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="h-2 w-full rounded-xs bg-surface-deck border border-border/40 overflow-hidden">
                              <div
                                style={{ width: `${map.winrate}%` }}
                                className="h-full bg-status-good"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </FadeIn>

          {/* Leaderboard da Sessão */}
          <FadeIn delay={0.14}>
            <div className="surface-panel rounded-sm border border-border/40 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <Trophy className="size-4 text-primary" />
                <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                  Performance Individual na Sessão
                </h3>
              </div>

              {players.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-muted-foreground/60">
                  Sem dados de jogadores.
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs text-left border-collapse min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border/40 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                        <th className="px-3 py-2 font-bold">Jogador</th>
                        <th className="px-3 py-2 font-bold text-center">Jogos</th>
                        <th className="px-3 py-2 font-bold text-right">Rating</th>
                        <th className="px-3 py-2 font-bold text-right">K/D</th>
                        <th className="px-3 py-2 font-bold text-right">ADR</th>
                        <th className="px-3 py-2 font-bold text-right">HS%</th>
                        <th className="px-3 py-2 font-bold text-right">ELO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {players.map((p) => {
                        const isEloPos = p.eloChange >= 0;
                        const eloColor = isEloPos ? "text-status-good" : "text-status-critical";

                        return (
                          <tr key={p.id} className="hover:bg-surface-elevated/40 transition-colors">
                            <td className="px-3 py-2.5">
                              <Link href={`/players/${p.id}`} className="flex items-center gap-2.5 group">
                                <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                                <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">
                                  {p.nickname}
                                </span>
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono tabular-nums text-muted-foreground">
                              {p.matchesPlayed}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold">
                              <RatingBadge rating={p.ratingAvg} />
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-medium text-foreground">
                              {p.kd.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-medium text-foreground">
                              {p.adrAvg.toFixed(1)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-medium text-muted-foreground">
                              {p.hsPercentage.toFixed(1)}%
                            </td>
                            <td className={cn("px-3 py-2.5 text-right font-mono font-black tabular-nums", eloColor)}>
                              {isEloPos ? "+" : ""}
                              {p.eloChange}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
