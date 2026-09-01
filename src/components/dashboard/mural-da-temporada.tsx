"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Zap, Target, Compass, Flame, Swords, Award, TrendingUp } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { DashboardCompetitiveBundle } from "@/server/services/competitive.service";

interface MuralDaTemporadaProps {
  competitive: DashboardCompetitiveBundle;
}

export function MuralDaTemporada({ competitive }: MuralDaTemporadaProps) {
  const {
    powerRanking,
    decisive,
    archetypes,
    mapSpecialists,
    hotStreaks,
    topGainers,
    jogadorDaSemana,
    duos,
    dominantTrio,
    bestRecentDuo,
  } = competitive;

  // --- Card 1: Líderes da Temporada ---
  type MetricType = "rating" | "adr" | "hs" | "kd" | "winrate";
  const [activeMetric, setActiveMetric] = useState<MetricType>("rating");

  const metricsMeta: Record<MetricType, { label: string; suffix: string; decimals: number }> = {
    rating: { label: "Rating", suffix: "", decimals: 2 },
    adr: { label: "ADR", suffix: "", decimals: 0 },
    hs: { label: "HS%", suffix: "%", decimals: 0 },
    kd: { label: "K/D", suffix: "", decimals: 2 },
    winrate: { label: "WR", suffix: "%", decimals: 0 },
  };

  const getSortedLeaders = () => {
    const list = [...powerRanking];
    switch (activeMetric) {
      case "rating":
        return list.sort((a, b) => b.rating - a.rating).slice(0, 3);
      case "adr":
        return list.sort((a, b) => b.adr - a.adr).slice(0, 3);
      case "hs":
        return list.sort((a, b) => b.hsPercent - a.hsPercent).slice(0, 3);
      case "kd":
        return list.sort((a, b) => b.kd - a.kd).slice(0, 3);
      case "winrate":
        return list.sort((a, b) => b.winrate - a.winrate).slice(0, 3);
    }
  };

  const leaders = getSortedLeaders();
  const activeMeta = metricsMeta[activeMetric];

  // Medals & Podium Colors
  const podiumColors = ["text-status-warning", "text-slate-300", "text-[#c97a48]"];
  const podiumBadges = ["🥇", "🥈", "🥉"];

  // --- Card 2: Jogadores de Impacto ---
  const maxImpactPlayer = [...decisive].sort((a, b) => b.impactPercent - a.impactPercent)[0] ?? null;
  const maxEntryPlayer = [...decisive].sort((a, b) => b.entryKills - a.entryKills)[0] ?? null;
  const maxClutchesPlayer = [...decisive].sort((a, b) => b.clutchWins - a.clutchWins)[0] ?? null;

  // --- Card 3: Especialistas ---
  const getSpecialist = (role: "headshot" | "impact" | "entry" | "support" | "consistent") => {
    const match = archetypes.find((a) => a.archetype === role);
    if (match) {
      return {
        player: match.player,
        label: match.label,
        value: match.metricValue,
      };
    }

    // Fallbacks
    if (role === "headshot") {
      const leader = [...powerRanking].sort((a, b) => b.hsPercent - a.hsPercent)[0];
      if (leader) return { player: leader.player, label: "Headshot Machine", value: `${leader.hsPercent}% HS` };
    } else if (role === "impact") {
      const leader = [...powerRanking].sort((a, b) => b.impact - a.impact)[0];
      if (leader) return { player: leader.player, label: "Rifler de Impacto", value: `${leader.impact} Impacto` };
    } else if (role === "entry") {
      const leader = [...decisive].sort((a, b) => b.entryKills - a.entryKills)[0];
      if (leader) return { player: leader.player, label: "Entry Fragger", value: `${leader.entryKills} Entry` };
    } else if (role === "support") {
      const matchSupport = archetypes.find((a) => a.archetype === "tactician" || a.archetype === "support");
      if (matchSupport) return { player: matchSupport.player, label: matchSupport.label, value: matchSupport.metricValue };
      const leader = [...decisive].sort((a, b) => b.tradeKills - a.tradeKills)[0];
      if (leader) return { player: leader.player, label: "Melhor Suporte", value: `${leader.tradeKills} Trades` };
    } else if (role === "consistent") {
      const leader = [...powerRanking].sort((a, b) => b.kast - a.kast)[0];
      if (leader) return { player: leader.player, label: "Mais Consistente", value: `${leader.kast}% KAST` };
    }
    return null;
  };

  const specialists = [
    { role: "headshot" as const, emoji: "🎯", title: "Melhor Mira (HS%)" },
    { role: "impact" as const, emoji: "⚡", title: "Rifler de Impacto" },
    { role: "entry" as const, emoji: "🔥", title: "Entry Fragger" },
    { role: "support" as const, emoji: "🤝", title: "Melhor Suporte" },
    { role: "consistent" as const, emoji: "🛡️", title: "Mais Consistente" },
  ]
    .map((s) => {
      const spec = getSpecialist(s.role);
      return spec ? { ...s, ...spec } : null;
    })
    .filter(Boolean);

  // --- Card 4: Reis dos Mapas ---
  const mapSpecialistList = mapSpecialists.slice(0, 4);

  // --- Card 5: Forma Atual ---
  const activeHotStreak = hotStreaks.find((s) => s.type === "hot") ?? null;
  const bestEvolution = topGainers[0] ?? null;

  // --- Card 6: Melhores Conexões ---
  const primaryDuo = duos[0] ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. 🏆 Líderes da Temporada */}
      <div className="glass-panel border-white/[0.07] p-4 rounded-2xl flex flex-col justify-between hover:border-white/[0.1] transition-all min-h-[220px]">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Top da Temporada</p>
              <h3 className="text-sm font-black text-white">Classificação</h3>
            </div>
            <Trophy className="size-4 text-status-warning/70" />
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1 no-scrollbar border-b border-white/[0.04]">
            {(Object.keys(metricsMeta) as MetricType[]).map((metric) => (
              <button
                key={metric}
                onClick={() => setActiveMetric(metric)}
                className={`text-[9px] font-black uppercase px-2 py-1 rounded-md transition-all border shrink-0 ${
                  activeMetric === metric
                    ? "bg-primary text-black border-primary shadow-[0_0_8px_0_rgba(var(--primary-rgb),0.1)]"
                    : "text-muted-foreground/75 border-transparent bg-white/[0.01] hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {metricsMeta[metric].label}
              </button>
            ))}
          </div>

          {/* Leaders List */}
          <div className="flex flex-col gap-2">
            {leaders.map((entry, index) => {
              const val =
                activeMetric === "rating"
                  ? entry.rating
                  : activeMetric === "adr"
                    ? entry.adr
                    : activeMetric === "hs"
                      ? entry.hsPercent
                      : activeMetric === "kd"
                        ? entry.kd
                        : entry.winrate;

              return (
                <div key={entry.player.id} className="flex items-center justify-between py-0.5 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-[11px] font-black w-4 text-center ${podiumColors[index] || "text-muted-foreground/45"}`}>
                      {podiumBadges[index] || `${index + 1}`}
                    </span>
                    <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                    <Link
                      href={`/players/${entry.player.id}`}
                      className="text-xs font-bold text-white/90 hover:text-primary transition-colors truncate"
                    >
                      {entry.player.nickname}
                    </Link>
                  </div>
                  <p className="text-xs font-black text-white/90 tabular-nums">
                    <AnimatedNumber value={val} decimals={activeMeta.decimals} suffix={activeMeta.suffix} />
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. 💥 Jogadores de Impacto */}
      <div className="glass-panel border-white/[0.07] p-4 rounded-2xl flex flex-col justify-between hover:border-white/[0.1] transition-all min-h-[220px]">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Performance Pura</p>
              <h3 className="text-sm font-black text-white">Jogadores de Impacto</h3>
            </div>
            <Zap className="size-4 text-primary/70" />
          </div>

          <div className="flex flex-col gap-3">
            {/* Impact in rounds */}
            {maxImpactPlayer && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs shrink-0" aria-hidden>⚡</span>
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none mb-0.5">Impacto nos Rounds</p>
                    <Link href={`/players/${maxImpactPlayer.player.id}`} className="text-xs font-black text-white hover:text-primary transition-colors block truncate">
                      {maxImpactPlayer.player.nickname}
                    </Link>
                  </div>
                </div>
                <p className="text-xs font-black text-white/90 tabular-nums">
                  <AnimatedNumber value={maxImpactPlayer.impactPercent} decimals={1} suffix="%" />
                </p>
              </div>
            )}

            {/* Entry Kills */}
            {maxEntryPlayer && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs shrink-0" aria-hidden>🔥</span>
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none mb-0.5">Entry Kills</p>
                    <Link href={`/players/${maxEntryPlayer.player.id}`} className="text-xs font-black text-white hover:text-primary transition-colors block truncate">
                      {maxEntryPlayer.player.nickname}
                    </Link>
                  </div>
                </div>
                <p className="text-xs font-black text-white/90 tabular-nums">
                  <AnimatedNumber value={maxEntryPlayer.entryKills} decimals={0} suffix=" Kills" />
                </p>
              </div>
            )}

            {/* Clutches */}
            {maxClutchesPlayer && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs shrink-0" aria-hidden>🧠</span>
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none mb-0.5">Clutches Vencidos</p>
                    <Link href={`/players/${maxClutchesPlayer.player.id}`} className="text-xs font-black text-white hover:text-primary transition-colors block truncate">
                      {maxClutchesPlayer.player.nickname}
                    </Link>
                  </div>
                </div>
                <p className="text-xs font-black text-white/90 tabular-nums">
                  <AnimatedNumber value={maxClutchesPlayer.clutchWins} decimals={0} suffix=" Clutches" />
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 🎯 Especialistas */}
      <div className="glass-panel border-white/[0.07] p-4 rounded-2xl flex flex-col justify-between hover:border-white/[0.1] transition-all min-h-[220px]">
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Arquétipos Ativos</p>
              <h3 className="text-sm font-black text-white">Especialistas</h3>
            </div>
            <Target className="size-4 text-accent-cyan/70" />
          </div>

          <div className="flex flex-col gap-2">
            {specialists.map((spec) => {
              if (!spec) return null;
              return (
                <div key={spec.role} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs shrink-0" aria-hidden>{spec.emoji}</span>
                    <span className="text-[10px] font-bold text-muted-foreground/60 w-24 shrink-0 truncate">{spec.title}</span>
                    <PlayerAvatar nickname={spec.player.nickname} avatarUrl={spec.player.avatarUrl} size="sm" />
                    <Link href={`/players/${spec.player.id}`} className="text-xs font-bold text-white hover:text-primary transition-colors truncate">
                      {spec.player.nickname}
                    </Link>
                  </div>
                  <span className="text-[10px] font-black text-white/80 shrink-0 bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5 rounded">
                    {spec.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. 🗺️ Reis dos Mapas */}
      <div className="glass-panel border-white/[0.07] p-4 rounded-2xl flex flex-col justify-between hover:border-white/[0.1] transition-all min-h-[220px]">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Soberania por Mapa</p>
              <h3 className="text-sm font-black text-white">Especialistas por Mapa</h3>
            </div>
            <Compass className="size-4 text-accent-violet/70" />
          </div>

          {mapSpecialistList.length === 0 ? (
            <p className="text-xs text-muted-foreground/55 text-center py-6">Nenhum especialista em mapa identificado.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {mapSpecialistList.map((spec) => (
                <div key={spec.mapName} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-white/85 truncate">{spec.mapName}</span>
                    <span className="text-[10px] font-semibold text-status-warning leading-none shrink-0" aria-hidden>👑</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 min-w-0">
                    <PlayerAvatar nickname={spec.player.nickname} avatarUrl={spec.player.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <Link href={`/players/${spec.player.id}`} className="text-[10px] font-bold text-white hover:text-primary transition-colors block truncate leading-none">
                        {spec.player.nickname}
                      </Link>
                      <p className="text-[9px] font-black text-muted-foreground/50 tabular-nums leading-none mt-1">
                        <AnimatedNumber value={spec.rating} decimals={2} />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. 🔥 Forma Atual */}
      <div className="glass-panel border-white/[0.07] p-4 rounded-2xl flex flex-col justify-between hover:border-white/[0.1] transition-all min-h-[220px]">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Histórias da Semana</p>
              <h3 className="text-sm font-black text-white">Forma Atual</h3>
            </div>
            <Flame className="size-4 text-status-warning/70" />
          </div>

          <div className="flex flex-col gap-3">
            {/* Hot streak */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs shrink-0" aria-hidden>🔥</span>
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none mb-0.5">Sequência ativa</p>
                  {activeHotStreak ? (
                    <Link href={`/players/${activeHotStreak.player.id}`} className="text-xs font-black text-white hover:text-primary transition-colors block truncate">
                      {activeHotStreak.player.nickname}
                    </Link>
                  ) : (
                    <p className="text-xs font-bold text-muted-foreground/60">Ninguém em alta</p>
                  )}
                </div>
              </div>
              {activeHotStreak && (
                <p className="text-xs font-black text-status-warning tabular-nums">
                  <AnimatedNumber value={activeHotStreak.streak} decimals={0} suffix=" vitórias" />
                </p>
              )}
            </div>

            {/* Maior evolução */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs shrink-0" aria-hidden>📈</span>
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none mb-0.5">Melhor evolução</p>
                  {bestEvolution ? (
                    <Link href={`/players/${bestEvolution.player.id}`} className="text-xs font-black text-white hover:text-primary transition-colors block truncate">
                      {bestEvolution.player.nickname}
                    </Link>
                  ) : (
                    <p className="text-xs font-bold text-muted-foreground/60">Sem dados</p>
                  )}
                </div>
              </div>
              {bestEvolution && (
                <p className="text-xs font-black text-status-good tabular-nums">
                  +<AnimatedNumber value={bestEvolution.diff.rating} decimals={2} />
                </p>
              )}
            </div>

            {/* Destaque da semana */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs shrink-0" aria-hidden>⭐</span>
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none mb-0.5">Destaque da semana</p>
                  {jogadorDaSemana ? (
                    <Link href={`/players/${jogadorDaSemana.player.id}`} className="text-xs font-black text-white hover:text-primary transition-colors block truncate">
                      {jogadorDaSemana.player.nickname}
                    </Link>
                  ) : (
                    <p className="text-xs font-bold text-muted-foreground/60">Sem destaque</p>
                  )}
                </div>
              </div>
              {jogadorDaSemana && (
                <p className="text-xs font-black text-white/95 tabular-nums">
                  <AnimatedNumber value={jogadorDaSemana.rating} decimals={2} />
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. 🤝 Melhores Conexões */}
      <div className="glass-panel border-white/[0.07] p-4 rounded-2xl flex flex-col justify-between hover:border-white/[0.1] transition-all min-h-[220px]">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Dinâmicas do Grupo</p>
              <h3 className="text-sm font-black text-white">Duplas que funcionam</h3>
            </div>
            <Swords className="size-4 text-accent-violet/70" />
          </div>

          <div className="flex flex-col gap-3">
            {/* Melhor dupla */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs shrink-0" aria-hidden>🤝</span>
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none mb-0.5">Duplas que funcionam</p>
                  {primaryDuo ? (
                    <p className="text-xs font-black text-white truncate">
                      {primaryDuo.playerA.nickname} + {primaryDuo.playerB.nickname}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-muted-foreground/60">Sem dados</p>
                  )}
                </div>
              </div>
              {primaryDuo && (
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-white/90 leading-none tabular-nums">
                    <AnimatedNumber value={primaryDuo.winrate} decimals={0} suffix="%" />
                  </p>
                  <p className="text-[8px] text-muted-foreground/50 font-bold leading-none mt-0.5 tabular-nums">{primaryDuo.total}j</p>
                </div>
              )}
            </div>

            {/* Trio Dominante */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs shrink-0" aria-hidden>👑</span>
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none mb-0.5">Trio Dominante</p>
                  {dominantTrio ? (
                    <p className="text-xs font-black text-white truncate">
                      {dominantTrio.players.map((p) => p.nickname).join(" + ")}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-muted-foreground/60">Sem dados</p>
                  )}
                </div>
              </div>
              {dominantTrio && (
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-white/90 leading-none tabular-nums">
                    <AnimatedNumber value={dominantTrio.winrate} decimals={0} suffix="%" />
                  </p>
                  <p className="text-[8px] text-muted-foreground/50 font-bold leading-none mt-0.5 tabular-nums">{dominantTrio.total}j</p>
                </div>
              )}
            </div>

            {/* Dupla recente quente */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs shrink-0" aria-hidden>🔥</span>
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground/50 leading-none mb-0.5">Dupla Quente (Recente)</p>
                  {bestRecentDuo ? (
                    <p className="text-xs font-black text-white truncate">
                      {bestRecentDuo.playerA.nickname} + {bestRecentDuo.playerB.nickname}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-muted-foreground/60">Sem dados</p>
                  )}
                </div>
              </div>
              {bestRecentDuo && (
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-white/90 leading-none tabular-nums">
                    <AnimatedNumber value={bestRecentDuo.winrate} decimals={0} suffix="%" />
                  </p>
                  <p className="text-[8px] text-muted-foreground/50 font-bold leading-none mt-0.5 tabular-nums">{bestRecentDuo.total}j</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
