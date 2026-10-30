"use client";

import { Handshake, Zap, Trophy, Shield, Info } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { RaioXCardFrame } from "./raio-x-card-frame";
import type { MelhorDuplaStats } from "@/lib/raio-x-types";

interface MelhorDuplaCardProps {
  stats: MelhorDuplaStats;
}

export function MelhorDuplaCard({ stats }: MelhorDuplaCardProps) {
  const {
    hasTelemetry,
    totalTrackedTrades,
    minTradesThreshold,
    mostSynergicDuo,
    fastestTradeDuo,
    allEligibleDuos,
    telemetryUnavailableReason,
  } = stats;

  return (
    <RaioXCardFrame
      moduleNumber="#04"
      title="Melhor Dupla da Zinda"
      description="Duplas com maior frequência de re-frags mútuos e rapidez na vingança imediata."
      icon={Handshake}
      iconClass="bg-primary/10 text-primary border-primary/20"
      categoryBadge={<TacticalBadge label="SINERGIA" variant="neutral" size="xs" />}
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
              Trocas Rastreadas
            </span>
            <span className="font-mono text-sm font-black text-foreground tabular-nums">
              {totalTrackedTrades}
            </span>
          </div>
        )
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center gap-1">
            <Info className="size-2.5" />
            Considera apenas trocas válidas (&le; 5.0s) no mesmo time comunitário
          </span>
          <span>Mínimo: {minTradesThreshold} trocas</span>
        </div>
      }
    >
      {!hasTelemetry || !mostSynergicDuo ? (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-surface-deck/40 border border-dashed border-border/40 rounded-xs my-auto">
          <Shield className="size-6 text-muted-foreground/40 mb-2" />
          <p className="text-xs font-mono font-bold text-foreground">
            Dados Insuficientes de Trocas
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/60 max-w-sm mt-1">
            {telemetryUnavailableReason ??
              `Nenhuma dupla atingiu o critério mínimo de ${minTradesThreshold} trocas mútuas no período.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {/* Card Destaque: Dupla Mais Sinergica */}
          <div className="p-3.5 bg-surface-deck border border-border/40 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 shrink-0">
                <span className="ring-2 ring-background rounded-full inline-block overflow-hidden">
                  <PlayerAvatar
                    nickname={mostSynergicDuo.playerA.nickname}
                    avatarUrl={mostSynergicDuo.playerA.avatarUrl}
                    size="sm"
                  />
                </span>
                <span className="ring-2 ring-background rounded-full inline-block overflow-hidden">
                  <PlayerAvatar
                    nickname={mostSynergicDuo.playerB.nickname}
                    avatarUrl={mostSynergicDuo.playerB.avatarUrl}
                    size="sm"
                  />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="size-3 text-status-warning shrink-0" />
                  <span className="text-xs font-black text-foreground font-mono uppercase">
                    {mostSynergicDuo.playerA.nickname} & {mostSynergicDuo.playerB.nickname}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/75 block mt-0.5">
                  {mostSynergicDuo.tradesAAvengedB}x vingados por {mostSynergicDuo.playerA.nickname} •{" "}
                  {mostSynergicDuo.tradesBAvengedA}x por {mostSynergicDuo.playerB.nickname}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-border/30 sm:pl-4">
              <div className="text-left sm:text-right">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">
                  Re-frags Mútuos
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-primary tabular-nums block">
                  <AnimatedNumber value={mostSynergicDuo.totalMutualTrades} decimals={0} duration={0.6} />
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">
                  Tempo Médio
                </span>
                <span className="font-mono text-sm font-bold text-foreground tabular-nums block">
                  {mostSynergicDuo.avgRefragTimeSeconds}s
                </span>
              </div>
            </div>
          </div>

          {/* Dupla Mais Rápida no Re-frag */}
          {fastestTradeDuo && fastestTradeDuo !== mostSynergicDuo && (
            <div className="px-3 py-2 bg-surface-deck/40 border border-border/30 rounded-xs flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 text-muted-foreground/80">
                <Zap className="size-3.5 text-status-warning shrink-0" />
                <span>Re-frag Mais Rápido:</span>
                <strong className="text-foreground">
                  {fastestTradeDuo.playerA.nickname} & {fastestTradeDuo.playerB.nickname}
                </strong>
              </span>
              <span className="font-bold text-status-good tabular-nums">
                {fastestTradeDuo.avgRefragTimeSeconds}s média ({fastestTradeDuo.fastestRefragTimeSeconds}s recorde)
              </span>
            </div>
          )}

          {/* Ranking Compacto de Duplas */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/60">
              <span className="font-bold uppercase tracking-wider">
                Ranking por Volume de Re-frags Mútuos (Mín. {minTradesThreshold} trocas)
              </span>
              <span className="text-[9px] text-muted-foreground/40">
                Critério: Total &bull; Menor Tempo
              </span>
            </div>
            <div className="flex flex-col divide-y divide-border/30 border border-border/40 rounded-xs overflow-hidden bg-surface-deck/40">
              {allEligibleDuos.slice(0, 4).map((duo, idx) => (
                <div
                  key={`${duo.playerA.id}_${duo.playerB.id}`}
                  className="px-3 py-2 flex items-center justify-between text-[11px] font-mono hover:bg-surface-elevated/30 transition-micro"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground/50 w-3">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-foreground">
                      {duo.playerA.nickname} & {duo.playerB.nickname}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary tabular-nums">
                      {duo.totalMutualTrades} trocas
                    </span>
                    <span className="text-muted-foreground/70 tabular-nums">
                      {duo.avgRefragTimeSeconds}s média
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      ({duo.winrateTogether}% WR)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </RaioXCardFrame>
  );
}
