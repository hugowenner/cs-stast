"use client";

import { Skull, Info } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { RaioXCardFrame } from "./raio-x-card-frame";
import type { MatadorEcoStats } from "@/lib/raio-x-types";

interface MatadorEcoCardProps {
  stats: MatadorEcoStats;
}

export function MatadorEcoCard({ stats }: MatadorEcoCardProps) {
  const {
    hasTelemetry,
    topEcoHunter,
    rankings,
    telemetryUnavailableReason,
  } = stats;

  return (
    <RaioXCardFrame
      moduleNumber="#05"
      title="Matador de Eco"
      description="Eficiência e volume de abates conquistados contra adversários em round econômico (anti-eco)."
      icon={Skull}
      iconClass="bg-status-warning/10 text-status-warning border-status-warning/20"
      categoryBadge={<TacticalBadge label="COMBATE" variant="neutral" size="xs" />}
      statusBadge={
        hasTelemetry ? (
          <TacticalBadge label="OPERACIONAL" variant="good" size="xs" />
        ) : (
          <TacticalBadge label="EM NORMALIZAÇÃO" variant="warning" size="xs" />
        )
      }
      headerAction={
        <span className="text-[9px] font-mono text-status-warning uppercase font-bold px-1.5 py-0.5 bg-status-warning/10 rounded-xs border border-status-warning/20">
          {hasTelemetry ? "Ativo" : "Fila Durável"}
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center gap-1">
            <Info className="size-2.5" />
            Abates classificados via telemetria analítica nativa (kills.analytics.anti_eco)
          </span>
          <span>Exclui warmup</span>
        </div>
      }
    >
      {!hasTelemetry ? (
        <div className="flex flex-col gap-3 my-auto">
          {/* Card de Status da Normalização */}
          <div className="p-3 bg-surface-deck border border-dashed border-status-warning/30 rounded-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skull className="size-4 text-status-warning/80 shrink-0" />
              <span className="text-xs font-mono font-bold text-foreground uppercase tracking-tight">
                Aguardando Projeção Normalizada de Eco Rounds
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground/75 leading-relaxed">
              {telemetryUnavailableReason ??
                "A classificação de abates anti-eco (kills.analytics.anti_eco) já está auditada em 99.8% dos payloads do banco DEV e aguarda conclusão da fila durável do CS2 Sync Worker."}
            </p>
          </div>

          {/* Grid de Métricas Planejadas */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                Abates Anti-Eco
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                Kills vs Economia Baixa
              </span>
              <span className="text-[8px] font-mono text-muted-foreground/30 mt-0.5 block">
                Controle de espaço
              </span>
            </div>
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                % Kills Anti-Eco
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                Fração do total
              </span>
              <span className="text-[8px] font-mono text-muted-foreground/30 mt-0.5 block">
                Inflação de KD
              </span>
            </div>
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                Eficiência
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                Kills / Round vs Eco
              </span>
              <span className="text-[8px] font-mono text-muted-foreground/30 mt-0.5 block">
                Conversão de rifles
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {topEcoHunter && (
            <div className="p-3.5 bg-surface-deck border border-border/40 rounded-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <PlayerAvatar
                  nickname={topEcoHunter.player.nickname}
                  avatarUrl={topEcoHunter.player.avatarUrl}
                  size="md"
                />
                <div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">
                    Maior Caçador de Eco
                  </span>
                  <span className="text-sm font-bold text-foreground font-mono block mt-0.5">
                    {topEcoHunter.player.nickname}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60 block">
                    {topEcoHunter.ecoKills} abates anti-eco ({topEcoHunter.ecoKillPercentage}% dos seus frags)
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-2xl font-black text-status-warning tabular-nums block">
                  <AnimatedNumber value={topEcoHunter.ecoKills} decimals={0} duration={0.6} />
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/50 block">
                  kills anti-eco
                </span>
              </div>
            </div>
          )}

          {rankings.length > 0 && (
            <div className="flex flex-col divide-y divide-border/30 border border-border/40 rounded-xs overflow-hidden bg-surface-deck/40">
              {rankings.slice(0, 4).map((r, idx) => (
                <div
                  key={r.player.id}
                  className="px-3 py-2 flex items-center justify-between text-xs font-mono hover:bg-surface-elevated/30 transition-micro"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground/50 w-3">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-foreground">{r.player.nickname}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground/60">{r.ecoKillPercentage}% dos frags</span>
                    <span className="font-bold text-status-warning tabular-nums">{r.ecoKills} kills</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </RaioXCardFrame>
  );
}
