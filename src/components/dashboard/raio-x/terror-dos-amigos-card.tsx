"use client";

import { Flame, Info, EyeOff } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { RaioXCardFrame } from "./raio-x-card-frame";
import type { TerrorDosAmigosStats } from "@/lib/raio-x-types";

interface TerrorDosAmigosCardProps {
  stats: TerrorDosAmigosStats;
}

export function TerrorDosAmigosCard({ stats }: TerrorDosAmigosCardProps) {
  const {
    hasTelemetry,
    topTeamFlasher,
    topTeamDamager,
    rankings,
    telemetryUnavailableReason,
  } = stats;

  return (
    <RaioXCardFrame
      moduleNumber="#02"
      title="Terror dos Amigos"
      description="Flashes cegando companheiros de equipe, dano aliado e incidentes com amigos em partidas comunitárias."
      icon={Flame}
      iconClass="bg-status-warning/10 text-status-warning border-status-warning/20"
      categoryBadge={<TacticalBadge label="TÁTICA" variant="neutral" size="xs" />}
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
            Considera incidentes exclusivamente contra parceiros de equipe
          </span>
          <span>Normalizado por 100 rounds</span>
        </div>
      }
    >
      {!hasTelemetry ? (
        <div className="flex flex-col gap-3 my-auto">
          {/* Card de Status da Normalização */}
          <div className="p-3 bg-surface-deck border border-dashed border-status-warning/30 rounded-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <EyeOff className="size-4 text-status-warning/80 shrink-0" />
              <span className="text-xs font-mono font-bold text-foreground uppercase tracking-tight">
                Aguardando Projeção Normalizada de Fogo Amigo
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground/75 leading-relaxed">
              {telemetryUnavailableReason ??
                "A extração de blind_events (cegueira em aliados) e dano entre amigos já foi identificada em 99.8% dos payloads do banco DEV e aguarda conclusão das projeções pelo CS2 Sync Worker."}
            </p>
          </div>

          {/* Grid de Métricas Planejadas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                Dano Aliado
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                FF &bull; Health
              </span>
            </div>
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                Flashes Amigas
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                &gt; 0.5s duração
              </span>
            </div>
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                Teamkills
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                Abates de aliados
              </span>
            </div>
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                Incidentes / 100 R
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                Ponderado
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-2">
            {topTeamFlasher && (
              <div className="p-3 bg-surface-deck border border-border/40 rounded-xs flex items-center gap-2.5">
                <PlayerAvatar
                  nickname={topTeamFlasher.player.nickname}
                  avatarUrl={topTeamFlasher.player.avatarUrl}
                  size="sm"
                />
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block">
                    Maior Cegador de Amigos
                  </span>
                  <span className="text-xs font-bold text-foreground font-mono block">
                    {topTeamFlasher.player.nickname}
                  </span>
                  <span className="text-[10px] font-mono text-status-warning font-bold">
                    {topTeamFlasher.teamFlashes} flashes ({topTeamFlasher.teamBlindDurationSeconds}s cegos)
                  </span>
                </div>
              </div>
            )}

            {topTeamDamager && (
              <div className="p-3 bg-surface-deck border border-border/40 rounded-xs flex items-center gap-2.5">
                <PlayerAvatar
                  nickname={topTeamDamager.player.nickname}
                  avatarUrl={topTeamDamager.player.avatarUrl}
                  size="sm"
                />
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block">
                    Maior Dano Aliado
                  </span>
                  <span className="text-xs font-bold text-foreground font-mono block">
                    {topTeamDamager.player.nickname}
                  </span>
                  <span className="text-[10px] font-mono text-status-warning font-bold">
                    {topTeamDamager.teamDamage} dano ({topTeamDamager.teamKills} TKs)
                  </span>
                </div>
              </div>
            )}
          </div>

          {rankings && rankings.length > 0 && (
            <div className="flex flex-col divide-y divide-border/30 border border-border/40 rounded-xs overflow-hidden bg-surface-deck/40">
              {rankings.slice(0, 3).map((r, idx) => (
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
                    <span className="text-muted-foreground/60">{r.teamFlashes} flashes &bull; {r.teamDamage} FF</span>
                    <span className="font-bold text-status-warning tabular-nums">{r.incidentsPer100Rounds} inc/100r</span>
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
