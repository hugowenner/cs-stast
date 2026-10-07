"use client";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { PlayerAvatar } from "@/components/players/player-avatar";
import Link from "next/link";
import { Trophy, TrendingUp, TrendingDown, Minus, ShieldCheck } from "lucide-react";
import type { PowerRankingEntry, SeasonComparisonEntry } from "@/server/services/competitive.service";
import { FORMA_STYLE } from "@/lib/forma";
import { motion, useReducedMotion } from "framer-motion";

export interface OfficialScoreRankingEntry {
  player: { id: string; nickname: string; avatarUrl: string | null; levelGc?: number | null } | null;
  matchesPlayed: number;
  value: number;
  rHat: number;
  pHat: number;
  confidenceStatus: "PROVISIONAL" | "MEDIUM" | "HIGH";
  isEligible: boolean;
  rawRating: number;
  rawScore: number;
}

interface RankingTableProps {
  entries?: PowerRankingEntry[];
  officialEntries?: OfficialScoreRankingEntry[];
  seasonComparison?: SeasonComparisonEntry[];
  delay?: number;
  className?: string;
}

const PODIUM_COLORS = ["text-yellow-400", "text-slate-300", "text-amber-600"];

function TrendIcon({ forma }: { forma: string }) {
  if (forma === "Excelente" || forma === "Em alta") {
    return <TrendingUp className="size-3 text-status-good shrink-0" />;
  }
  if (forma === "Oscilando") {
    return <TrendingDown className="size-3 text-status-warning shrink-0" />;
  }
  return <Minus className="size-3 text-muted-foreground/40 shrink-0" />;
}

