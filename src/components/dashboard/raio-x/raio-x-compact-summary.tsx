"use client";

import Link from "next/link";
import {
  Crosshair,
  Handshake,
  Bomb,
  Crown,
  ArrowRight,
  Layers,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { RaioXBundle } from "@/lib/raio-x-types";
import { RAIO_X_CARDS_CATALOG } from "@/lib/raio-x-types";

interface RaioXCompactSummaryProps {
  bundle: RaioXBundle;
  seasonName?: string;
}

export function RaioXCompactSummary({ bundle }: RaioXCompactSummaryProps) {
  const activeCardsCount = RAIO_X_CARDS_CATALOG.filter((c) => c.status === "active").length;
  const totalCardsCount = RAIO_X_CARDS_CATALOG.length;

  const { entregamos5v4, melhorDupla, plantouGanhou, reiRoundsDecisivos } = bundle;

  return (
    <div className="flex flex-col gap-4">
      {/* Grid de 4 Destaques Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Conversão 5v4 (#01) */}
        <div className="p-4 bg-surface-panel border border-border/60 hover:border-border/90 rounded-sm shadow-sm relative overflow-hidden flex flex-col justify-between gap-3 group transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
              <Crosshair className="size-3.5 text-primary" />
              <span>#01 Vantagem 5v4</span>
            </span>
            <TacticalBadge label="DEMO GC" variant="neutral" size="xs" />
          </div>

          <div>
            <span className="text-2xl sm:text-3xl font-black font-mono text-status-good tabular-nums block">
              {entregamos5v4.conversionRate !== null ? (
                <AnimatedNumber value={entregamos5v4.conversionRate} decimals={0} suffix="%" duration={0.6} />
              ) : (
                "—"
              )}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground/75 block mt-0.5">
              {entregamos5v4.roundsWonAfterFk} vitórias em {entregamos5v4.totalAdvantagesCreated} rounds pós-FK
            </span>
          </div>

          <span className="text-[10px] font-mono text-muted-foreground/50 border-t border-border/20 pt-2">
            Entrega: {entregamos5v4.surrenderRate ?? 0}% das vantagens criadas
          </span>
        </div>

        {/* KPI 2: Melhor Dupla de Trocas (#04) */}
        <div className="p-4 bg-surface-panel border border-border/60 hover:border-border/90 rounded-sm shadow-sm relative overflow-hidden flex flex-col justify-between gap-3 group transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
              <Handshake className="size-3.5 text-primary" />
              <span>#04 Sinergia de Trocas</span>
            </span>
            <TacticalBadge label="DEMO GC" variant="neutral" size="xs" />
          </div>

          <div>
            {melhorDupla.mostSynergicDuo ? (
              <span className="text-base sm:text-lg font-black font-mono text-foreground uppercase truncate block">
                {melhorDupla.mostSynergicDuo.playerA.nickname} & {melhorDupla.mostSynergicDuo.playerB.nickname}
              </span>
            ) : (
              <span className="text-sm font-mono text-muted-foreground">—</span>
            )}
            <span className="text-[11px] font-mono text-primary font-bold block mt-0.5">
              {melhorDupla.mostSynergicDuo?.totalMutualTrades ?? 0} re-frags mútuos ({melhorDupla.mostSynergicDuo?.avgRefragTimeSeconds ?? 0}s)
            </span>
          </div>

          <span className="text-[10px] font-mono text-muted-foreground/50 border-t border-border/20 pt-2">
            Total rastreado: {melhorDupla.totalTrackedTrades} trocas na Zinda
          </span>
        </div>

        {/* KPI 3: Plantou, Ganhou? (#06) */}
        <div className="p-4 bg-surface-panel border border-border/60 hover:border-border/90 rounded-sm shadow-sm relative overflow-hidden flex flex-col justify-between gap-3 group transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
              <Bomb className="size-3.5 text-status-warning" />
              <span>#06 C4 Pós-Plant</span>
            </span>
            <TacticalBadge label="DEMO GC" variant="neutral" size="xs" />
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-status-warning tabular-nums">
                {plantouGanhou.postPlantConversionRate ?? 0}%
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                T detonações
              </span>
            </div>
            <span className="text-[11px] font-mono text-status-good font-bold block mt-0.5">
              {plantouGanhou.retakeSuccessRate ?? 0}% Sucesso de Retake CT
            </span>
          </div>

          <span className="text-[10px] font-mono text-muted-foreground/50 border-t border-border/20 pt-2">
            {plantouGanhou.totalPostPlants} plants em {plantouGanhou.totalEligibleRounds} rounds
          </span>
        </div>

        {/* KPI 4: Rei dos Rounds Decisivos (#08) */}
        <div className="p-4 bg-surface-panel border border-border/60 hover:border-border/90 rounded-sm shadow-sm relative overflow-hidden flex flex-col justify-between gap-3 group transition-all duration-200">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
              <Crown className="size-3.5 text-status-warning" />
              <span>#08 Climax & Decisão</span>
            </span>
            <TacticalBadge label="DEMO GC" variant="neutral" size="xs" />
          </div>

          <div>
            {reiRoundsDecisivos.topDecisivePlayer ? (
              <span className="text-base sm:text-lg font-black font-mono text-foreground uppercase block truncate">
                {reiRoundsDecisivos.topDecisivePlayer.player.nickname}
              </span>
            ) : (
              <span className="text-sm font-mono text-muted-foreground">—</span>
            )}
            <span className="text-[11px] font-mono text-primary font-bold block mt-0.5">
              {reiRoundsDecisivos.topDecisivePlayer?.decisiveImpactScore ?? 0} pts de Impacto Decisivo
            </span>
          </div>

          <span className="text-[10px] font-mono text-muted-foreground/50 border-t border-border/20 pt-2">
            {reiRoundsDecisivos.topDecisivePlayer?.mvps ?? 0} MVPs em {reiRoundsDecisivos.totalDecisiveRoundsAnalyzed} rounds decisivos
          </span>
        </div>
      </div>

      {/* Banner / CTA de Acesso à Página Completa */}
      <div className="p-4 sm:p-5 bg-surface-panel border border-border/60 hover:border-primary/40 rounded-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200">
        <div className="flex items-center gap-3.5">
          <div className="flex size-9 items-center justify-center rounded-xs bg-primary/10 text-primary border border-primary/25 shrink-0">
            <Layers className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-foreground uppercase tracking-tight">
                Raio-X das Partidas — Análise Tática Completa
              </h4>
              <TacticalBadge label="9 MÓDULOS" variant="primary" size="xs" />
            </div>
            <p className="text-[11px] font-mono text-muted-foreground/75 mt-0.5">
              Explore os 9 módulos táticos detalhados: Terror dos Amigos, Economia do Desastre, Especialista em Armas e Parcerias completas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-muted-foreground/60">
            <span className="flex items-center gap-1 text-status-good font-bold">
              <CheckCircle2 className="size-3" />
              <span>{activeCardsCount} Operacionais</span>
            </span>
            {totalCardsCount > activeCardsCount && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-status-warning font-bold">
                  <Clock className="size-3" />
                  <span>{totalCardsCount - activeCardsCount} Em Normalização</span>
                </span>
              </>
            )}
          </div>

          <Link
            href="/raio-x"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-xs font-black uppercase rounded-xs hover:bg-primary/90 transition-micro shadow-sm cursor-pointer"
          >
            <span>Explorar Raio-X Completo</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
