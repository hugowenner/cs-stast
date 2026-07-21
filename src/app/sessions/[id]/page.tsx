import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Gamepad2,
  Trophy,
  Percent,
  Crown,
  Award,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Flame,
  ShieldAlert,
  Sparkles,
  Zap,
  Target,
  Skull,
  UserCheck,
  Minus,
} from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { StatTile } from "@/components/ui/stat-tile";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingBadge } from "@/components/players/rating-badge";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { safeQuery } from "@/server/safeQuery";
import * as sessionService from "@/server/services/session.service";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const summary = await safeQuery(() => sessionService.getSessionSummary(id), null);
  if (!summary) notFound();

  const { metadata, overview, timeline, players, maps, highlights, trends, bestDuo, insights } = summary;

  // Humor Heuristics styling
  const getMoodConfig = (mood: string) => {
    switch (mood) {
      case "excellent":
        return { label: "Excelente Noite", emoji: "🔥", colorClass: "text-status-good border-status-good/20 bg-status-good/10 shadow-[0_0_12px_rgba(var(--status-good),0.15)]" };
      case "good":
        return { label: "Boa Noite", emoji: "🙂", colorClass: "text-accent-cyan border-accent-cyan/20 bg-accent-cyan/10" };
      case "stable":
        return { label: "Noite Estável", emoji: "😐", colorClass: "text-muted-foreground border-white/10 bg-white/5" };
      case "difficult":
        return { label: "Noite Difícil", emoji: "⚠", colorClass: "text-status-warning border-status-warning/20 bg-status-warning/10" };
      case "disaster":
        return { label: "Desastre total", emoji: "💀", colorClass: "text-status-critical border-status-critical/20 bg-status-critical/10 animate-pulse" };
      default:
        return { label: "Estável", emoji: "😐", colorClass: "text-muted-foreground" };
    }
  };

  const moodConfig = getMoodConfig(metadata.mood);

  // ELO indicator
  const eloSign = overview.eloChangeGroup >= 0 ? "+" : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <FadeIn>
        <PageHeader
          title={metadata.name}
          subtitle={`Noite de jogo registrada em ${new Date(metadata.date).toLocaleDateString("pt-BR")}`}
          icon={
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Gamepad2 className="size-6" />
            </div>
          }
          actions={
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${moodConfig.colorClass}`}>
                <span>{moodConfig.emoji}</span>
                <span>{moodConfig.label}</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-white border border-white/10">
                Sinergia: {overview.teamSynergy}%
              </span>
            </div>
          }
        />
      </FadeIn>

      {/* Grid de Visão Geral (Overview) */}
      <FadeIn delay={0.05} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Partidas (V/D/E)"
          value={`${overview.totalMatches} (${overview.wins}V-${overview.losses}D)`}
          icon={Gamepad2}
          accent="violet"
        />
        <StatTile
          label="Winrate da Sessão"
          value={`${overview.winrate}%`}
          icon={Percent}
          accent="cyan"
        />
        <StatTile
          label="Saldo ELO"
          value={`${eloSign}${overview.eloChangeGroup}`}
          icon={Zap}
          accent={overview.eloChangeGroup >= 0 ? "cyan" : "violet"}
        />
        <StatTile
          label="Rating Médio do Time"
          value={overview.ratingAvg.toFixed(2)}
          icon={Trophy}
          accent="violet"
        />
      </FadeIn>

      {/* Grid Central: Coluna da Esquerda (Destaques, Duplas) & Coluna da Direita (Replay, Insights, Mapas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Lado Esquerdo: Scout & Tendências (4 colunas) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Tendências da Noite */}
          <FadeIn delay={0.08}>
            <SectionCard title="Tendências vs Histórico">
              <div className="grid grid-cols-2 gap-3">
                {trends.map((t) => {
                  const Icon = t.direction === "up" ? TrendingUp : t.direction === "down" ? TrendingDown : Minus;
                  const colorClass = t.direction === "up" ? "text-status-good bg-status-good/10" : t.direction === "down" ? "text-status-critical bg-status-critical/10" : "text-muted-foreground bg-white/5";

                  return (
                    <div key={t.metric} className="p-3 border border-white/5 bg-white/[0.01] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          {t.label}
                        </span>
                        <span className="text-sm font-black text-white mt-1 block">
                          {t.value}
                        </span>
                      </div>
                      <div className={`p-1.5 rounded-lg ${colorClass}`}>
                        <Icon className="size-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </FadeIn>

          {/* Destaques da Noite (Scouting) */}
          <FadeIn delay={0.1}>
            <SectionCard title="Scout da Noite">
              <div className="flex flex-col gap-3">
                {highlights.map((h) => (
                  <div
                    key={h.category}
                    className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.01] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <PlayerAvatar nickname={h.playerName} avatarUrl={h.playerAvatar} size="sm" />
                      <div>
                        <span className="text-[10px] text-muted-foreground font-semibold block">
                          {h.label}
                        </span>
                        <span className="text-xs font-bold text-white mt-0.5 block">
                          {h.playerName}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-accent-cyan">{h.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </FadeIn>

          {/* Melhor Dupla e Compatibilidade */}
          {bestDuo && (
            <FadeIn delay={0.12}>
              <SectionCard title="Dupla do Servidor">
                <div className="p-4 border border-white/5 bg-white/[0.01] rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white text-sm">{bestDuo.playerAName}</span>
                      <span className="text-muted-foreground text-xs font-bold">+</span>
                      <span className="font-bold text-white text-sm">{bestDuo.playerBName}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Parceria com maior aproveitamento
                    </span>
                  </div>
                  <span className="text-base font-black text-status-good">
                    {bestDuo.wins}V - {bestDuo.losses}D
                  </span>
                </div>
              </SectionCard>
            </FadeIn>
          )}
        </div>

        {/* Lado Direito: Replay, Análise Coach, Mapas (8 colunas) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Relatório Avançado do Coach IA */}
          <FadeIn delay={0.08}>
            <CoachReportCard apiUrl={`/api/coach/session/${metadata.id}`} />
          </FadeIn>

          {/* Replay da Sessão (Timeline) */}
          <FadeIn delay={0.1}>
            <SectionCard title="Replay da Sessão (Timeline)">
              {timeline.length === 0 ? (
                <EmptyState message="Sem acontecimentos registrados na sessão." />
              ) : (
                <div className="relative pl-6 border-l border-white/10 flex flex-col gap-6 my-2">
                  {timeline.map((event, idx) => {
                    const isMilestone = event.type === "milestone";
                    const isWin = event.outcome === "win";
                    const isLoss = event.outcome === "loss";

                    return (
                      <div key={idx} className="relative">
                        {/* Indicador de Timeline */}
                        <span
                          className={`absolute -left-[31px] top-1.5 flex size-4 items-center justify-center rounded-full border ${
                            isMilestone
                              ? "bg-accent-violet border-accent-violet/30"
                              : isWin
                              ? "bg-status-good border-status-good/30"
                              : isLoss
                              ? "bg-status-critical border-status-critical/30"
                              : "bg-white/10 border-white/20"
                          }`}
                        />

                        {/* Conteúdo do Evento */}
                        <div className="min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-bold text-white ${isMilestone ? "text-accent-cyan" : ""}`}>
                              {event.title}
                            </h4>
                            {event.matchId && (
                              <Link
                                href={`/matches/${event.matchId}`}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                              >
                                Ver Detalhes <ArrowRight className="size-3" />
                              </Link>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </FadeIn>

          {/* Desempenho por Mapa */}
          <FadeIn delay={0.12}>
            <SectionCard title="Aproveitamento por Mapa">
              {maps.length === 0 ? (
                <EmptyState message="Sem dados de mapas disputados." />
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/15 text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-2.5 font-semibold">Mapa</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Jogos</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Winrate</th>
                        <th className="px-4 py-2.5 font-semibold w-1/3 text-center">Aproveitamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {maps.map((map) => (
                        <tr key={map.mapName} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-4 py-3 font-bold text-white">{map.mapName}</td>
                          <td className="px-4 py-3 text-center font-mono">{map.matchesPlayed}</td>
                          <td className="px-4 py-3 text-right font-bold text-accent-cyan">
                            {map.winrate.toFixed(0)}%
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                style={{ width: `${map.winrate}%` }}
                                className="h-full bg-status-good rounded-full"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </FadeIn>

          {/* Leaderboard da Sessão */}
          <FadeIn delay={0.14}>
            <SectionCard title="Performance dos Jogadores na Sessão">
              {players.length === 0 ? (
                <EmptyState message="Sem dados de jogadores." />
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/15 text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-2.5 font-semibold">Jogador</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Jogos</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Rating</th>
                        <th className="px-4 py-2.5 font-semibold text-right">KD</th>
                        <th className="px-4 py-2.5 font-semibold text-right">ADR</th>
                        <th className="px-4 py-2.5 font-semibold text-right">HS%</th>
                        <th className="px-4 py-2.5 font-semibold text-right">ELO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {players.map((p) => {
                        const isEloPositive = p.eloChange >= 0;
                        const eloColor = isEloPositive ? "text-status-good" : "text-status-critical";

                        return (
                          <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-4 py-3">
                              <Link href={`/players/${p.id}`} className="flex items-center gap-3 group">
                                <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                                <span className="font-bold text-white group-hover:text-primary transition-colors">
                                  {p.nickname}
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-center font-mono">{p.matchesPlayed}</td>
                            <td className="px-4 py-3 text-right">
                              <RatingBadge rating={p.ratingAvg} />
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium">
                              {p.kd.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium">
                              {p.adrAvg.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium">
                              {p.hsPercentage.toFixed(1)}%
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${eloColor}`}>
                              {isEloPositive ? "+" : ""}
                              {p.eloChange}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
