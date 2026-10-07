"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Trophy, Zap, Compass, Crosshair, Target, Shield, Flame, Activity } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { TacticalTabs } from "@/components/ui/tactical-tabs";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import type { PowerRankingEntry, DecisivePlayerEntry, PlayerArchetype } from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";

export interface MuralCompetitivoProps {
  powerRanking: PowerRankingEntry[];
  decisive: DecisivePlayerEntry[];
  archetypes: PlayerArchetype[];
}

type MetricKey = "rating" | "adr" | "hs" | "kd" | "winrate";

const METRICS: { key: MetricKey; label: string; suffix: string; decimals: number }[] = [
  { key: "rating",   label: "Rating 2.0", suffix: "",  decimals: 2 },
  { key: "adr",      label: "ADR",        suffix: "",  decimals: 0 },
  { key: "hs",       label: "HS%",        suffix: "%", decimals: 0 },
  { key: "kd",       label: "K/D",        suffix: "",  decimals: 2 },
  { key: "winrate",  label: "Winrate",    suffix: "%", decimals: 0 },
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

const ARCHETYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  entry:      Flame,
  clutch:     Shield,
  headshot:   Crosshair,
  consistent: Target,
  tactician:  Compass,
  impact:     Zap,
  support:    Activity,
};

// ─── Tab 1: Líderes por Métrica ──────────────────────────────────────────────
function LideresTab({ powerRanking }: { powerRanking: PowerRankingEntry[] }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("rating");
  const meta = METRICS.find((m) => m.key === activeMetric)!;
  const leaders = [...powerRanking].sort((a, b) => getValue(b, activeMetric) - getValue(a, activeMetric)).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Metric Selector Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {METRICS.map((m) => {
          const isActive = activeMetric === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={cn(
                "text-[10px] font-mono font-bold uppercase px-3 py-1.5 rounded-xs border transition-micro cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-surface-deck text-muted-foreground/80 border-border/50 hover:border-border hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Leaderboard Rows */}
      <div className="flex flex-col divide-y divide-border/30 border border-border/40 rounded-xs overflow-hidden bg-surface-deck/40">
        {leaders.map((entry, idx) => {
          const val = getValue(entry, activeMetric);
          const rank = idx + 1;
          const isTop1 = rank === 1;
          const isTop3 = rank <= 3;

          return (
            <div
              key={entry.player.id}
              className="flex items-center justify-between gap-3 py-2.5 px-3 hover:bg-surface-elevated/30 transition-micro group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn(
                    "font-mono text-xs font-black w-6 text-center shrink-0 tabular-nums",
                    isTop1
                      ? "text-gold"
                      : isTop3
                        ? "text-foreground font-bold"
                        : "text-muted-foreground/40"
                  )}
                >
                  #{rank}
                </span>
                <PlayerAvatar
                  nickname={entry.player.nickname}
                  avatarUrl={entry.player.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex items-baseline gap-2">
                  <Link
                    href={`/players/${entry.player.id}`}
                    className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate"
                  >
                    {entry.player.nickname}
                  </Link>
                  <span className="text-[10px] font-mono text-muted-foreground/50">
                    {entry.matchCount}p
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-1 text-right shrink-0">
                <span
                  className={cn(
                    "font-mono text-sm font-bold tabular-nums",
                    isTop1 ? "text-gold font-black" : "text-foreground"
                  )}
                >
                  <AnimatedNumber value={val} decimals={meta.decimals} suffix={meta.suffix} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab 2: Impacto & Duelos ──────────────────────────────────────────────────
function ImpactoTab({ decisive }: { decisive: DecisivePlayerEntry[] }) {
  if (decisive.length === 0) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Dados insuficientes para análise de impacto na temporada.
      </p>
    );
  }

  const categories: {
    label: string;
    description: string;
    extract: (d: DecisivePlayerEntry) => number;
    suffix: string;
    accent: "orange" | "gold" | "cyan" | "green" | "muted";
  }[] = [
    { label: "IMPACTO TOTAL %",     description: "Aberturas + trades + clutches", extract: (d) => d.impactPercent,   suffix: "%", accent: "orange" },
    { label: "OPENING DUELS WR%",   description: "Taxa de vitória no 1º duelo",   extract: (d) => d.openingWinrate,  suffix: "%", accent: "cyan" },
    { label: "OPENING KILLS",       description: "Total de abates em abertura",   extract: (d) => d.entryKills,      suffix: "",  accent: "orange" },
    { label: "EFICIÊNCIA EM TRADE", description: "Mortes de aliados vingadas",    extract: (d) => d.tradeEfficiency, suffix: "%", accent: "green" },
    { label: "CLUTCHES GANHOS",     description: "Rounds 1vX vencidos",           extract: (d) => d.clutchWins,      suffix: "",  accent: "gold" },
    { label: "TRADES CONCRETIZADOS",description: "Kills em resposta rápida",      extract: (d) => d.tradeKills,      suffix: "",  accent: "muted" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {categories.map(({ label, description, extract, suffix, accent }) => {
        const sorted = [...decisive].sort((a, b) => extract(b) - extract(a));
        const top = sorted.slice(0, 3);
        return (
          <div
            key={label}
            className="flex flex-col justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs"
          >
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground block">
                {label}
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-sans block mt-0.5">
                {description}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border/30 pt-2">
              {top.map((d, idx) => (
                <div key={d.player.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "font-mono text-[10px] font-black w-3 text-center",
                        idx === 0 ? "text-gold" : "text-muted-foreground/50"
                      )}
                    >
                      #{idx + 1}
                    </span>
                    <PlayerAvatar
                      nickname={d.player.nickname}
                      avatarUrl={d.player.avatarUrl}
                      size="sm"
                    />
                    <Link
                      href={`/players/${d.player.id}`}
                      className="font-medium text-muted-foreground hover:text-foreground transition-micro truncate"
                    >
                      {d.player.nickname}
                    </Link>
                  </div>
                  <span
                    className={cn(
                      "font-mono font-bold tabular-nums shrink-0",
                      idx === 0 ? "text-foreground font-black" : "text-muted-foreground/75"
                    )}
                  >
                    {extract(d).toFixed(0)}{suffix}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab 3: Perfis & Arquétipos ───────────────────────────────────────────────
function PerfisTab({ archetypes }: { archetypes: PlayerArchetype[] }) {
  if (archetypes.length === 0) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Perfis competitivos ainda não computados para esta temporada.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {archetypes.map((a) => {
        const IconComponent = ARCHETYPE_ICONS[a.archetype] ?? Crosshair;
        return (
          <div
            key={a.player.id}
            className="flex items-center justify-between gap-3 p-3.5 bg-surface-deck border border-border/50 rounded-xs hover:border-border/80 transition-micro"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 items-center justify-center rounded-xs bg-primary/10 border border-primary/20 text-primary shrink-0">
                <IconComponent className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">
                  {a.label}
                </span>
                <Link
                  href={`/players/${a.player.id}`}
                  className="text-xs font-black text-foreground hover:text-primary transition-micro block truncate"
                >
                  {a.player.nickname}
                </Link>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono text-xs font-bold text-foreground tabular-nums block">
                {a.metricValue}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50 block">
                {a.metricLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MuralCompetitivo({
  powerRanking,
  decisive,
  archetypes,
}: MuralCompetitivoProps) {
  const [activeTab, setActiveTab] = useState<string>("lideres");
  const prefersReduced = useReducedMotion();
  const xOffset = prefersReduced ? 0 : 8;

  const tabs = [
    { id: "lideres", label: "Líderes de Desempenho", icon: Trophy },
    { id: "impacto", label: "Impacto & Duelos", icon: Zap },
    { id: "perfis",  label: "Perfis & Arquétipos", icon: Compass },
  ];

  return (
    <div className="bg-surface-panel border border-border/60 rounded-sm overflow-hidden flex flex-col">
      {/* Tactical Tabs Navigation */}
      <div className="p-3 border-b border-border/40 bg-surface-deck/40">
        <TacticalTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab Body */}
      <div className="p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: xOffset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -xOffset }}
            transition={{ duration: prefersReduced ? 0.01 : 0.18, ease: [0.25, 0, 0, 1] }}
          >
            {activeTab === "lideres" && <LideresTab powerRanking={powerRanking} />}
            {activeTab === "impacto" && <ImpactoTab decisive={decisive} />}
            {activeTab === "perfis"  && <PerfisTab archetypes={archetypes} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
