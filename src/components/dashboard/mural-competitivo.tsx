"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Zap, Compass, ChevronRight } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { PowerRankingEntry, DecisivePlayerEntry, PlayerArchetype } from "@/server/services/competitive.service";

interface MuralCompetitivoProps {
  powerRanking: PowerRankingEntry[];
  decisive: DecisivePlayerEntry[];
  archetypes: PlayerArchetype[];
}

type Tab = "lideres" | "impacto" | "perfis";

const TABS: { id: Tab; label: string; icon: typeof Trophy }[] = [
  { id: "lideres", label: "👑 Líderes", icon: Trophy },
  { id: "impacto", label: "⚡ Impacto", icon: Zap },
  { id: "perfis", label: "🧬 Perfis", icon: Compass },
];

const PODIUM_COLORS = ["text-yellow-400", "text-slate-300", "text-amber-600"];
const PODIUM_BADGES = ["🥇", "🥈", "🥉"];

type MetricKey = "rating" | "adr" | "hs" | "kd" | "winrate";
const METRICS: { key: MetricKey; label: string; suffix: string; decimals: number }[] = [
  { key: "rating",   label: "Rating", suffix: "",  decimals: 2 },
  { key: "adr",      label: "ADR",    suffix: "",  decimals: 0 },
  { key: "hs",       label: "HS%",    suffix: "%", decimals: 0 },
  { key: "kd",       label: "K/D",    suffix: "",  decimals: 2 },
  { key: "winrate",  label: "WR",     suffix: "%", decimals: 0 },
];

function getValue(entry: PowerRankingEntry, key: MetricKey): number {
  switch (key) {
    case "rating":  return entry.rating;
    case "adr":     return entry.adr;
    case "hs":      return entry.hsPercent;
    case "kd":      return entry.kd;
    case "winrate": return entry.winrate;
  }
}

const ARCHETYPE_EMOJI: Record<string, string> = {
  entry:      "🔥",
  clutch:     "🧠",
  headshot:   "🎯",
  consistent: "🛡️",
  tactician:  "📐",
  impact:     "⚡",
  support:    "🤝",
};

// ─── Tab: Líderes ─────────────────────────────────────────────────────────────
function LideresTab({ powerRanking }: { powerRanking: PowerRankingEntry[] }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("rating");
  const meta = METRICS.find((m) => m.key === activeMetric)!;
  const leaders = [...powerRanking].sort((a, b) => getValue(b, activeMetric) - getValue(a, activeMetric)).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Metric selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveMetric(m.key)}
            className={`text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg border shrink-0 transition-all cursor-pointer ${
              activeMetric === m.key
                ? "bg-primary text-black border-primary"
                : "text-muted-foreground/70 border-white/[0.06] bg-white/[0.02] hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {/* Leaderboard */}
      <div className="flex flex-col gap-0.5">
        {leaders.map((entry, idx) => {
          const val = getValue(entry, activeMetric);
          const isTop3 = idx < 3;
          return (
            <div key={entry.player.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/[0.02] transition-colors group">
              <span className={`text-xs font-black w-5 text-center shrink-0 ${isTop3 ? PODIUM_COLORS[idx] : "text-muted-foreground/35"}`}>
                {isTop3 ? PODIUM_BADGES[idx] : `${idx + 1}`}
              </span>
              <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
              <Link href={`/players/${entry.player.id}`} className="text-sm font-bold text-white/90 hover:text-primary transition-colors truncate flex-1 min-w-0">
                {entry.player.nickname}
              </Link>
              <span className="text-[10px] text-muted-foreground/50 font-semibold shrink-0">{entry.matchCount}j</span>
              <span className="text-sm font-black text-white tabular-nums shrink-0 min-w-[52px] text-right">
                <AnimatedNumber value={val} decimals={meta.decimals} suffix={meta.suffix} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Impacto ─────────────────────────────────────────────────────────────
function ImpactoTab({ decisive }: { decisive: DecisivePlayerEntry[] }) {
  if (decisive.length === 0) {
    return <p className="text-sm text-muted-foreground/55 text-center py-8">Dados insuficientes para análise de impacto.</p>;
  }

  const categories: { label: string; emoji: string; extract: (d: DecisivePlayerEntry) => number; suffix: string; color: string }[] = [
    { label: "Impact %",       emoji: "⚡", extract: (d) => d.impactPercent,  suffix: "%", color: "text-accent-purple" },
    { label: "Entry Kills",    emoji: "🔥", extract: (d) => d.entryKills,     suffix: "",  color: "text-status-danger" },
    { label: "Clutches",       emoji: "🧠", extract: (d) => d.clutchWins,     suffix: "",  color: "text-accent-cyan" },
    { label: "Trades",         emoji: "🔄", extract: (d) => d.tradeKills,     suffix: "",  color: "text-status-good" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {categories.map(({ label, emoji, extract, suffix, color }) => {
        const sorted = [...decisive].sort((a, b) => extract(b) - extract(a));
        const top = sorted.slice(0, 3);
        return (
          <div key={label} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-3.5 flex flex-col gap-2.5">
            <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50 flex items-center gap-1.5">
              <span>{emoji}</span> {label}
            </p>
            {top.map((d, idx) => (
              <div key={d.player.id} className="flex items-center gap-2">
                <span className={`text-[10px] font-black w-3.5 ${idx === 0 ? color : "text-muted-foreground/35"}`}>{idx + 1}</span>
                <PlayerAvatar nickname={d.player.nickname} avatarUrl={d.player.avatarUrl} size="sm" />
                <Link href={`/players/${d.player.id}`} className="text-xs font-bold text-white/90 hover:text-primary transition-colors truncate flex-1">
                  {d.player.nickname}
                </Link>
                <span className={`text-xs font-black tabular-nums shrink-0 ${idx === 0 ? color : "text-white/70"}`}>
                  {extract(d).toFixed(suffix === "%" ? 1 : 0)}{suffix}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Perfis ──────────────────────────────────────────────────────────────
function PerfisTab({ archetypes }: { archetypes: PlayerArchetype[] }) {
  if (archetypes.length === 0) {
    return <p className="text-sm text-muted-foreground/55 text-center py-8">Perfis ainda não computados.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {archetypes.map((a) => (
        <div key={a.player.id} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-3.5 flex items-center gap-3 hover:bg-white/[0.025] transition-colors">
          <span className="text-lg shrink-0" aria-hidden>{ARCHETYPE_EMOJI[a.archetype] ?? "🎮"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50">{a.label}</p>
            <Link href={`/players/${a.player.id}`} className="text-sm font-black text-white hover:text-primary transition-colors block truncate">
              {a.player.nickname}
            </Link>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-black text-white/80 tabular-nums">{a.metricValue}</p>
            <p className="text-[8px] text-muted-foreground/50 font-semibold mt-0.5">{a.metricLabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MuralCompetitivo({ powerRanking, decisive, archetypes }: MuralCompetitivoProps) {
  const [activeTab, setActiveTab] = useState<Tab>("lideres");

  return (
    <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-white/[0.05]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
              activeTab === id
                ? "border-primary text-white bg-primary/[0.04]"
                : "border-transparent text-muted-foreground/55 hover:text-white/70 hover:bg-white/[0.02]"
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>
      {/* Tab body */}
      <div className="p-5">
        {activeTab === "lideres" && <LideresTab powerRanking={powerRanking} />}
        {activeTab === "impacto" && <ImpactoTab decisive={decisive} />}
        {activeTab === "perfis"  && <PerfisTab archetypes={archetypes} />}
      </div>
    </div>
  );
}
