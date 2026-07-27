"use client";

import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { HallOfFameRecord, MonitoredPlayerEntry } from "@/server/services/competitive.service";
import { Trophy, Flame, Swords, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HallOfFameProps {
  records: HallOfFameRecord[];
  monitoredPlayers: MonitoredPlayerEntry[];
}

interface RecordMeta {
  title: string;
  icon: any;
  medal: string;
  medalLabel: string;
  description: string;
  colorClass: string;
  iconColor: string;
}

const METADATA_BY_CATEGORY: Record<string, RecordMeta> = {
  "Recorde de Rating": {
    title: "Maior Rating",
    icon: Trophy,
    medal: "🥇",
    medalLabel: "Recorde absoluto",
    description: "Melhor performance individual",
    colorClass: "border-yellow-500/20 bg-yellow-500/[0.02]",
    iconColor: "text-yellow-400",
  },
  "Maior K/D em Jogo": {
    title: "Maior K/D",
    icon: Swords,
    medal: "🥇",
    medalLabel: "Recorde absoluto",
    description: "Maior eficiência da temporada",
    colorClass: "border-emerald-500/20 bg-emerald-500/[0.02]",
    iconColor: "text-emerald-400",
  },
  "Maior ADR em Jogo": {
    title: "Maior ADR",
    icon: Flame,
    medal: "🥇",
    medalLabel: "Recorde absoluto",
    description: "Maior impacto por round",
    colorClass: "border-orange-500/20 bg-orange-500/[0.02]",
    iconColor: "text-orange-400",
  },
  "Recorde de Kills": {
    title: "Mais Kills em uma Partida",
    icon: Swords,
    medal: "🥈",
    medalLabel: "Líder da temporada",
    description: "Recorde ofensivo",
    colorClass: "border-red-500/20 bg-red-500/[0.02]",
    iconColor: "text-red-400",
  },
  "Maior HS% em Jogo": {
    title: "Maior HS%",
    icon: Star,
    medal: "🥈",
    medalLabel: "Líder da temporada",
    description: "Precisão absurda",
    colorClass: "border-pink-500/20 bg-pink-500/[0.02]",
    iconColor: "text-pink-400",
  },
  "Maior Sequência de Vitórias": {
    title: "Maior Sequência",
    icon: Star,
    medal: "🔥",
    medalLabel: "Sequência ativa",
    description: "Maior sequência invicta",
    colorClass: "border-purple-500/20 bg-purple-500/[0.02]",
    iconColor: "text-purple-400",
  },
  "Pico de Rating do Hub": {
    title: "Pico de Rating do Hub",
    icon: TrendingUp,
    medal: "🥈",
    medalLabel: "Líder da temporada",
    description: "Ranking interno CS2 Stats Hub",
    colorClass: "border-cyan-500/20 bg-cyan-500/[0.02]",
    iconColor: "text-cyan-400",
  },
};

function extractMapName(detail: string): string | null {
  const match = detail.match(/mapa\s+(\w+)/i) || detail.match(/na\s+(\w+)/i);
  return match ? match[1] : null;
}

export function HallOfFame({ records, monitoredPlayers }: HallOfFameProps) {
  if (records.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {records.map((record) => {
        const meta = METADATA_BY_CATEGORY[record.category] || {
          title: record.category,
          icon: Trophy,
          medal: "🥇",
          medalLabel: "Destaque",
          description: "Recorde da temporada",
          colorClass: "border-white/[0.07] bg-white/[0.01]",
          iconColor: "text-white",
        };

        const matchedPlayer = monitoredPlayers.find(
          (mp) => mp.player.nickname.toLowerCase() === record.playerName.toLowerCase()
        )?.player;

        const mapName = extractMapName(record.detail);
        const IconComponent = meta.icon;

        return (
          <div
            key={record.category}
            className={cn(
              "glass-panel border rounded-2xl p-3.5 flex flex-col justify-between relative group overflow-hidden transition-all duration-300 hover:scale-[1.015]",
              meta.colorClass
            )}
          >
            {/* Glow effect no hover */}
            <div className="absolute -inset-px bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />

            {/* Cabeçalho do Card (Compacto) */}
            <div className="flex items-center justify-between gap-1.5 border-b border-white/[0.04] pb-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <IconComponent className={cn("size-3.5 shrink-0", meta.iconColor)} />
                <span className="text-[11px] font-black text-white truncate">{meta.title}</span>
              </div>
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-white/[0.02] border border-white/[0.06] text-muted-foreground/80 uppercase tracking-wider select-none shrink-0"
                title={meta.medalLabel}
              >
                {meta.medal} {meta.medalLabel}
              </span>
            </div>

            {/* Corpo do Card (Compactado e com Link de Evidência) */}
            <div className="flex flex-col gap-2.5 py-1.5 flex-1 justify-between">
              {/* Player Row: Avatar, Nickname & Nível GC na mesma linha */}
              <div className="flex items-center gap-1.5 min-w-0 bg-white/[0.015] border border-white/[0.04] p-1.5 rounded-xl justify-center">
                <PlayerAvatar
                  nickname={matchedPlayer?.nickname || record.playerName}
                  avatarUrl={matchedPlayer?.avatarUrl || null}
                  size="sm"
                />
                <div className="flex items-center gap-1 min-w-0">
                  {matchedPlayer ? (
                    <Link
                      href={`/players/${matchedPlayer.id}`}
                      className="text-xs font-black text-white hover:text-primary transition-colors truncate max-w-[90px]"
                    >
                      {matchedPlayer.nickname}
                    </Link>
                  ) : (
                    <span className="text-xs font-black text-white truncate max-w-[90px]">
                      {record.playerName}
                    </span>
                  )}
                  {matchedPlayer ? (
                    <span className="text-[9px] text-muted-foreground/60 font-bold bg-white/[0.04] border border-white/[0.06] px-1 py-0.5 rounded flex items-center gap-0.5 shrink-0 select-none">
                      🏅 {matchedPlayer.levelGc ?? "—"} GC
                    </span>
                  ) : (
                    <span className="text-[8px] text-muted-foreground/50 font-bold bg-white/[0.02] border border-white/[0.04] px-1 py-0.5 rounded shrink-0 select-none">
                      Visitante
                    </span>
                  )}
                </div>
              </div>

              {/* Valor em destaque & Descrição Curta */}
              <div className="text-center flex flex-col items-center justify-center gap-0.5 my-1">
                <p className="text-3xl font-black text-white tracking-tight leading-none tabular-nums">
                  {record.value}
                </p>
                <p className="text-[9.5px] text-muted-foreground/75 font-semibold mt-1">
                  {meta.description}
                </p>
              </div>

              {/* Link de Prova / Evidência */}
              {record.matchId && (
                <Link
                  href={`/matches/${record.matchId}`}
                  className="mt-0.5 flex items-center justify-center gap-1 py-1 rounded-lg border border-primary/10 hover:border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider transition-all duration-200 w-full group/btn"
                >
                  <span>Ver Partida</span>
                  <span className="group-hover/btn:translate-x-0.5 transition-transform">▶</span>
                </Link>
              )}
            </div>

            {/* Rodapé do Card (Compacto) */}
            <div className="border-t border-white/[0.04] pt-2 mt-2 flex items-center justify-between text-[9px] text-muted-foreground/45">
              <span>Estatística</span>
              {mapName ? (
                <span className="inline-flex items-center gap-0.5 text-accent-cyan font-bold uppercase tracking-wider text-[7.5px] select-none">
                  📍 {mapName}
                </span>
              ) : (
                <span className="text-muted-foreground/35 font-bold text-[7.5px]">
                  🏆 Geral
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
