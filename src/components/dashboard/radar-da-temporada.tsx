"use client";

import * as React from "react";
import Link from "next/link";
import { Star, AlertTriangle, Sparkles, Flame, MapPin } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import type {
  GroupRadarBundle,
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

// ─── Card 1: Jogador em Destaque ─────────────────────────────────────────────
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
          <p className="text-xs font-mono text-muted-foreground/80 mt-1 max-w-md mx-auto">
            {emptyReason ?? "São necessárias pelo menos 5 partidas com rating no período."}
          </p>
        </div>

        <div className="border-t border-border/30 pt-2 text-[10px] font-mono text-muted-foreground/50 text-center">
          Critério: pelo menos 5 partidas válidas com rating no período selecionado
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 bg-surface-panel border border-amber-500/30 rounded-sm lg:col-span-2 relative overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Star className="size-4 text-amber-400 shrink-0 fill-amber-400/20" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-amber-400 truncate">
            Jogador em Destaque
          </span>
        </div>
        <TacticalBadge label="MAIOR RATING" variant="gold" size="xs" />
      </div>

      {/* Identificação do Jogador */}
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

      {/* Grade de Métricas */}
      <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border/40">
        {/* Rating Principal */}
        <div>
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block">
            RATING MÉDIO
          </span>
          <span className="font-mono text-xl sm:text-2xl font-black text-foreground mt-0.5 tabular-nums block">
            <AnimatedNumber value={featured.rating} decimals={2} />
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60 block mt-0.5 truncate">
            {featured.matchCount} partidas com rating
          </span>
        </div>

        {/* Aproveitamento */}
        <div className="border-x border-border/30 px-2 sm:px-3">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block">
            APROVEITAMENTO
          </span>
          <span className="font-mono text-xl sm:text-2xl font-black text-foreground mt-0.5 tabular-nums block">
            <AnimatedNumber value={featured.winrate} decimals={1} suffix="%" />
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60 block mt-0.5 truncate">
            {featured.wins}V em {featured.winrateMatchesCount} partidas
          </span>
        </div>

        {/* Evolução secundária ou Amostra */}
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
                className="text-[10px] font-mono text-muted-foreground/60 block mt-0.5 truncate"
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
              <span className="text-[10px] font-mono text-muted-foreground/60 block mt-0.5 truncate">
                no período
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card 2: Fato do Período ─────────────────────────────────────────────────
function FatoDoPeriodoCard({
  fact,
  emptyReason,
}: {
  fact: PeriodFactInfo | null;
  emptyReason: string | null;
}) {
  if (!fact) {
    return (
      <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 bg-surface-panel border border-border/50 rounded-sm lg:col-span-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="size-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
              Fato do Período
            </span>
          </div>
          <TacticalBadge label="SEM REGISTRO" variant="neutral" size="xs" />
        </div>

        <div className="py-4 text-center">
          <p className="text-xs font-bold text-foreground">Nenhum fato em destaque</p>
          <p className="text-[11px] font-mono text-muted-foreground/70 mt-1">
            {emptyReason ?? "Nenhum fato atende aos critérios neste período."}
          </p>
        </div>

        <div className="border-t border-border/30 pt-2 text-[10px] font-mono text-muted-foreground/50 text-center">
          Sequência de vitórias (≥ 3) ou mapa coletivo com aproveitamento &gt; 50%
        </div>
      </div>
    );
  }

  const isMap = fact.kind === "collective-map";

  return (
    <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 bg-surface-panel border border-sky-500/25 rounded-sm lg:col-span-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isMap ? (
            <MapPin className="size-3.5 text-sky-400 shrink-0" />
          ) : (
            <Flame className="size-3.5 text-sky-400 shrink-0" />
          )}
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-sky-400 truncate">
            Fato do Período
          </span>
        </div>
        <TacticalBadge label={fact.badgeLabel} variant={fact.badgeVariant} size="xs" />
      </div>

      <div className="flex items-start gap-3 min-h-[48px]">
        {fact.player ? (
          <PlayerAvatar
            nickname={fact.player.nickname}
            avatarUrl={fact.player.avatarUrl}
            size="md"
          />
        ) : (
          <div className="size-9 rounded-sm bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <MapPin className="size-4 text-sky-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {fact.player ? (
            <Link
              href={`/players/${fact.player.id}`}
              className="text-xs font-bold text-foreground hover:text-primary transition-micro block truncate"
            >
              {fact.player.nickname}
            </Link>
          ) : (
            <span className="text-xs font-bold text-foreground block truncate">
              {fact.title}
            </span>
          )}
          <p className="text-xs text-foreground/90 font-medium leading-relaxed mt-0.5">
            {fact.description}
          </p>
        </div>
      </div>

      <div className="border-t border-border/30 pt-2 text-[10px] font-mono text-muted-foreground/70 truncate">
        {fact.detail ?? fact.title}
      </div>
    </div>
  );
}

// ─── Card 3: Ponto de Atenção ────────────────────────────────────────────────
function PontoDeAtencaoCard({
  attention,
  emptyReason,
}: {
  attention: AttentionPointInfo | null;
  emptyReason: string | null;
}) {
  if (!attention) {
    return (
      <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 bg-surface-panel border border-border/50 rounded-sm lg:col-span-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="size-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground truncate">
              Ponto de Atenção
            </span>
          </div>
          <TacticalBadge label="ESTÁVEL" variant="neutral" size="xs" />
        </div>

        <div className="py-4 text-center">
          <p className="text-xs font-bold text-foreground">Sem pontos de atenção</p>
          <p className="text-[11px] font-mono text-muted-foreground/70 mt-1">
            {emptyReason ?? "Nenhuma queda de rating de 0,10 ou mais identificada."}
          </p>
        </div>

        <div className="border-t border-border/30 pt-2 text-[10px] font-mono text-muted-foreground/50 text-center">
          Comparação entre dois blocos consecutivos de 10 partidas
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 bg-surface-panel border border-amber-500/25 rounded-sm lg:col-span-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-amber-400 truncate">
            Ponto de Atenção
          </span>
        </div>
        <TacticalBadge label="QUEDA DE RATING" variant="warning" size="xs" />
      </div>

      <div className="flex items-start gap-3 min-h-[48px]">
        <PlayerAvatar
          nickname={attention.player.nickname}
          avatarUrl={attention.player.avatarUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/players/${attention.player.id}`}
            className="text-xs font-bold text-foreground hover:text-primary transition-micro block truncate"
          >
            {attention.player.nickname}
          </Link>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-sm font-black text-amber-400 tabular-nums">
              −{attention.dropRating.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/80">de rating</span>
          </div>
        </div>
      </div>

      {/* Comparação entre os dois blocos de 10 partidas */}
      <div className="grid grid-cols-2 gap-2 p-2 bg-surface-subtle/50 rounded-sm border border-border/30 text-center">
        <div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
            10 ANTERIORES
          </span>
          <span className="font-mono text-xs font-bold text-foreground tabular-nums block mt-0.5">
            {attention.previousRating.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <div className="border-l border-border/30">
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 block">
            10 MAIS RECENTES
          </span>
          <span className="font-mono text-xs font-bold text-amber-400 tabular-nums block mt-0.5">
            {attention.recentRating.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      <div className="border-t border-border/30 pt-2 text-[10px] font-mono text-muted-foreground/70">
        {attention.explanation}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function RadarDaTemporada({
  radar,
  jogadorDaSemana,
  weeklyCuriosity,
  smartAlerts = [],
}: RadarDaTemporadaProps) {
  // Novo contrato prioritário: bundle estruturado do Radar do Grupo
  if (radar) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5">
        <JogadorEmDestaqueCard
          featured={radar.featuredPlayer}
          emptyReason={radar.featuredPlayerEmptyReason}
        />
        <FatoDoPeriodoCard
          fact={radar.periodFact}
          emptyReason={radar.periodFactEmptyReason}
        />
        <PontoDeAtencaoCard
          attention={radar.attentionPoint}
          emptyReason={radar.attentionPointEmptyReason}
        />
      </div>
    );
  }

  // Fallback retrocompatível se radar não for provido
  const hasContent = jogadorDaSemana || weeklyCuriosity || smartAlerts.length > 0;
  if (!hasContent) return null;

  return (
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
                  direction: jogadorDaSemana.evolution > 0 ? "up" : jogadorDaSemana.evolution < 0 ? "down" : "stable",
                },
              }
            : null
        }
        emptyReason="São necessárias pelo menos 5 partidas com rating no período."
      />
      <FatoDoPeriodoCard
        fact={
          weeklyCuriosity
            ? {
                kind: "streak-concluded",
                title: "Curiosidade",
                description: weeklyCuriosity.text,
                player: weeklyCuriosity.player ? { ...weeklyCuriosity.player, levelGc: null } : null,
                badgeLabel: "FATO",
                badgeVariant: "info",
                detail: weeklyCuriosity.metric ?? undefined,
              }
            : null
        }
        emptyReason="Nenhum fato atende aos critérios neste período."
      />
      <PontoDeAtencaoCard
        attention={null}
        emptyReason="Dados insuficientes para comparar dois blocos de 10 partidas."
      />
    </div>
  );
}

export const RadarDoGrupo = RadarDaTemporada;
