"use client";

import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { HallOfFameRecord, MonitoredPlayerEntry } from "@/server/services/competitive.service";
import { Trophy, Flame, Swords, Star, TrendingUp } from "lucide-react";

interface HallOfFameProps {
  records: HallOfFameRecord[];
  monitoredPlayers: MonitoredPlayerEntry[];
}

const RECORD_ICONS: Record<string, any> = {
  "Recorde de Rating": Trophy,
  "Recorde de Kills": Swords,
  "Maior ADR em Jogo": Flame,
  "Maior Sequência de Vitórias": Star,
  "Pico de Rating do Hub": TrendingUp,
};

const CARD_COLORS: Record<string, string> = {
  "Recorde de Rating": "border-yellow-500/20 bg-yellow-500/[0.02] text-yellow-400",
  "Recorde de Kills": "border-red-500/20 bg-red-500/[0.02] text-red-400",
  "Maior ADR em Jogo": "border-orange-500/20 bg-orange-500/[0.02] text-orange-400",
  "Maior Sequência de Vitórias": "border-pink-500/20 bg-pink-500/[0.02] text-pink-400",
  "Pico de Rating do Hub": "border-cyan-500/20 bg-cyan-500/[0.02] text-cyan-400",
};

export function HallOfFame({ records, monitoredPlayers }: HallOfFameProps) {
  if (records.length === 0) return null;

  return (
    <section className="mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {records.map((record) => {
          // Busca o jogador monitorado correspondente ao apelido para pegar o avatarUrl e o ID correto
          const matchedPlayer = monitoredPlayers.find(
            (mp) => mp.player.nickname.toLowerCase() === record.playerName.toLowerCase()
          )?.player;

          const IconComponent = RECORD_ICONS[record.category] || Trophy;
          const colorClasses = CARD_COLORS[record.category] || "border-white/[0.07] bg-white/[0.01]";

          return (
            <div
              key={record.category}
              className={`glass-panel rounded-2xl border overflow-hidden flex flex-col justify-between ${colorClasses.split(" ")[0]} ${colorClasses.split(" ")[1]}`}
            >
              {/* Categoria do Recorde */}
              <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.04] flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/80">
                  {record.category}
                </span>
                <IconComponent className={`size-3.5 ${colorClasses.split(" ")[2]}`} />
              </div>

              {/* Corpo: Detalhes do Jogador */}
              <div className="px-4 py-4 flex flex-col gap-3 flex-1 justify-center">
                {matchedPlayer ? (
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar
                      nickname={matchedPlayer.nickname}
                      avatarUrl={matchedPlayer.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/players/${matchedPlayer.id}`}
                        className="text-xs font-bold text-white hover:text-primary transition-colors block truncate"
                      >
                        {matchedPlayer.nickname}
                      </Link>
                      {matchedPlayer.levelGc !== null && matchedPlayer.levelGc !== undefined && (
                        <p className="text-[8px] text-muted-foreground/50 font-semibold">
                          Nível {matchedPlayer.levelGc} GC
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar nickname={record.playerName} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{record.playerName}</p>
                      <p className="text-[8px] text-muted-foreground/50 font-semibold">
                        Visitante
                      </p>
                    </div>
                  </div>
                )}

                {/* Valor do Recorde */}
                <div className="mt-1">
                  <p className="text-xl font-black text-white leading-none tracking-tight">
                    {record.value}
                  </p>
                </div>
              </div>

              {/* Rodapé: Contexto (Mapa / Data) */}
              <div className="px-4 py-2 bg-white/[0.015] border-t border-white/[0.04] text-[9px] text-muted-foreground/60 font-medium">
                {record.detail}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
