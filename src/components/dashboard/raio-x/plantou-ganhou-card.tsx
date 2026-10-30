"use client";

import { Bomb, Info, AlertTriangle } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { RaioXCardFrame } from "./raio-x-card-frame";
import type { PlantouGanhouStats } from "@/lib/raio-x-types";

interface PlantouGanhouCardProps {
  stats: PlantouGanhouStats;
}

export function PlantouGanhouCard({ stats }: PlantouGanhouCardProps) {
  const {
    hasTelemetry,
    totalEligibleRounds,
    totalPostPlants,
    bombsExploded,
    bombsDefused,
    postPlantConversionRate,
    retakeSuccessRate,
    topDefusers,
    telemetryUnavailableReason,
  } = stats;

  return (
    <RaioXCardFrame
      moduleNumber="#06"
      title="Plantou, Ganhou?"
      description="Taxa real de conversão pós-plant: a C4 explode ou o retake CT prevalece?"
      icon={Bomb}
      iconClass="bg-primary/10 text-primary border-primary/20"
      categoryBadge={<TacticalBadge label="TÁTICA" variant="neutral" size="xs" />}
      statusBadge={
        hasTelemetry ? (
          <TacticalBadge label="OPERACIONAL" variant="good" size="xs" />
        ) : (
          <TacticalBadge label="SEM TELEMETRIA" variant="warning" size="xs" />
        )
      }
      headerAction={
        hasTelemetry && (
          <div className="text-right">
            <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block">
              Plants Confirmados
            </span>
            <span className="font-mono text-sm font-black text-foreground tabular-nums">
              {totalPostPlants}{" "}
              <span className="text-[10px] font-normal text-muted-foreground/60">
                / {totalEligibleRounds} R
              </span>
            </span>
          </div>
        )
      }
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 w-full">
          <span className="flex items-center gap-1">
            <Info className="size-2.5" />
            Desfechos diretos da C4: detonação (bomb_exploded) vs desarme (bomb_defused)
          </span>
          <span className="text-[9px] text-muted-foreground/40">
            Eliminações pós-plant requerem round_facts detalhado
          </span>
        </div>
      }
    >
      {!hasTelemetry ? (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-surface-deck/40 border border-dashed border-border/40 rounded-xs my-auto">
          <AlertTriangle className="size-6 text-muted-foreground/40 mb-2" />
          <p className="text-xs font-mono font-bold text-foreground">
            Dados de C4 Indisponíveis
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/60 max-w-sm mt-1">
            {telemetryUnavailableReason ??
              "Demos com registro de explosão e defuse da C4 ausentes para este filtro."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {/* Split Conversion: Detonação (T) vs Defuse (CT) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3.5 bg-surface-deck border border-border/40 rounded-xs flex flex-col justify-between">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
                Conversão T (Detonação)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl sm:text-3xl font-black text-status-warning tabular-nums">
                  <AnimatedNumber value={postPlantConversionRate ?? 0} decimals={0} suffix="%" duration={0.6} />
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  {bombsExploded} vitórias
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-surface-deck border border-border/40 rounded-xs flex flex-col justify-between">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
                Sucesso Retake CT (Defuse)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl sm:text-3xl font-black text-status-good tabular-nums">
                  <AnimatedNumber value={retakeSuccessRate ?? 0} decimals={0} suffix="%" duration={0.6} />
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  {bombsDefused} desarmes
                </span>
              </div>
            </div>
          </div>

          {/* Barra Visual de Proporção */}
          <div className="flex flex-col gap-1.5">
            <div className="w-full bg-surface-deck rounded-xs h-2 overflow-hidden flex border border-border/40">
              <div
                className="bg-status-warning h-full transition-all duration-500"
                style={{ width: `${postPlantConversionRate ?? 50}%` }}
              />
              <div
                className="bg-status-good h-full transition-all duration-500"
                style={{ width: `${retakeSuccessRate ?? 50}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/60">
              <span>{postPlantConversionRate}% Seguraram o Plant</span>
              <span>{retakeSuccessRate}% CTs Desarmaram</span>
            </div>
          </div>

          {/* Top Defusers (MVP no desarme) */}
          {topDefusers.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
                Reis do Retake (Desarmes Confirmados com MVP)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {topDefusers.slice(0, 3).map((defuser) => (
                  <div
                    key={defuser.player.id}
                    className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs flex items-center gap-2"
                  >
                    <PlayerAvatar
                      nickname={defuser.player.nickname}
                      avatarUrl={defuser.player.avatarUrl}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-foreground font-mono truncate block">
                        {defuser.player.nickname}
                      </span>
                      <span className="text-[10px] font-mono text-primary font-bold">
                        {defuser.defuses} defuses
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </RaioXCardFrame>
  );
}
