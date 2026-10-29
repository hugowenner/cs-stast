"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Calendar,
  Layers,
  Users,
  ArrowUpRight,
  Star,
  AlertTriangle,
  Sparkles,
  Flame,
  MapPin,
} from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import type {
  GroupRadarBundle,
  SquadMomentumInfo,
  SessionPaceInfo,
  MatchCompositionInfo,
  RecentParticipationInfo,
  FeaturedPlayerInfo,
  PeriodFactInfo,
  AttentionPointInfo,
  JogadorDaSemanaInfo,
  WeeklyCuriosity,
  SmartAlert,
} from "@/server/services/competitive.service";

export interface RadarDaTemporadaProps {
  radar?: GroupRadarBundle | null;
  jogadorDaSemana?: JogadorDaSemanaInfo | null;
  weeklyCuriosity?: WeeklyCuriosity | null;
  smartAlerts?: SmartAlert[];
}

// ─── CARD 1: MOMENTO COLETIVO ────────────────────────────────────────────────
function MomentoColetivoCard({ momentum }: { momentum: SquadMomentumInfo }) {
  if (momentum.eligibleMatchesCount === 0 || !momentum.recentBlock) {
    return (
      <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-border/50 rounded-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="size-4 text-muted-foreground/70 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
              Momento Coletivo
            </span>
          </div>
          <TacticalBadge label="SEM REGISTRO" variant="neutral" size="xs" />
        </div>
        <div className="py-4 text-center">
          <p className="text-sm font-bold text-foreground">Sem partidas coletivas</p>
          <p className="text-xs font-mono text-muted-foreground/80 mt-1">
            {momentum.emptyReason ?? "Nenhuma partida com 2+ monitorados no mesmo time."}
          </p>
        </div>
        <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/70 text-center">
          Mínimo de 2 monitorados no mesmo time
        </div>
      </div>
    );
  }

  const { recentBlock, previousBlock, diffPp, hasComparison, sampleStatus } = momentum;
  const badgeVariant =
    sampleStatus === "insufficient"
      ? "neutral"
      : diffPp !== null && diffPp > 0
      ? "good"
      : diffPp !== null && diffPp < 0
      ? "warning"
      : "neutral";

  const badgeLabel =
    sampleStatus === "insufficient"
      ? `${momentum.eligibleMatchesCount}/10 PARTIDAS`
      : sampleStatus === "partial"
      ? "AMOSTRA PARCIAL"
      : diffPp !== null && diffPp > 0
      ? "EM ALTA"
      : diffPp !== null && diffPp < 0
      ? "EM BAIXA"
      : "ESTÁVEL";

  const roundDiffSign = recentBlock.roundDiff > 0 ? "+" : "";

  return (
    <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 bg-surface-panel border border-border/60 hover:border-border transition-colors rounded-sm relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="size-4 text-primary shrink-0" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-foreground/90 truncate">
            Momento Coletivo
          </span>
        </div>
        <TacticalBadge label={badgeLabel} variant={badgeVariant} size="xs" />
      </div>

      {/* Main Metric */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
            <AnimatedNumber value={recentBlock.winrate} decimals={0} suffix="%" />
          </span>
          <span className="text-xs font-mono text-muted-foreground font-semibold">
            {recentBlock.wins}V – {recentBlock.losses}D {recentBlock.ties > 0 ? `– ${recentBlock.ties}E` : ""}
          </span>
        </div>

        {/* Saldo de rounds */}
        <div className="mt-1 flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span>
            Saldo:{" "}
            <strong className={recentBlock.roundDiff >= 0 ? "text-status-good" : "text-status-warning"}>
              {roundDiffSign}
              {recentBlock.roundDiff}
            </strong>
          </span>
          <span className="text-muted-foreground/60">
            ({recentBlock.roundsFor} pró / {recentBlock.roundsAgainst} contra)
          </span>
        </div>

        {/* Comparação */}
        <div className="mt-3 pt-2.5 border-t border-border/40 text-xs font-mono">
          {hasComparison && diffPp !== null && previousBlock ? (
            <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
              <span className="text-muted-foreground/90 shrink-0">
                vs 10 anteriores ({previousBlock.winrate.toFixed(0)}%):
              </span>
              <span
                className={`font-black tabular-nums shrink-0 ${
                  diffPp > 0
                    ? "text-status-good"
                    : diffPp < 0
                    ? "text-status-warning"
                    : "text-muted-foreground"
                }`}
              >
                {diffPp > 0 ? "+" : ""}
                {diffPp.toFixed(1).replace(".", ",")} p.p.
              </span>
            </div>
          ) : sampleStatus === "partial" ? (
            <p className="text-muted-foreground/80 leading-snug">
              Sem comparação (necessário 20 partidas para dois blocos).
            </p>
          ) : (
            <p className="text-muted-foreground/80 leading-snug">
              Amostra em formação ({momentum.eligibleMatchesCount} de 10 partidas).
            </p>
          )}
        </div>
      </div>

      {/* Footer Info & Link */}
      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>
          {recentBlock.startDate && recentBlock.endDate
            ? `${recentBlock.startDate} a ${recentBlock.endDate}`
            : `${momentum.eligibleMatchesCount} partidas`}
        </span>
        <Link
          href="/sessions"
          className="hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xs transition-colors flex items-center gap-1 font-semibold"
        >
          Sessões <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── CARD 2: RITMO DE SESSÕES ────────────────────────────────────────────────
function RitmoDeSessoesCard({ pace }: { pace: SessionPaceInfo }) {
  if (pace.totalEligibleSessions === 0 || !pace.latestSession) {
    return (
      <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-border/50 rounded-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="size-4 text-muted-foreground/70 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
              Ritmo de Sessões
            </span>
          </div>
          <TacticalBadge label="SEM SESSÕES" variant="neutral" size="xs" />
        </div>
        <div className="py-4 text-center">
          <p className="text-sm font-bold text-foreground">Sem sessões registradas</p>
          <p className="text-xs font-mono text-muted-foreground/80 mt-1">
            {pace.emptyReason ?? "Nenhuma sessão com partidas no período."}
          </p>
        </div>
        <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/70 text-center">
          Agrupamento diário UTC
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 bg-surface-panel border border-border/60 hover:border-border transition-colors rounded-sm relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="size-4 text-primary shrink-0" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-foreground/90 truncate">
            Ritmo de Sessões
          </span>
        </div>
        <TacticalBadge label="DIA UTC" variant="neutral" size="xs" />
      </div>

      {/* Main Metric */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
            <AnimatedNumber value={pace.totalEligibleSessions} decimals={0} />
          </span>
          <span className="text-xs font-mono text-muted-foreground font-semibold">
            sessões registradas
          </span>
        </div>

        <div className="mt-1 text-xs font-mono text-muted-foreground">
          Média de{" "}
          <strong className="text-foreground">
            {pace.averageMatchesPerSession.toFixed(1).replace(".", ",")}
          </strong>{" "}
          partidas por sessão coletiva
        </div>

        {/* Última Sessão Box */}
        <div className="mt-3 pt-2.5 border-t border-border/40 text-xs font-mono">
          <div className="flex items-center justify-between gap-1 text-[11px]">
            <span className="text-muted-foreground/90 font-semibold truncate">
              {pace.latestSession.name}
            </span>
            <span className="text-primary font-bold shrink-0">
              {pace.latestSession.eligibleMatchesCount} partidas
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Última às {pace.latestSession.latestMatchTimeFormatted}
          </div>
        </div>
      </div>

      {/* Footer Info & Link */}
      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span title="Session agrupa partidas pelo dia UTC de início da partida">
          {pace.totalEligibleMatches} partidas no mesmo time
        </span>
        <Link
          href="/sessions"
          className="hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xs transition-colors flex items-center gap-1 font-semibold"
        >
          Histórico <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── CARD 3: COMPOSIÇÃO DAS PARTIDAS ─────────────────────────────────────────
function ComposicaoPartidasCard({ composition }: { composition: MatchCompositionInfo }) {
  if (composition.totalUniverse === 0) {
    return (
      <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-border/50 rounded-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="size-4 text-muted-foreground/70 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
              Composição das Partidas
            </span>
          </div>
          <TacticalBadge label="SEM DADOS" variant="neutral" size="xs" />
        </div>
        <div className="py-4 text-center">
          <p className="text-sm font-bold text-foreground">Sem partidas no universo</p>
          <p className="text-xs font-mono text-muted-foreground/80 mt-1">
            {composition.emptyReason ?? "Nenhuma partida monitorada no período."}
          </p>
        </div>
        <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/70 text-center">
          Universo total de partidas
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 bg-surface-panel border border-border/60 hover:border-border transition-colors rounded-sm relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="size-4 text-primary shrink-0" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-foreground/90 truncate">
            Composição das Partidas
          </span>
        </div>
        <TacticalBadge
          label={`${composition.teamPercentage.toFixed(1).replace(".", ",")}% MESMO TIME`}
          variant="primary"
          size="xs"
        />
      </div>

      {/* Main Metric & Stacked Bar */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
            <AnimatedNumber value={composition.teamPercentage} decimals={1} suffix="%" />
          </span>
          <span className="text-xs font-mono text-muted-foreground font-semibold">
            no mesmo time ({composition.teamCount} de {composition.totalUniverse})
          </span>
        </div>

        {/* Stacked Proportional Bar */}
        <div
          className="mt-2.5 h-2 w-full bg-surface-base rounded-xs overflow-hidden flex"
          title={`5 no mesmo time: ${composition.fullTeamPercentage}% | 2 a 4: ${composition.smallTeamPercentage}% | Solo: ${composition.soloPercentage}% | Confrontos: ${composition.confrontationPercentage}%`}
        >
          <div
            style={{ width: `${composition.fullTeamPercentage}%` }}
            className="bg-amber-400 h-full"
            title={`5 no mesmo time: ${composition.fullTeamCount} (${composition.fullTeamPercentage}%)`}
          />
          <div
            style={{ width: `${composition.smallTeamPercentage}%` }}
            className="bg-orange-500 h-full"
            title={`2 a 4 no mesmo time: ${composition.smallTeamCount} (${composition.smallTeamPercentage}%)`}
          />
          <div
            style={{ width: `${composition.soloPercentage}%` }}
            className="bg-zinc-600 h-full"
            title={`Solo (1 monitorado): ${composition.soloCount} (${composition.soloPercentage}%)`}
          />
          {composition.confrontationPercentage > 0 && (
            <div
              style={{ width: `${composition.confrontationPercentage}%` }}
              className="bg-rose-500 h-full"
              title={`Confronto interno: ${composition.confrontationCount} (${composition.confrontationPercentage}%)`}
            />
          )}
          {composition.otherCount > 0 && (
            <div
              style={{ width: `${(composition.otherCount / composition.totalUniverse) * 100}%` }}
              className="bg-amber-600 h-full"
              title={`Outras situações: ${composition.otherCount}`}
            />
          )}
        </div>

        {/* Legend / Breakdown */}
        <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1 text-[10px] sm:text-[11px] font-mono">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground truncate">
              <span className="size-2 rounded-xs bg-amber-400 inline-block shrink-0" />
              5 no mesmo time:
            </span>
            <span className="font-semibold tabular-nums text-foreground shrink-0 ml-1.5">
              {composition.fullTeamCount}{" "}
              <span className="text-muted-foreground font-normal">
                ({composition.fullTeamPercentage.toFixed(1).replace(".", ",")}%)
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground truncate">
              <span className="size-2 rounded-xs bg-orange-500 inline-block shrink-0" />
              2 a 4 no mesmo time:
            </span>
            <span className="font-semibold tabular-nums text-foreground shrink-0 ml-1.5">
              {composition.smallTeamCount}{" "}
              <span className="text-muted-foreground font-normal">
                ({composition.smallTeamPercentage.toFixed(1).replace(".", ",")}%)
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground truncate">
              <span className="size-2 rounded-xs bg-zinc-600 inline-block shrink-0" />
              Solo (1 monitorado):
            </span>
            <span className="font-semibold tabular-nums text-foreground shrink-0 ml-1.5">
              {composition.soloCount}{" "}
              <span className="text-muted-foreground font-normal">
                ({composition.soloPercentage.toFixed(1).replace(".", ",")}%)
              </span>
            </span>
          </div>

          {composition.confrontationCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                <span className="size-2 rounded-xs bg-rose-500 inline-block shrink-0" />
                Confronto interno:
              </span>
              <span className="font-semibold tabular-nums text-foreground shrink-0 ml-1.5">
                {composition.confrontationCount}{" "}
                <span className="text-muted-foreground font-normal">
                  ({composition.confrontationPercentage.toFixed(1).replace(".", ",")}%)
                </span>
              </span>
            </div>
          )}

          {composition.otherCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                <span className="size-2 rounded-xs bg-amber-600 inline-block shrink-0" />
                Outras classificações:
              </span>
              <span className="font-semibold tabular-nums text-foreground shrink-0 ml-1.5">
                {composition.otherCount}{" "}
                <span className="text-muted-foreground font-normal">
                  ({((composition.otherCount / composition.totalUniverse) * 100).toFixed(1).replace(".", ",")}%)
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>Universo total</span>
        <span className="font-semibold text-foreground/80">
          {composition.totalUniverse} partidas (100%)
        </span>
      </div>
    </div>
  );
}

// ─── CARD 4: PARTICIPAÇÃO RECENTE ────────────────────────────────────────────
function ParticipacaoRecenteCard({
  participation,
}: {
  participation: RecentParticipationInfo;
}) {
  if (participation.totalActiveMonitored === 0) {
    return (
      <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-border/50 rounded-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="size-4 text-muted-foreground/70 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
              Participação Recente
            </span>
          </div>
          <TacticalBadge label="SEM REGISTRO" variant="neutral" size="xs" />
        </div>
        <div className="py-4 text-center">
          <p className="text-sm font-bold text-foreground">Sem jogadores ativos</p>
          <p className="text-xs font-mono text-muted-foreground/80 mt-1">
            {participation.emptyReason ?? "Nenhum jogador monitorado encontrado."}
          </p>
        </div>
        <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/70 text-center">
          Janela dos últimos 7 dias
        </div>
      </div>
    );
  }

  const activePercent =
    participation.totalActiveMonitored > 0
      ? (participation.activeCount / participation.totalActiveMonitored) * 100
      : 0;

  const maxDisplayAvatars = 8;
  const displayedPlayers = participation.participatingPlayers.slice(0, maxDisplayAvatars);
  const remainingCount = participation.participatingPlayers.length - maxDisplayAvatars;

  return (
    <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 bg-surface-panel border border-border/60 hover:border-border transition-colors rounded-sm relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="size-4 text-primary shrink-0" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-foreground/90 truncate">
            Participação Recente
          </span>
        </div>
        <TacticalBadge label="ÚLTIMOS 7 DIAS" variant="info" size="xs" />
      </div>

      {/* Main Metric */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
            {participation.activeCount} de {participation.totalActiveMonitored}
          </span>
          <span className="text-xs font-mono text-muted-foreground font-semibold">
            monitorados participaram
          </span>
        </div>

        <div className="mt-1 text-xs font-mono text-muted-foreground">
          <strong className="text-foreground">
            {activePercent.toFixed(1).replace(".", ",")}
          </strong>
          % de participação no grupo ({participation.windowStartDate} a {participation.windowEndDate})
        </div>

        {/* Compact Avatars Row */}
        <div className="mt-3 pt-2.5 border-t border-border/40">
          {displayedPlayers.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {displayedPlayers.map((p) => (
                <div
                  key={p.id}
                  title={`${p.nickname}: ${p.matchesCount} partidas nos últimos 7 dias`}
                  className="relative transition-transform hover:scale-110"
                >
                  <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="xs" />
                </div>
              ))}
              {remainingCount > 0 && (
                <span className="text-[10px] font-mono font-bold text-muted-foreground px-1 py-0.5 bg-surface-base border border-border/50 rounded-xs">
                  +{remainingCount}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs font-mono text-muted-foreground/80">
              Nenhum monitorado jogou na janela de 7 dias.
            </p>
          )}

          {participation.latestMatchPlayedAt && (
            <div className="mt-2 text-[10px] font-mono text-muted-foreground">
              Última partida:{" "}
              {new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Sao_Paulo",
              }).format(new Date(participation.latestMatchPlayedAt))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info & Link */}
      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>Janela de 7 dias</span>
        <Link
          href="/players"
          className="hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xs transition-colors flex items-center gap-1 font-semibold"
        >
          Jogadores <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── LEGACY CARDS (FALLBACK PARA SNAPSHOTS HISTÓRICOS) ────────────────────────
function JogadorEmDestaqueCard({
  featured,
  emptyReason,
}: {
  featured: FeaturedPlayerInfo | null;
  emptyReason: string | null;
}) {
  if (!featured) {
    return (
      <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-border/50 rounded-sm lg:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Star className="size-4 text-muted-foreground/60 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
              Jogador em Destaque
            </span>
          </div>
          <TacticalBadge label="SEM ELEGÍVEL" variant="neutral" size="xs" />
        </div>
        <div className="py-4 text-center">
          <p className="text-sm font-bold text-foreground">Sem jogador elegível</p>
          <p className="text-xs font-mono text-muted-foreground/85 mt-1 max-w-md mx-auto">
            {emptyReason ?? "São necessárias pelo menos 5 partidas com rating no período."}
          </p>
        </div>
        <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/80 text-center">
          Critério: pelo menos 5 partidas válidas com rating no período selecionado
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-amber-500/30 rounded-sm lg:col-span-2 relative overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Star className="size-4 text-amber-400 shrink-0 fill-amber-400/20" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-amber-400 truncate">
            Jogador em Destaque
          </span>
        </div>
        <TacticalBadge label="MAIOR RATING" variant="gold" size="xs" />
      </div>

      <div className="flex items-center gap-3.5">
        <PlayerAvatar
          nickname={featured.player.nickname}
          avatarUrl={featured.player.avatarUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/players/${featured.player.id}`}
            className="text-lg font-black text-foreground hover:text-primary transition-micro block truncate leading-tight"
          >
            {featured.player.nickname}
          </Link>
          <p className="text-[11px] font-mono text-muted-foreground/90 mt-1 leading-snug">
            {featured.justification}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-border/40">
        <div>
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block">
            RATING MÉDIO
          </span>
          <span className="font-mono text-xl sm:text-2xl font-black text-foreground mt-0.5 tabular-nums block">
            <AnimatedNumber value={featured.rating} decimals={2} />
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/85 block mt-0.5 truncate font-medium">
            {featured.matchCount} partidas com rating
          </span>
        </div>

        <div className="border-y sm:border-y-0 sm:border-x border-border/30 py-2 sm:py-0 px-0 sm:px-3">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block">
            APROVEITAMENTO
          </span>
          <span className="font-mono text-xl sm:text-2xl font-black text-foreground mt-0.5 tabular-nums block">
            <AnimatedNumber value={featured.winrate} decimals={1} suffix="%" />
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/85 block mt-0.5 truncate font-medium">
            {featured.wins}V em {featured.winrateMatchesCount} partidas
          </span>
        </div>

        <div>
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block">
            {featured.evolution ? "COMPARAÇÃO RECENTE" : "PARTIDAS TOTAIS"}
          </span>
          {featured.evolution ? (
            <>
              <span
                className={`font-mono text-xl sm:text-2xl font-black mt-0.5 tabular-nums block ${
                  featured.evolution.direction === "up"
                    ? "text-status-good"
                    : featured.evolution.direction === "down"
                    ? "text-status-warning"
                    : "text-foreground"
                }`}
              >
                {featured.evolution.diffRating > 0 ? "+" : featured.evolution.diffRating < 0 ? "−" : ""}
                <AnimatedNumber value={Math.abs(featured.evolution.diffRating)} decimals={2} />
              </span>
              <span
                className="text-[11px] font-mono text-muted-foreground/85 block mt-0.5 truncate font-medium"
                title={featured.evolution.text}
              >
                vs 10 anteriores
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-xl sm:text-2xl font-black text-foreground mt-0.5 tabular-nums block">
                {featured.matchCount}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/85 block mt-0.5 truncate font-medium">
                amostra do período
              </span>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/80 flex items-center justify-between">
        <span>Critério: rating médio mínimo 5 partidas</span>
        <Link
          href={`/players/${featured.player.id}`}
          className="text-primary hover:underline flex items-center gap-1 font-semibold"
        >
          Ver perfil →
        </Link>
      </div>
    </div>
  );
}

function FatoDoPeriodoCard({
  fact,
  emptyReason,
}: {
  fact: PeriodFactInfo | null;
  emptyReason: string | null;
}) {
  if (!fact) {
    return (
      <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-border/50 rounded-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="size-4 text-muted-foreground/60 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
              Fato do Período
            </span>
          </div>
          <TacticalBadge label="SEM FATO" variant="neutral" size="xs" />
        </div>
        <div className="py-4 text-center">
          <p className="text-sm font-bold text-foreground">Sem fato de destaque</p>
          <p className="text-xs font-mono text-muted-foreground/85 mt-1">
            {emptyReason ?? "Nenhum fato atende aos critérios neste período."}
          </p>
        </div>
        <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/80 text-center">
          Atualizado a cada partida
        </div>
      </div>
    );
  }

  const isPositive = fact.kind === "streak-active" || fact.kind === "collective-map";

  return (
    <div
      className={`flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border rounded-sm relative overflow-hidden ${
        isPositive ? "border-primary/30" : "border-border/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {fact.kind === "streak-active" ? (
            <Flame className="size-4 text-primary shrink-0" />
          ) : fact.kind === "collective-map" ? (
            <MapPin className="size-4 text-primary shrink-0" />
          ) : (
            <Sparkles className="size-4 text-primary shrink-0" />
          )}
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-foreground/90 truncate">
            {fact.title}
          </span>
        </div>
        <TacticalBadge label={fact.badgeLabel} variant={fact.badgeVariant} size="xs" />
      </div>

      <div className="space-y-2">
        {fact.player && (
          <div className="flex items-center gap-2.5">
            <PlayerAvatar
              nickname={fact.player.nickname}
              avatarUrl={fact.player.avatarUrl}
              size="sm"
            />
            <Link
              href={`/players/${fact.player.id}`}
              className="font-bold text-foreground hover:text-primary transition-micro truncate text-sm"
            >
              {fact.player.nickname}
            </Link>
          </div>
        )}
        <p className="text-xs font-mono text-foreground/90 leading-relaxed">
          {fact.description}
        </p>
      </div>

      <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/80 flex items-center justify-between">
        <span>{fact.detail ?? "Fato relevante do período"}</span>
        {fact.player && (
          <Link
            href={`/players/${fact.player.id}`}
            className="text-primary hover:underline font-semibold"
          >
            Ver mais →
          </Link>
        )}
      </div>
    </div>
  );
}

function PontoDeAtencaoCard({
  attention,
  emptyReason,
}: {
  attention: AttentionPointInfo | null;
  emptyReason: string | null;
}) {
  if (!attention) {
    return (
      <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-border/50 rounded-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="size-4 text-muted-foreground/60 shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
              Ponto de Atenção
            </span>
          </div>
          <TacticalBadge label="SEM ALERTAS" variant="good" size="xs" />
        </div>
        <div className="py-4 text-center">
          <p className="text-sm font-bold text-foreground">Tudo sob controle</p>
          <p className="text-xs font-mono text-muted-foreground/85 mt-1">
            {emptyReason ?? "Nenhum jogador apresentou oscilação brusca recente."}
          </p>
        </div>
        <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/80 text-center">
          Comparação entre blocos de 10 partidas
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-status-warning/40 rounded-sm relative overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="size-4 text-status-warning shrink-0" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-status-warning truncate">
            Ponto de Atenção
          </span>
        </div>
        <TacticalBadge label="QUEDA DE RATING" variant="warning" size="xs" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <PlayerAvatar
            nickname={attention.player.nickname}
            avatarUrl={attention.player.avatarUrl}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/players/${attention.player.id}`}
              className="font-bold text-foreground hover:text-primary transition-micro block truncate text-sm"
            >
              {attention.player.nickname}
            </Link>
            <span className="text-xs font-mono text-status-warning font-bold">
              Queda de −{attention.dropRating.toFixed(2)} no rating
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-surface-base p-2.5 rounded-xs border border-border/30">
          <div>
            <span className="text-muted-foreground text-[10px] block uppercase">10 ANTERIORES</span>
            <span className="font-bold text-foreground tabular-nums text-sm">
              {attention.previousRating.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px] block uppercase">10 RECENTES</span>
            <span className="font-bold text-status-warning tabular-nums text-sm">
              {attention.recentRating.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border/30 pt-2 text-xs font-mono text-muted-foreground/80 flex items-center justify-between">
        <span>Critério: queda ≥ 0.10 entre blocos</span>
        <Link
          href={`/players/${attention.player.id}`}
          className="text-primary hover:underline font-semibold"
        >
          Ver histórico →
        </Link>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export function RadarDaTemporada({
  radar,
  jogadorDaSemana,
  weeklyCuriosity,
  smartAlerts = [],
}: RadarDaTemporadaProps) {
  // Se o bundle novo com os 4 blocos analíticos estiver presente, renderizamos os 4 novos cards
  if (
    radar &&
    radar.squadMomentum &&
    radar.sessionPace &&
    radar.matchComposition &&
    radar.recentParticipation
  ) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MomentoColetivoCard momentum={radar.squadMomentum} />
        <RitmoDeSessoesCard pace={radar.sessionPace} />
        <ComposicaoPartidasCard composition={radar.matchComposition} />
        <ParticipacaoRecenteCard participation={radar.recentParticipation} />
      </div>
    );
  }

  // Fallback para Snapshots Históricos legados
  const hasLegacyContent = Boolean(
    (radar && (radar.featuredPlayer || radar.periodFact || radar.attentionPoint)) ||
      jogadorDaSemana ||
      weeklyCuriosity ||
      (smartAlerts && smartAlerts.length > 0)
  );

  if (!hasLegacyContent) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TacticalBadge label="REGISTRO HISTÓRICO" variant="neutral" size="xs" />
        <span className="text-[11px] font-mono text-muted-foreground/75">
          Exibindo formato arquivado do período
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5">
        <JogadorEmDestaqueCard
          featured={
            jogadorDaSemana
              ? {
                  player: jogadorDaSemana.player,
                  rating: jogadorDaSemana.rating,
                  rawRating: jogadorDaSemana.rating,
                  matchCount: 10,
                  wins: Math.round((jogadorDaSemana.winrate / 100) * 10),
                  winrate: jogadorDaSemana.winrate,
                  winrateMatchesCount: 10,
                  justification: "Maior rating médio recente.",
                  evolution: {
                    diffRating: Number((jogadorDaSemana.evolution / 100).toFixed(2)),
                    text: jogadorDaSemana.evolutionText,
                    direction:
                      jogadorDaSemana.evolution > 0
                        ? "up"
                        : jogadorDaSemana.evolution < 0
                        ? "down"
                        : "stable",
                  },
                }
              : radar?.featuredPlayer ?? null
          }
          emptyReason={
            radar?.featuredPlayerEmptyReason ??
            "São necessárias pelo menos 5 partidas com rating no período."
          }
        />
        <FatoDoPeriodoCard
          fact={
            weeklyCuriosity
              ? {
                  kind: "streak-concluded",
                  title: "Curiosidade",
                  description: weeklyCuriosity.text,
                  player: weeklyCuriosity.player
                    ? { ...weeklyCuriosity.player, levelGc: null }
                    : null,
                  badgeLabel: "FATO",
                  badgeVariant: "info",
                  detail: weeklyCuriosity.metric ?? undefined,
                }
              : radar?.periodFact ?? null
          }
          emptyReason={
            radar?.periodFactEmptyReason ?? "Nenhum fato atende aos critérios neste período."
          }
        />
        <PontoDeAtencaoCard
          attention={radar?.attentionPoint ?? null}
          emptyReason={
            radar?.attentionPointEmptyReason ??
            "Dados insuficientes para comparar dois blocos de 10 partidas."
          }
        />
      </div>
    </div>
  );
}

export const RadarDoGrupo = RadarDaTemporada;
