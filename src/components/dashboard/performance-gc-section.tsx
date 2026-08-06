"use client";

import { useState } from "react";
import { Zap, Star, Trophy, ShieldCheck } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { StatTile } from "@/components/ui/stat-tile";
import type { AdvancedPerformanceStats } from "@/server/services/competitive.service";

interface MultikillLeaderEntry {
  playerId: string;
  nickname: string;
  avatarUrl: string | null;
  count: number;
}

interface MultikillsLeaderboards {
  doubleKills: MultikillLeaderEntry[];
  tripleKills: MultikillLeaderEntry[];
  quadKills:   MultikillLeaderEntry[];
  aces:        MultikillLeaderEntry[];
}

interface PerformanceGcSectionProps {
  stats: AdvancedPerformanceStats;
  multikillsLeaderboards: MultikillsLeaderboards;
}

type Tab = "performance" | "multikills" | "clutches";

// ─── Tab: Performance ─────────────────────────────────────────────────────────
function PerformanceTab({ stats }: { stats: AdvancedPerformanceStats }) {
  if (stats.sampleSize === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-bold text-white/70">Dados GC ainda não disponíveis</p>
        <p className="text-xs text-muted-foreground/50 mt-1 max-w-sm mx-auto leading-relaxed">
          As partidas desta temporada ainda não possuem estatísticas de dano ou ratings originais da Gamers Club.
        </p>
      </div>
    );
  }

  const tiles = [
    { label: "Dano Médio",    value: stats.averageDamage   != null ? Math.round(stats.averageDamage) : "—",   icon: Zap,    color: "text-accent-purple", suffix: "" },
    { label: "GC Rating",     value: stats.averageGcRating != null ? stats.averageGcRating.toFixed(2) : "—",  icon: Star,   color: "text-accent-gold",   suffix: "" },
    { label: "Total 2Ks",     value: stats.totalDoubleKills ?? "—",  icon: Trophy, color: "text-muted-foreground/70", suffix: "" },
    { label: "Total 3Ks",     value: stats.totalTripleKills ?? "—",  icon: Trophy, color: "text-status-good",         suffix: "" },
    { label: "Total 4Ks",     value: stats.totalQuadKills  ?? "—",   icon: Trophy, color: "text-status-warning",      suffix: "" },
    { label: "Total ACEs",    value: stats.totalAces       ?? "—",   icon: Trophy, color: "text-accent-gold",         suffix: "" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 text-center">
            <Icon className={`size-4 mx-auto mb-2 ${color}`} />
            <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">{label}</p>
            <p className="text-xl font-black text-white mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/45 font-semibold text-center">
        Baseado em {stats.sampleSize} partidas com dados GC
      </p>
    </div>
  );
}

// ─── Tab: Multikills ──────────────────────────────────────────────────────────
function MultikillsTab({ leaderboards }: { leaderboards: MultikillsLeaderboards }) {
  const categories = [
    { key: "aces"        as const, label: "ACEs (5K)",       emoji: "💎", color: "text-accent-gold"   },
    { key: "quadKills"   as const, label: "Quad Kills (4K)", emoji: "🔥", color: "text-status-warning" },
    { key: "tripleKills" as const, label: "Triple Kills (3K)",emoji: "⚡", color: "text-status-good"   },
    { key: "doubleKills" as const, label: "Double Kills (2K)",emoji: "🎯", color: "text-accent-cyan"   },
  ];

  const hasData = categories.some((c) => leaderboards[c.key].length > 0);

  if (!hasData) {
    return <p className="text-sm text-muted-foreground/55 text-center py-8">Nenhuma multikill registrada ainda.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {categories.map(({ key, label, emoji, color }) => {
        const entries = leaderboards[key];
        if (entries.length === 0) return null;
        return (
          <div key={key} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-4 flex flex-col gap-3">
            <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50 flex items-center gap-1.5">
              <span>{emoji}</span> {label}
            </p>
            <div className="flex flex-col gap-2">
              {entries.slice(0, 5).map((p, idx) => (
                <div key={p.playerId} className="flex items-center gap-2">
                  <span className={`text-[10px] font-black w-3.5 shrink-0 ${idx === 0 ? color : "text-muted-foreground/35"}`}>{idx + 1}</span>
                  <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                  <span className="text-xs font-bold text-white/90 truncate flex-1 min-w-0">{p.nickname}</span>
                  <span className={`text-xs font-black tabular-nums shrink-0 ${idx === 0 ? color : "text-white/70"}`}>{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function PerformanceGcSection({ stats, multikillsLeaderboards }: PerformanceGcSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("multikills");

  const tabs: { id: Tab; label: string; icon: typeof Zap; disabled?: boolean }[] = [
    { id: "performance", label: "🎯 GC Premium",  icon: Zap },
    { id: "multikills",  label: "Multikills",     icon: Trophy },
    { id: "clutches",    label: "Clutches",       icon: ShieldCheck, disabled: true },
  ];

  return (
    <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
      <div className="flex border-b border-white/[0.05]">
        {tabs.map(({ id, label, icon: Icon, disabled }) => (
          <button
            key={id}
            onClick={() => !disabled && setActiveTab(id)}
            disabled={disabled}
            title={disabled ? "Em breve" : undefined}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              disabled
                ? "border-transparent text-muted-foreground/25 cursor-not-allowed"
                : activeTab === id
                  ? "border-primary text-white bg-primary/[0.04] cursor-pointer"
                  : "border-transparent text-muted-foreground/55 hover:text-white/70 hover:bg-white/[0.02] cursor-pointer"
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
            {disabled && <span className="text-[8px] font-bold text-muted-foreground/30 ml-0.5">em breve</span>}
          </button>
        ))}
      </div>
      <div className="p-5">
        {activeTab === "performance" && <PerformanceTab stats={stats} />}
        {activeTab === "multikills"  && <MultikillsTab leaderboards={multikillsLeaderboards} />}
      </div>
    </div>
  );
}