export function RankingTable({
  entries = [],
  officialEntries,
  seasonComparison = [],
  delay = 0.13,
  className = "lg:col-span-2",
}: RankingTableProps) {
  const diffByPlayer = new Map(seasonComparison.map((e) => [e.player.id, e.diff.rating]));
  const prefersReduced = useReducedMotion();

  const isOfficial = Array.isArray(officialEntries) && officialEntries.length > 0;

  if (isOfficial) {
    return (
      <div className={className}>
        <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">Score Oficial da Temporada</p>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  <ShieldCheck className="size-3" /> Modelo 3.5
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/65 mt-0.5">
                Modelo auditado (Score 3.5): desempenho individual, winrate Bayesiano e amostragem elegível (mín. 10 partidas).
              </p>
            </div>
            <Trophy className="size-4 text-status-warning/60" />
          </div>
          <div className="divide-y divide-white/[0.04]">
            {officialEntries.map((entry, index) => {
              if (!entry.player) return null;
              const isTop3 = index < 3;
              const statusColor =
                entry.confidenceStatus === "HIGH"
                  ? "text-status-good bg-status-good/10 border-status-good/20"
                  : "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20";

              return (
                <motion.div
                  key={entry.player.id}
                  initial={{ opacity: 0, y: prefersReduced ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefersReduced ? 0.01 : 0.2,
                    delay: prefersReduced ? 0 : 0.18 + index * 0.055,
                    ease: "easeOut",
                  }}
                  className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.012] transition-colors group/row"
                >
                  {/* Rank */}
                  <span
                    className={`text-xs font-black w-5 shrink-0 text-center tabular-nums ${
                      isTop3 ? PODIUM_COLORS[index] : "text-muted-foreground/40"
                    }`}
                  >
                    {index + 1}
                  </span>

                  {/* Player info */}
                  <Link href={`/players/${entry.player.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                    <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                        {entry.player.nickname}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${statusColor}`}
                        >
                          {entry.confidenceStatus}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40">{entry.matchesPlayed}j</span>
                      </div>
                    </div>
                  </Link>

                  {/* Stats */}
                  <div className="hidden sm:grid grid-cols-5 gap-4 text-center shrink-0">
                    {[
                      { label: "Score (S)", num: entry.value, dec: 3, suf: "", highlight: true },
                      { label: "R_hat", num: entry.rHat, dec: 3, suf: "", highlight: false },
                      { label: "P_hat", num: Math.round(entry.pHat * 100), dec: 0, suf: "%", highlight: false },
                      { label: "Rating", num: entry.rawRating, dec: 2, suf: "", highlight: false },
                      { label: "Partidas", num: entry.matchesPlayed, dec: 0, suf: "j", highlight: false },
                    ].map((col, ci) => (
                      <div key={col.label}>
                        <p className="text-[8px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                          {col.label}
                        </p>
                        <p
                          className={`text-xs font-black mt-0.5 tabular-nums ${
                            col.highlight ? "text-primary font-extrabold text-sm" : "text-white/90"
                          }`}
                        >
                          <AnimatedNumber value={col.num} decimals={col.dec} suffix={col.suf} duration={0.6 + index * 0.04 + ci * 0.02} />
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="sm:hidden text-right shrink-0">
                    <p className="text-sm font-black text-primary tabular-nums">
                      <AnimatedNumber value={entry.value} decimals={3} duration={0.7 + index * 0.04} />
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 font-bold">Score Oficial</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Classificação da Temporada</p>
            <p className="text-[10px] text-muted-foreground/65 mt-0.5">Aqui não existe amizade. Os números decidem.</p>
          </div>
          <Trophy className="size-4 text-status-warning/60" />
        </div>
        <div className="divide-y divide-white/[0.04]">
          {entries.map((entry, index) => {
            const isTop3 = index < 3;
            const diff = diffByPlayer.get(entry.player.id);
            const diffPositive = diff !== undefined && diff > 0;
            const diffNegative = diff !== undefined && diff < 0;
            return (
              <motion.div
                key={entry.player.id}
                initial={{ opacity: 0, y: prefersReduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: prefersReduced ? 0.01 : 0.2,
                  delay: prefersReduced ? 0 : 0.18 + index * 0.055,
                  ease: "easeOut",
                }}
                className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.012] transition-colors group/row"
              >
                {/* Rank */}
                <span className={`text-xs font-black w-5 shrink-0 text-center tabular-nums ${isTop3 ? PODIUM_COLORS[index] : "text-muted-foreground/40"}`}>
                  {index + 1}
                </span>
                {/* Trend arrow */}
                <div className="shrink-0">
                  <TrendIcon forma={entry.forma} />
                </div>
                {/* Player info */}
                <Link href={`/players/${entry.player.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                  <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{entry.player.nickname}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {(() => {
                        const f = FORMA_STYLE[entry.forma] ?? FORMA_STYLE["Oscilando"];
                        return (
                          <span className={`badge-hover inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${f.color} ${f.bg} ${f.border}`}>
                            {f.prefix} {f.text}
                          </span>
                        );
                      })()}
                      {diff !== undefined && (
                        <span className={`text-[9px] font-bold tabular-nums ${diffPositive ? "text-status-good" : diffNegative ? "text-status-warning" : "text-muted-foreground/40"}`}>
                          {diffPositive ? "+" : ""}{diff.toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/40">{entry.matchCount}j</span>
                    </div>
                  </div>
                </Link>
                {/* Stats */}
                <div className="hidden sm:grid grid-cols-5 gap-4 text-center shrink-0">
                  {[
                    { label: "Rating", num: entry.rating,  dec: 2, suf: "",  dur: 0.7 },
                    { label: "ADR",    num: entry.adr,     dec: 0, suf: "",  dur: 0.6 },
                    { label: "K/D",    num: entry.kd,      dec: 2, suf: "",  dur: 0.65 },
                    { label: "KAST",   num: entry.kast,    dec: 0, suf: "%", dur: 0.55 },
                    { label: "WR",     num: entry.winrate, dec: 0, suf: "%", dur: 0.55 },
                  ].map((col, ci) => (
                    <div key={col.label}>
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground/60 font-bold">{col.label}</p>
                      <p className="text-xs font-black mt-0.5 text-white/90 tabular-nums">
                        <AnimatedNumber value={col.num} decimals={col.dec} suffix={col.suf} duration={col.dur + index * 0.04 + ci * 0.02} />
                      </p>
                    </div>
                  ))}
                </div>
                <div className="sm:hidden text-right shrink-0">
                  <p className="text-sm font-black text-white/90 tabular-nums">
                    <AnimatedNumber value={entry.rating} decimals={2} duration={0.7 + index * 0.04} />
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 font-bold">Rating</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

