"use client";

import { Crosshair, Shield, Info } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { RaioXCardFrame } from "./raio-x-card-frame";
import type { EspecialistaArmasStats, CategorySpecialist } from "@/lib/raio-x-types";

interface EspecialistaArmasCardProps {
  stats: EspecialistaArmasStats;
}

export function EspecialistaArmasCard({ stats }: EspecialistaArmasCardProps) {
  const {
    hasTelemetry,
    totalKillsAnalyzed,
    topRifler,
    topSniper,
    topPistoleiro,
    topSmg,
    telemetryUnavailableReason,
  } = stats;

  const categories: (CategorySpecialist | null)[] = [
    topRifler,
    topSniper,
    topPistoleiro,
    topSmg,
  ];

  return (
    <RaioXCardFrame
      moduleNumber="#07"
      title="Especialista em Armas"
      description="Líderes de abates e dominância individual em cada classe de armamento."
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
      headerAction={
        hasTelemetry && (
          <div className="text-right">
            <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block">
              Abates Rastreados
            </span>
            <span className="font-mono text-sm font-black text-foreground tabular-nums">
              {totalKillsAnalyzed}
            </span>
          </div>
        )
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center gap-1">
            <Info className="size-2.5" />
            Classificado por categoria: Rifles, Snipers, Pistolas e SMGs
          </span>
          <span>Exclui knife</span>
        </div>
      }
    >
      {!hasTelemetry ? (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-surface-deck/40 border border-dashed border-border/40 rounded-xs my-auto">
          <Shield className="size-6 text-muted-foreground/40 mb-2" />
          <p className="text-xs font-mono font-bold text-foreground">
            Dados de Armas Indisponíveis
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/60 max-w-sm mt-1">
            {telemetryUnavailableReason ??
              "Nenhum registro de armamento disponível para as partidas do período."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {categories.map((cat) => {
            if (!cat) return null;
            return (
              <div
                key={cat.category}
                className="p-3 bg-surface-deck border border-border/40 rounded-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PlayerAvatar
                    nickname={cat.leader.nickname}
                    avatarUrl={cat.leader.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">
                      {cat.categoryLabel}
                    </span>
                    <span className="text-xs font-bold text-foreground font-mono truncate block mt-0.5">
                      {cat.leader.nickname}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/75 block">
                      Arma: <strong className="text-primary font-bold">{cat.weaponDisplayName}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-lg font-black text-foreground tabular-nums block">
                    <AnimatedNumber value={cat.kills} decimals={0} duration={0.5} />
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/50 block">
                    {cat.categoryShare}% dos frags
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </RaioXCardFrame>
  );
}
