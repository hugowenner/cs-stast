"use client";

import { ShieldAlert, Crosshair, CheckCircle2, XCircle, Info } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { RaioXCardFrame } from "./raio-x-card-frame";
import type { Entregamos5v4Stats } from "@/lib/raio-x-types";

interface Entregamos5v4CardProps {
  stats: Entregamos5v4Stats;
  seasonName?: string;
}

export function Entregamos5v4Card({ stats }: Entregamos5v4CardProps) {
  const {
    hasTelemetry,
    totalEligibleRounds,
    totalAdvantagesCreated,
    roundsWonAfterFk,
    roundsLostAfterFk,
    conversionRate,
    surrenderRate,
    telemetryUnavailableReason,
  } = stats;

  return (
    <RaioXCardFrame
      moduleNumber="#01"
      title="Entregamos o 5v4?"
      description="Eficiência e taxa de conversão quando o time monitorado abre o round com a primeira eliminação (First Kill)."
      icon={Crosshair}
      iconClass="bg-primary/10 text-primary border-primary/20"
      categoryBadge={<TacticalBadge label="COMBATE" variant="neutral" size="xs" />}
      statusBadge={
        hasTelemetry ? (
          <TacticalBadge label="OPERACIONAL" variant="good" size="xs" />
        ) : (
          <TacticalBadge label="SEM TELEMETRIA" variant="warning" size="xs" />
        )
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span>Aberturas monitoradas (First Kill comunitário)</span>
          <span className="flex items-center gap-1">
            <Info className="size-2.5" />
            Validação estrita de round winner
          </span>
        </div>
      }
    >
      {!hasTelemetry ? (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-surface-deck/40 border border-dashed border-border/40 rounded-xs my-auto">
          <ShieldAlert className="size-6 text-muted-foreground/40 mb-2" />
          <p className="text-xs font-mono font-bold text-foreground">
            Dados Indisponíveis nesta Temporada
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/60 max-w-sm mt-1">
            {telemetryUnavailableReason ??
              "A correspondência entre First Kill e vencedor de rounds requer parsing de demos."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {/* Destaque Principal da Taxa de Conversão */}
          <div className="p-3.5 bg-surface-deck border border-border/40 rounded-xs flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block">
                Taxa de Conversão Pós-FK
              </span>
              <span className="text-xs font-mono text-muted-foreground/90 mt-0.5 block">
                {roundsWonAfterFk} vitórias em {totalAdvantagesCreated} rounds com First Kill
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-2xl sm:text-3xl font-black text-status-good tabular-nums block">
                {conversionRate !== null ? (
                  <AnimatedNumber value={conversionRate} decimals={0} suffix="%" duration={0.6} />
                ) : (
                  "—"
                )}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50 block">
                aproveitamento pós-FK
              </span>
            </div>
          </div>

          {/* Barra de Proporção Vitórias vs Entregas */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="flex items-center gap-1 text-status-good font-bold">
                <CheckCircle2 className="size-3" />
                Convertidas: {roundsWonAfterFk} ({conversionRate}%)
              </span>
              <span className="flex items-center gap-1 text-status-danger font-bold">
                <XCircle className="size-3" />
                Entregues: {roundsLostAfterFk} ({surrenderRate}%)
              </span>
            </div>

            <div className="h-2 w-full bg-surface-deck rounded-xs overflow-hidden flex border border-border/40">
              <div
                className="bg-status-good transition-all duration-500"
                style={{ width: `${conversionRate ?? 50}%` }}
                title={`Convertidas: ${roundsWonAfterFk}`}
              />
              <div
                className="bg-status-danger transition-all duration-500"
                style={{ width: `${surrenderRate ?? 50}%` }}
                title={`Entregues: ${roundsLostAfterFk}`}
              />
            </div>
          </div>

          {/* Métricas complementares */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/20">
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs">
              <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block">
                Vantagens Criadas
              </span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                {totalAdvantagesCreated} rounds
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50 block mt-0.5">
                {totalEligibleRounds > 0
                  ? `${Math.round((totalAdvantagesCreated / totalEligibleRounds) * 100)}% dos rounds`
                  : ""}
              </span>
            </div>

            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs">
              <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block">
                Total de Rounds Analisados
              </span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                {totalEligibleRounds} rounds
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50 block mt-0.5">
                exclui warmup / knife
              </span>
            </div>
          </div>
        </div>
      )}
    </RaioXCardFrame>
  );
}
