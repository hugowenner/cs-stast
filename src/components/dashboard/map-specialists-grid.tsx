"use client";

import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { MapSpecialist } from "@/server/services/competitive.service";
import { Map } from "lucide-react";

interface Props {
  specialists: MapSpecialist[];
}

export function MapSpecialistsGrid({ specialists }: Props) {
  if (specialists.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-white/[0.06] p-8 text-center">
        <Map className="size-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground/50">Nenhum especialista de mapa identificado ainda.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {specialists.map((entry) => {
        const mapKey = entry.mapId ?? entry.mapName;
        const displayName = entry.cleanMapName || entry.mapName;

        if (!entry.player) {
          return (
            <div
              key={mapKey}
              className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Nome do mapa */}
                <div className="px-3 pt-3 pb-2 border-b border-white/[0.05]">
                  <div className="flex items-center gap-1.5">
                    <Map className="size-2.5 text-accent-cyan/70 shrink-0" />
                    <p className="text-[9px] font-black text-accent-cyan uppercase tracking-widest truncate">
                      {displayName}
                    </p>
                  </div>
                </div>

                {/* Mensagem quando player for null */}
                <div className="px-3 py-3 flex flex-col justify-center border-b border-white/[0.04]">
                  <p className="text-[11px] font-bold text-muted-foreground/80">
                    Nenhum jogador elegível
                  </p>
                  <p className="text-[9px] text-muted-foreground/50 leading-relaxed mt-1">
                    É necessário disputar pelo menos 3 partidas e conquistar 1 vitória neste mapa.
                  </p>
                </div>
              </div>

              {/* Rodapé informativo */}
              <div className="px-3 py-2.5">
                <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/40">Status</p>
                <p className="text-[11px] font-medium text-muted-foreground/40 mt-0.5">
                  Sem líder consolidado
                </p>
              </div>
            </div>
          );
        }

        const player = entry.player;

        return (
          <Link
            key={mapKey}
            href={`/players/${player.id}`}
            className="glass-panel card-hover rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Nome do mapa */}
              <div className="px-3 pt-3 pb-2 border-b border-white/[0.05]">
                <div className="flex items-center gap-1.5">
                  <Map className="size-2.5 text-accent-cyan/70 shrink-0" />
                  <p className="text-[9px] font-black text-accent-cyan uppercase tracking-widest truncate">
                    {displayName}
                  </p>
                </div>
              </div>

              {/* Avatar + nome do jogador — protagonista */}
              <div className="px-3 py-2.5 flex items-center gap-2 border-b border-white/[0.04]">
                <PlayerAvatar
                  nickname={player.nickname}
                  avatarUrl={player.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-white truncate">{player.nickname}</p>
                  {player.levelGc && (
                    <p className="text-[8px] text-muted-foreground/50 font-semibold">GC Nível {player.levelGc}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Rating no mapa */}
            <div className="px-3 py-2.5">
              <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">Rating no Mapa</p>
              <p className="text-sm font-black text-white/90 tabular-nums mt-0.5">
                {entry.rating !== null ? (
                  <AnimatedNumber value={entry.rating} decimals={2} duration={0.7} />
                ) : (
                  "—"
                )}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
