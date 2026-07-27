import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { SectionContainer } from "@/components/dashboard/section-container";
import { FORMA_STYLE } from "@/lib/forma";
import { prisma } from "@/server/db";
import { safeQuery } from "@/server/safeQuery";
import * as statsService from "@/server/services/stats.service";
import * as competitiveService from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";
import { ChevronRight, Users, Trophy, Activity, Calendar } from "lucide-react";

const METRICS = [
  { value: "rating", label: "Rating" },
  { value: "adr", label: "ADR" },
  { value: "kd", label: "K/D" },
  { value: "impact", label: "Impacto" },
  { value: "kast", label: "KAST" },
  { value: "consistency", label: "Consistência" },
  { value: "evolution", label: "Evolução" },
  { value: "elo", label: "Hub ELO" },
  { value: "hs", label: "HS%" },
  { value: "entry", label: "Entry Kills" },
] as const;

type Metric = (typeof METRICS)[number]["value"];

const METRIC_INFOS: Record<Metric, { explanation: string; icon: string }> = {
  rating: { explanation: "Indicador geral de performance considerando impacto individual e resultado de rounds.", icon: "📈" },
  adr: { explanation: "Dano médio causado por round (Average Damage per Round).", icon: "💥" },
  kd: { explanation: "Relação acumulada entre eliminações e mortes (Kills/Deaths).", icon: "🎯" },
  impact: { explanation: "Métrica que mede a influência de multikills, opening kills e clutches ganhos.", icon: "⚡" },
  kast: { explanation: "Porcentagem de rounds com Kill, Assist, Survival ou Trade.", icon: "🤝" },
  consistency: { explanation: "Porcentagem de partidas em que o jogador obteve Rating ≥ 1.0 (mín. 3 partidas).", icon: "🛡️" },
  evolution: { explanation: "Desempenho das últimas 5 partidas em relação à média geral do jogador na temporada.", icon: "🚀" },
  elo: { explanation: "Pontuação interna do Hub ELO baseada em vitórias e derrotas.", icon: "👑" },
  hs: { explanation: "Porcentagem de abates que foram headshots (mín. 3 partidas).", icon: "💀" },
  entry: { explanation: "Média de primeiros abates (Entry Kills) obtidos por partida (mín. 3 partidas).", icon: "⚔️" },
};

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === "consistency" || metric === "hs") {
    return `${value}%`;
  }
  if (metric === "evolution") {
    return `${value > 0 ? "+" : ""}${value}%`;
  }
  if (metric === "rating" || metric === "kd") {
    return value.toFixed(2);
  }
  return value.toString();
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string }>;
}) {
  const { metric: rawMetric } = await searchParams;
  const metric = (METRICS.some((m) => m.value === rawMetric) ? rawMetric : "rating") as Metric;

  // Carrega o ranking com base na métrica selecionada
  const ranking = await safeQuery(
    () =>
      metric === "elo"
        ? statsService.getEloRanking(50)
        : metric === "kd"
          ? statsService.getKdRanking(50)
          : metric === "consistency"
            ? statsService.getConsistencyRanking(50)
            : metric === "evolution"
              ? statsService.getEvolutionRanking(50)
              : metric === "hs"
                ? statsService.getHsRanking(50)
                : metric === "entry"
                  ? statsService.getEntryKillsRanking(50)
                  : statsService.getRanking(metric, 50),
    [],
  );

  // Busca os metadados dinâmicos da temporada
  const totalPlayers = await prisma.player.count({
    where: { trackedPlayer: { active: true } },
  });
  const totalMatches = await prisma.match.count();

  // Carrega o bundle de competições do Dashboard para manter consistência dos badges de forma
  const dataset = await competitiveService.loadCompetitiveDataset();
  const bundle = await competitiveService.getDashboardCompetitiveBundle(dataset);
  const monitoredByPlayerId = new Map(bundle.monitoredPlayers.map((p) => [p.player.id, p]));

  // Divide o ranking em líderes (Top 3) e o restante
  const top3 = ranking.slice(0, 3);
  const listPlayers = ranking.slice(3);

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <PageHeader title="🏆 Rankings" subtitle="Classificação competitiva do time na temporada atual" />
      </FadeIn>

      {/* Indicadores Dinâmicos de Temporada */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel border-white/[0.06] p-4 rounded-xl flex items-center gap-3">
            <Users className="size-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50">Jogadores Ranqueados</p>
              <p className="text-lg font-black text-white mt-0.5">{totalPlayers} monitorados</p>
            </div>
          </div>
          <div className="glass-panel border-white/[0.06] p-4 rounded-xl flex items-center gap-3">
            <Trophy className="size-5 text-status-warning shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50">Partidas Analisadas</p>
              <p className="text-lg font-black text-white mt-0.5">{totalMatches} partidas</p>
            </div>
          </div>
          <div className="glass-panel border-white/[0.06] p-4 rounded-xl flex items-center gap-3">
            <Calendar className="size-5 text-accent-violet shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50">Temporada Ativa</p>
              <p className="text-lg font-black text-white mt-0.5">2026 - Season 1</p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Seletor de Métricas (Tabs Horizontais) */}
      <FadeIn delay={0.1}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none whitespace-nowrap flex-nowrap shrink-0 border-b border-white/[0.04]">
            {METRICS.map((m) => (
              <Link
                key={m.value}
                href={`/rankings?metric=${m.value}`}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold transition-all border",
                  metric === m.value
                    ? "bg-primary text-black border-primary font-black shadow-[0_0_12px_0_rgba(var(--primary-rgb),0.15)]"
                    : "text-muted-foreground/75 border-white/[0.06] bg-white/[0.02] hover:text-white hover:border-white/[0.12] hover:bg-white/[0.04]",
                )}
              >
                {m.label}
              </Link>
            ))}
          </div>

          {/* Descrição Dinâmica da Métrica */}
          <div className="glass-panel rounded-2xl border border-white/[0.06] p-4 bg-white/[0.01] flex items-start gap-3">
            <span className="text-xl shrink-0 leading-none">{METRIC_INFOS[metric].icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white uppercase tracking-wider">{METRICS.find((m) => m.value === metric)?.label}</p>
              <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{METRIC_INFOS[metric].explanation}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <SectionContainer
        title={`Classificação por ${METRICS.find((m) => m.value === metric)?.label}`}
        subtitle="Quadro de liderança atualizado em tempo real"
        delay={0.15}
      >
        {ranking.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-white/[0.06] p-12 text-center">
            <Trophy className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/50">Sem dados suficientes ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Pódio Top 3 */}
            {top3.length >= 3 && (
              <div className="flex flex-col md:grid md:grid-cols-3 gap-4 items-end mb-2 pt-4">
                {/* 2º Lugar (Renderiza à esquerda no desktop) */}
                {(() => {
                  const entry = top3[1];
                  if (!entry || !entry.player) return null;
                  const forma = monitoredByPlayerId.get(entry.player.id)?.forma;
                  const formaStyle = forma ? FORMA_STYLE[forma] : null;
                  const FormaIcon = formaStyle?.icon;

                  return (
                    <Link
                      href={`/players/${entry.player.id}`}
                      className="glass-panel card-hover border-white/20 bg-white/[0.01] p-5 rounded-2xl flex flex-col items-center text-center gap-3 order-2 md:order-1 w-full"
                    >
                      <span className="text-3xl leading-none">🥈</span>
                      <div className="relative">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="md" />
                        <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-white/15 text-white leading-none px-1.5 py-0.5 rounded-full border border-white/20">
                          #2
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate leading-snug">{entry.player.nickname}</p>
                        {entry.player.levelGc && (
                          <p className="text-[9px] text-muted-foreground/50 font-semibold mt-0.5">GC Nível {entry.player.levelGc}</p>
                        )}
                      </div>
                      {formaStyle && FormaIcon && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${formaStyle.bg} ${formaStyle.border} ${formaStyle.color}`}>
                          <FormaIcon className="size-2.5" />
                          {formaStyle.text}
                        </span>
                      )}
                      <div className="mt-1">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">
                          {METRICS.find((m) => m.value === metric)?.label}
                        </p>
                        <p className="text-2xl font-black text-white mt-1.5 leading-none tabular-nums">
                          {formatMetricValue(entry.value, metric)}
                        </p>
                      </div>
                    </Link>
                  );
                })()}

                {/* 1º Lugar (Destaque Principal no Centro) */}
                {(() => {
                  const entry = top3[0];
                  if (!entry || !entry.player) return null;
                  const forma = monitoredByPlayerId.get(entry.player.id)?.forma;
                  const formaStyle = forma ? FORMA_STYLE[forma] : null;
                  const FormaIcon = formaStyle?.icon;

                  return (
                    <Link
                      href={`/players/${entry.player.id}`}
                      className="glass-panel card-hover border-status-warning/45 shadow-[0_0_20px_0_rgba(245,158,11,0.12)] bg-status-warning/[0.01] p-6 rounded-2xl flex flex-col items-center text-center gap-4 relative order-1 md:order-2 md:scale-105 border-2 w-full"
                    >
                      <span className="text-4xl leading-none">🥇</span>
                      <div className="relative">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="lg" />
                        <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-status-warning text-black leading-none px-2 py-0.5 rounded-full border border-status-warning/40">
                          #1
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-white truncate leading-snug">{entry.player.nickname}</p>
                        {entry.player.levelGc && (
                          <p className="text-[10px] text-muted-foreground/55 font-semibold mt-0.5">GC Nível {entry.player.levelGc}</p>
                        )}
                      </div>
                      {formaStyle && FormaIcon && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${formaStyle.bg} ${formaStyle.border} ${formaStyle.color}`}>
                          <FormaIcon className="size-2.5" />
                          {formaStyle.text}
                        </span>
                      )}
                      <div className="mt-1">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/55">
                          {METRICS.find((m) => m.value === metric)?.label}
                        </p>
                        <p className="text-3xl font-black text-white mt-1.5 leading-none tabular-nums">
                          {formatMetricValue(entry.value, metric)}
                        </p>
                      </div>
                    </Link>
                  );
                })()}

                {/* 3º Lugar (Renderiza à direita no desktop) */}
                {(() => {
                  const entry = top3[2];
                  if (!entry || !entry.player) return null;
                  const forma = monitoredByPlayerId.get(entry.player.id)?.forma;
                  const formaStyle = forma ? FORMA_STYLE[forma] : null;
                  const FormaIcon = formaStyle?.icon;

                  return (
                    <Link
                      href={`/players/${entry.player.id}`}
                      className="glass-panel card-hover border-[#d9772b]/30 bg-white/[0.01] p-5 rounded-2xl flex flex-col items-center text-center gap-3 order-3 w-full"
                    >
                      <span className="text-3xl leading-none">🥉</span>
                      <div className="relative">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="md" />
                        <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-[#d9772b]/15 text-[#d9772b] leading-none px-1.5 py-0.5 rounded-full border border-[#d9772b]/25">
                          #3
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate leading-snug">{entry.player.nickname}</p>
                        {entry.player.levelGc && (
                          <p className="text-[9px] text-muted-foreground/50 font-semibold mt-0.5">GC Nível {entry.player.levelGc}</p>
                        )}
                      </div>
                      {formaStyle && FormaIcon && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${formaStyle.bg} ${formaStyle.border} ${formaStyle.color}`}>
                          <FormaIcon className="size-2.5" />
                          {formaStyle.text}
                        </span>
                      )}
                      <div className="mt-1">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">
                          {METRICS.find((m) => m.value === metric)?.label}
                        </p>
                        <p className="text-2xl font-black text-white mt-1.5 leading-none tabular-nums">
                          {formatMetricValue(entry.value, metric)}
                        </p>
                      </div>
                    </Link>
                  );
                })()}
              </div>
            )}

            {/* Listagem Geral (Restante dos Jogadores) */}
            <div className="glass-panel rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col">
              {listPlayers.length === 0 && top3.length < 3 ? (
                // Exibe todo o ranking em tabela se houver menos de 3 jogadores
                ranking.map((entry, index) => {
                  if (!entry.player) return null;
                  const position = index + 1;
                  const forma = monitoredByPlayerId.get(entry.player.id)?.forma;
                  const formaStyle = forma ? FORMA_STYLE[forma] : null;
                  const FormaIcon = formaStyle?.icon;

                  return (
                    <Link
                      key={entry.player.id}
                      href={`/players/${entry.player.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-b-0 group"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums bg-white/5 border border-white/10 text-muted-foreground/75">
                        {position}
                      </span>
                      <div className="shrink-0">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-bold text-white text-sm group-hover:text-primary transition-colors truncate">
                          {entry.player.nickname}
                        </span>
                        {entry.player.levelGc !== null && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/[0.04] border border-white/10 rounded text-muted-foreground/60 w-max mt-0.5 sm:mt-0">
                            LVL {entry.player.levelGc}
                          </span>
                        )}
                      </div>
                      {formaStyle && FormaIcon && (
                        <div className="shrink-0 hidden sm:block">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${formaStyle.bg} ${formaStyle.border} ${formaStyle.color}`}>
                            <FormaIcon className="size-2.5" />
                            {formaStyle.text}
                          </span>
                        </div>
                      )}
                      <div className="shrink-0 text-right min-w-[70px]">
                        <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">
                          {METRICS.find((m) => m.value === metric)?.label}
                        </p>
                        <p className="text-sm font-black text-white tabular-nums mt-0.5">
                          {formatMetricValue(entry.value, metric)}
                        </p>
                      </div>
                      <div className="shrink-0 pl-1">
                        <ChevronRight className="size-3.5 text-muted-foreground/30 group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  );
                })
              ) : (
                // Exibe os demais colocados a partir do 4º lugar
                listPlayers.map((entry, index) => {
                  if (!entry.player) return null;
                  const position = index + 4;
                  const forma = monitoredByPlayerId.get(entry.player.id)?.forma;
                  const formaStyle = forma ? FORMA_STYLE[forma] : null;
                  const FormaIcon = formaStyle?.icon;

                  return (
                    <Link
                      key={entry.player.id}
                      href={`/players/${entry.player.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-b-0 group"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums bg-white/5 border border-white/10 text-muted-foreground/75">
                        {position}
                      </span>
                      <div className="shrink-0">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-bold text-white text-sm group-hover:text-primary transition-colors truncate">
                          {entry.player.nickname}
                        </span>
                        {entry.player.levelGc !== null && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/[0.04] border border-white/10 rounded text-muted-foreground/60 w-max mt-0.5 sm:mt-0">
                            LVL {entry.player.levelGc}
                          </span>
                        )}
                      </div>
                      {formaStyle && FormaIcon && (
                        <div className="shrink-0 hidden sm:block">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${formaStyle.bg} ${formaStyle.border} ${formaStyle.color}`}>
                            <FormaIcon className="size-2.5" />
                            {formaStyle.text}
                          </span>
                        </div>
                      )}
                      <div className="shrink-0 text-right min-w-[70px]">
                        <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">
                          {METRICS.find((m) => m.value === metric)?.label}
                        </p>
                        <p className="text-sm font-black text-white tabular-nums mt-0.5">
                          {formatMetricValue(entry.value, metric)}
                        </p>
                      </div>
                      <div className="shrink-0 pl-1">
                        <ChevronRight className="size-3.5 text-muted-foreground/30 group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </SectionContainer>
    </div>
  );
}
