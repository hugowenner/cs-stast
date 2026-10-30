"use client";

import { Crown, Shield, Info } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { RaioXCardFrame } from "./raio-x-card-frame";
import type { ReiRoundsDecisivosStats } from "@/lib/raio-x-types";

interface ReiRoundsDecisivosCardProps {
  stats: ReiRoundsDecisivosStats;
}

export function ReiRoundsDecisivosCard({ stats }: ReiRoundsDecisivosCardProps) {
  const {
    hasTelemetry,
    totalDecisiveRoundsAnalyzed,
    topDecisivePlayer,
    topDecisiveMvp,
    topDecisiveFirstKiller,
    topDecisiveClutcher,
    rankings,
    telemetryUnavailableReason,
  } = stats;

  return (
    <RaioXCardFrame
      moduleNumber="#08"
      title="Rei dos Rounds Decisivos"
      description="Impacto nos rounds mais pesados do jogo: Round 12 (fim do half), Round 24 (regulação) e Prorrogações (25+)."
      icon={Crown}
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
              Rounds Decisivos
            </span>
            <span className="font-mono text-sm font-black text-foreground tabular-nums">
              {totalDecisiveRoundsAnalyzed}
            </span>
          </div>
        )
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center gap-1">
            <Info className="size-2.5" />
            Impact Score = MVP &times; 2.0 + First Kill &times; 1.5 + Clutch &times; 2.0
          </span>
          <span>R12, R24 e OT 25+</span>
        </div>
      }
    >
      {!hasTelemetry || !topDecisivePlayer ? (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-surface-deck/40 border border-dashed border-border/40 rounded-xs my-auto">
          <Shield className="size-6 text-muted-foreground/40 mb-2" />
          <p className="text-xs font-mono font-bold text-foreground">
            Dados Insuficientes de Rounds Decisivos
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/60 max-w-sm mt-1">
            {telemetryUnavailableReason ??
              "Nenhuma partida com registros de duelos ou MVPs em rounds decisivos."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {/* Card Destaque: Jogador Mais Decisivo */}
          <div className="p-3.5 bg-surface-deck border border-border/40 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PlayerAvatar
                nickname={topDecisivePlayer.player.nickname}
                avatarUrl={topDecisivePlayer.player.avatarUrl}
                size="md"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <Crown className="size-3.5 text-status-warning shrink-0" />
                  <span className="text-sm font-black text-foreground font-mono uppercase">
                    {topDecisivePlayer.player.nickname}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/75 block mt-0.5">
                  {topDecisivePlayer.mvps} MVPs • {topDecisivePlayer.firstKills} First Kills • {topDecisivePlayer.clutchesWon} Clutches
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 sm:border-l sm:border-border/30 sm:pl-4">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">
                Impact Score Decisivo
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-black text-primary tabular-nums block">
                <AnimatedNumber value={topDecisivePlayer.decisiveImpactScore} decimals={0} duration={0.6} />
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50 block">
                {topDecisivePlayer.decisiveRoundsPlayed} rounds jogados
              </span>
            </div>
          </div>

          {/* Banner com Fórmula do Impact Score */}
          <div className="px-2.5 py-1.5 bg-surface-deck/40 border border-border/30 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] font-mono text-muted-foreground/80">
            <span>
              Fórmula de Impacto:{" "}
              <strong className="text-foreground font-semibold">
                (MVP &times; 2.0) + (First Kill &times; 1.5) + (Clutch &times; 2.0)
              </strong>
            </span>
            <span className="text-[9px] text-muted-foreground/50">
              R12 (half) &bull; R24 (regulação) &bull; OT 25+
            </span>
          </div>

          {/* Destaques Específicos: MVP, FK, Clutch */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs">
              <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block truncate">
                Mais MVPs Decisivos
              </span>
              <span className="text-xs font-bold text-foreground font-mono truncate block mt-0.5">
                {topDecisiveMvp?.player.nickname ?? "—"}
              </span>
              <span className="text-[10px] font-mono text-status-warning font-bold">
                {topDecisiveMvp?.mvps ?? 0} MVPs
              </span>
            </div>

            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs">
              <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block truncate">
                Mais FKs R12/R24
              </span>
              <span className="text-xs font-bold text-foreground font-mono truncate block mt-0.5">
                {topDecisiveFirstKiller?.player.nickname ?? "—"}
              </span>
              <span className="text-[10px] font-mono text-primary font-bold">
                {topDecisiveFirstKiller?.firstKills ?? 0} FKs
              </span>
            </div>

            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs">
              <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block truncate">
                Mais Clutches Decisivos
              </span>
              <span className="text-xs font-bold text-foreground font-mono truncate block mt-0.5">
                {topDecisiveClutcher?.player.nickname ?? "—"}
              </span>
              <span className="text-[10px] font-mono text-status-good font-bold">
                {topDecisiveClutcher?.clutchesWon ?? 0} 1vX
              </span>
            </div>
          </div>

          {/* Ranking Compacto Top 4 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              Top 4 em Impacto Decisivo
            </span>
            <div className="flex flex-col divide-y divide-border/30 border border-border/40 rounded-xs overflow-hidden bg-surface-deck/40">
              {rankings.slice(0, 4).map((r, idx) => (
                <div
                  key={r.player.id}
                  className="px-3 py-2 flex items-center justify-between text-[11px] font-mono hover:bg-surface-elevated/30 transition-micro"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground/50 w-3">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-foreground">
                      {r.player.nickname}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground/60">
                      {r.mvps} MVP • {r.firstKills} FK • {r.clutchesWon} Cl
                    </span>
                    <span className="font-bold text-primary tabular-nums">
                      {r.decisiveImpactScore} pts
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
