"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { HallOfFameRecord, MonitoredPlayerEntry } from "@/server/services/competitive.service";
import { Trophy, Flame, Swords, Star, TrendingUp, ChevronLeft, ChevronRight, Brain, Skull, Bomb, ShieldAlert, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { recordNarratives } from "@/lib/narrator/templates";
import { HudBadge } from "@/components/ui/hud-badge";

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
  borderColor: string;
  bgColor: string;
  iconColor: string;
  accentColor: string;
}

const METADATA_BY_CATEGORY: Record<string, RecordMeta> = {
  "Recorde de Rating": {
    title: "Maior Rating",
    icon: Trophy,
    medal: "🥇",
    medalLabel: "🔥 Recorde da Temporada",
    description: "A atuação mais absurda que o grupo já viu",
    borderColor: "border-yellow-500/25",
    bgColor: "bg-yellow-500/[0.02]",
    iconColor: "text-yellow-400",
    accentColor: "text-yellow-400",
  },
  "Maior K/D em Jogo": {
    title: "Maior K/D",
    icon: Swords,
    medal: "🥇",
    medalLabel: "🔥 Recorde da Temporada",
    description: "O round que ele não morreu nem tentando",
    borderColor: "border-emerald-500/25",
    bgColor: "bg-emerald-500/[0.02]",
    iconColor: "text-emerald-400",
    accentColor: "text-emerald-400",
  },
  "Maior ADR em Jogo": {
    title: "Maior ADR",
    icon: Flame,
    medal: "🥇",
    medalLabel: "🔥 Recorde da Temporada",
    description: "Causou dano até em quem não estava na partida",
    borderColor: "border-orange-500/25",
    bgColor: "bg-orange-500/[0.02]",
    iconColor: "text-orange-400",
    accentColor: "text-orange-400",
  },
  "Recorde de Kills": {
    title: "Mais Kills",
    icon: Swords,
    medal: "🥈",
    medalLabel: "🔥 Recorde da Temporada",
    description: "Distribuiu chumbo como se fosse saldão",
    borderColor: "border-red-500/25",
    bgColor: "bg-red-500/[0.02]",
    iconColor: "text-red-400",
    accentColor: "text-red-400",
  },
  "Maior HS% em Jogo": {
    title: "Maior HS%",
    icon: Star,
    medal: "🥈",
    medalLabel: "🔥 Recorde da Temporada",
    description: "Só aceita kill se for na cabeça",
    borderColor: "border-pink-500/25",
    bgColor: "bg-pink-500/[0.02]",
    iconColor: "text-pink-400",
    accentColor: "text-pink-400",
  },
  "Maior Sequência de Vitórias": {
    title: "Maior Sequência",
    icon: Star,
    medal: "🔥",
    medalLabel: "🔥 Recorde da Temporada",
    description: "Estava em modo deus e ninguém conseguiu parar",
    borderColor: "border-purple-500/25",
    bgColor: "bg-purple-500/[0.02]",
    iconColor: "text-purple-400",
    accentColor: "text-purple-400",
  },
  "Pico de Rating do Hub": {
    title: "Pico de Rating",
    icon: TrendingUp,
    medal: "🏆",
    medalLabel: "🔥 Recorde da Temporada",
    description: "O momento em que o Hub reconheceu que ele era diferente",
    borderColor: "border-cyan-500/25",
    bgColor: "bg-cyan-500/[0.02]",
    iconColor: "text-cyan-400",
    accentColor: "text-cyan-400",
  },
  "Maior Impacto em Jogo": {
    title: "Maior Impacto",
    icon: Brain,
    medal: "🧠",
    medalLabel: "🔥 Recorde da Temporada",
    description: "Partida em que os outros 9 eram figurantes",
    borderColor: "border-indigo-500/25",
    bgColor: "bg-indigo-500/[0.02]",
    iconColor: "text-indigo-400",
    accentColor: "text-indigo-400",
  },
  "Mais MultiKills na Temporada": {
    title: "Mais MultiKills",
    icon: Skull,
    medal: "💀",
    medalLabel: "🔥 Recorde da Temporada",
    description: "Limpou round atrás de round sem pedir desculpa",
    borderColor: "border-rose-500/25",
    bgColor: "bg-rose-500/[0.02]",
    iconColor: "text-rose-400",
    accentColor: "text-rose-400",
  },
  "Maior Dano em Jogo": {
    title: "Maior Dano Total",
    icon: Bomb,
    medal: "💣",
    medalLabel: "🔥 Recorde da Temporada",
    description: "Jogou como se cada round valesse R$100",
    borderColor: "border-amber-500/25",
    bgColor: "bg-amber-500/[0.02]",
    iconColor: "text-amber-400",
    accentColor: "text-amber-400",
  },
  "Maior Clutch na Temporada": {
    title: "Maior Clutch",
    icon: ShieldAlert,
    medal: "🧊",
    medalLabel: "🔥 Recorde da Temporada",
    description: "1vX? Problema dele, não problema seu",
    borderColor: "border-teal-500/25",
    bgColor: "bg-teal-500/[0.02]",
    iconColor: "text-teal-400",
    accentColor: "text-teal-400",
  },
  "Maior Consistência na Temporada": {
    title: "Maior Consistência",
    icon: BarChart2,
    medal: "📊",
    medalLabel: "🔥 Recorde da Temporada",
    description: "Nunca brilhou, nunca afundou — a pedra do time",
    borderColor: "border-sky-500/25",
    bgColor: "bg-sky-500/[0.02]",
    iconColor: "text-sky-400",
    accentColor: "text-sky-400",
  },
};

const DEFAULT_META: RecordMeta = {
  title: "Recorde",
  icon: Trophy,
  medal: "🥇",
  medalLabel: "Destaque",
  description: "Recorde da temporada",
  borderColor: "border-white/[0.07]",
  bgColor: "bg-white/[0.01]",
  iconColor: "text-white",
  accentColor: "text-white",
};

const MAP_IMAGES: Record<string, string> = {
  mirage: "/maps/mirage.png",
  dust2: "/maps/dust2.png",
  inferno: "/maps/inferno.png",
  ancient: "/maps/ancient.png",
  anubis: "/maps/anubis.png",
  nuke: "/maps/nuke.png",
  cache: "/maps/cache.png",
  overpass: "/maps/overpass.png",
};

function getMapImage(mapName: string | null | undefined): string | null {
  if (!mapName) return null;
  const norm = mapName.toLowerCase().replace(/^de_/, "").trim();
  return MAP_IMAGES[norm] ?? null;
}

function extractMapName(detail: string): string | null {
  const match = detail.match(/mapa\s+(\w+)/i) || detail.match(/na\s+(\w+)/i);
  return match ? match[1] : null;
}

export function HallOfFame({ records, monitoredPlayers }: HallOfFameProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const list = records;

  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => setActiveIndex((i) => (i + 1) % list.length), 8000);
    return () => clearInterval(t);
  }, [list.length]);

  if (records.length === 0) return null;

  const record = list[activeIndex];
  if (!record) return null;

  const meta = METADATA_BY_CATEGORY[record.category] ?? DEFAULT_META;
  const IconComponent = meta.icon;
  const mapName = extractMapName(record.detail);
  const mapImgUrl = record.matchId ? getMapImage(record.mapName || mapName) : null;

  const matchedPlayer = monitoredPlayers.find(
    (mp) => mp.player.nickname.toLowerCase() === record.playerName.toLowerCase()
  )?.player;

  const handlePrev = () => setActiveIndex((i) => (i - 1 + list.length) % list.length);
  const handleNext = () => setActiveIndex((i) => (i + 1) % list.length);

  return (
    <div className="flex flex-col gap-3">
      <div className={cn(
        "card-record rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-4 min-h-[280px] relative z-0",
        meta.borderColor,
        !mapImgUrl && meta.bgColor
      )}>
        {mapImgUrl && (
          <>
            <img
              src={mapImgUrl}
              alt={record.mapName || mapName || "Map background"}
              className="bg-map-texture"
            />
            <div className="bg-texture-overlay" />
          </>
        )}

        {/* ── Coluna principal (75%) ── */}
        <div className="lg:col-span-3 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.05] relative z-10">

          {/* Progress dots */}
          {list.length > 1 && (
            <div className="absolute top-4 left-6 right-6 flex gap-1.5 z-10">
              {list.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    idx === activeIndex ? "bg-white/80" : "bg-white/10 hover:bg-white/20"
                  }`}
                />
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col gap-5 pt-4"
            >
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <HudBadge label="RECORDE" variant="gold" />
                {record.mapName || mapName ? (
                  <HudBadge label={record.mapName || mapName || ""} variant="cyan" />
                ) : (
                  <HudBadge label="GERAL" variant="neutral" />
                )}
                <HudBadge label="TEMPORADA" variant="neutral" />
              </div>

              {/* Player + value */}
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <div className="size-16 rounded-2xl border-2 border-slate-950 ring-4 ring-white/5 overflow-hidden bg-slate-900 flex items-center justify-center shrink-0">
                  <PlayerAvatar
                    nickname={matchedPlayer?.nickname ?? record.playerName}
                    avatarUrl={matchedPlayer?.avatarUrl ?? null}
                    size="md"
                  />
                </div>
                <div className="space-y-0.5">
                  {matchedPlayer ? (
                    <Link
                      href={`/players/${matchedPlayer.id}`}
                      className="text-2xl sm:text-3xl font-black tracking-tight text-white hover:text-primary transition-colors leading-none uppercase block [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]"
                    >
                      {matchedPlayer.nickname}
                    </Link>
                  ) : (
                    <p className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none uppercase [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                      {record.playerName}
                    </p>
                  )}
                  <p className={cn("text-sm font-semibold uppercase tracking-wider [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]", meta.accentColor)}>
                    {meta.title}
                  </p>
                </div>
              </div>

              {/* Big value */}
              <div className="flex items-end gap-4">
                <p className="metric-hero text-gradient-gold [text-shadow:0_2px_10px_rgba(0,0,0,0.95)]">
                  {record.value}
                </p>
                <p className="text-sm text-muted-foreground/50 font-medium leading-snug pb-2 max-w-xs [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                  {meta.description}
                </p>
              </div>

              {/* Narrativa do narrador */}
              {recordNarratives[record.category] && (
                <div className="mt-1 border-l-2 border-white/[0.08] pl-3">
                  <p className={cn("text-[11px] font-black [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]", meta.accentColor)}>
                    {recordNarratives[record.category].headline}
                  </p>
                  <p className="text-[10px] text-muted-foreground/55 italic mt-0.5 leading-relaxed [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
                    "{recordNarratives[record.category].quote}"
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer: nav + link */}
          <div className="flex items-center justify-between pt-5 border-t border-white/[0.04] mt-5">
            <div className="flex items-center gap-2">
              {list.length > 1 && (
                <>
                  <button onClick={handlePrev} className="size-7 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer">
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <span className="text-[10px] text-muted-foreground/45 font-bold tabular-nums">
                    {activeIndex + 1} / {list.length}
                  </span>
                  <button onClick={handleNext} className="size-7 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer">
                    <ChevronRight className="size-3.5" />
                  </button>
                </>
              )}
            </div>
            {record.matchId && (
              <Link
                href={`/matches/${record.matchId}`}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-primary/15 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 text-primary text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Ver Partida <span>▶</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Coluna lateral: fila de recordes (25%) ── */}
        <div className="p-4 bg-black/[0.12] flex flex-col gap-3 relative z-10">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground/60">🏛️ Amassos</span>
            <span className="text-[9px] text-muted-foreground/40 font-bold">{list.length} categorias</span>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
            {list.map((r, idx) => {
              const m = METADATA_BY_CATEGORY[r.category] ?? DEFAULT_META;
              const Icon = m.icon;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={r.category}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer",
                    isActive
                      ? "bg-white/[0.05] border-white/10 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-white/[0.025]"
                  )}
                >
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0",
                    isActive ? "bg-white/[0.06]" : "bg-white/[0.02]"
                  )}>
                    <Icon className={cn("size-4", m.iconColor)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-black truncate", isActive ? "text-white" : "text-white/60")}>
                      {r.playerName}
                    </p>
                    <p className="text-[9px] text-muted-foreground/45 truncate font-semibold">
                      {m.title} · {r.value}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
