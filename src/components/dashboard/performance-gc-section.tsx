"use client";

import * as React from "react";
import { useState } from "react";
import { Zap, Star, Trophy, ShieldCheck, Crosshair, Target, EyeOff, Flame, Crown } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import Link from "next/link";
import { TacticalTabs } from "@/components/ui/tactical-tabs";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { MetricDisplay } from "@/components/ui/metric-display";
import type {
  AdvancedPerformanceStats,
  ClutchesBundle,
  CombatBundle,
} from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";

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

export interface PerformanceGcSectionProps {
  stats: AdvancedPerformanceStats;
  multikillsLeaderboards: MultikillsLeaderboards;
  clutchesBundle?: ClutchesBundle;
  combatBundle?: CombatBundle;
}

// ─── Tab: Performance ─────────────────────────────────────────────────────────
function PerformanceTab({ stats }: { stats: AdvancedPerformanceStats }) {
  if (stats.sampleSize === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs font-mono font-bold text-foreground/80 uppercase tracking-wider">
          Dados Gamers Club ainda não disponíveis
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-sm mx-auto leading-relaxed">
          As partidas desta temporada ainda não possuem estatísticas de dano ou ratings originais da Gamers Club sincronizados.
        </p>
      </div>
    );
  }

  const tiles = [
    { label: "DANO MÉDIO",   value: stats.averageDamage != null ? Math.round(stats.averageDamage) : "—", context: "ADR Médio", accent: "muted" as const },
    { label: "GC RATING",    value: stats.averageGcRating != null ? stats.averageGcRating.toFixed(2) : "—", context: "Rating GC", accent: "gold" as const },
    { label: "TOTAL 2Ks",    value: stats.totalDoubleKills ?? "—", context: "Double Kills", accent: "muted" as const },
    { label: "TOTAL 3Ks",    value: stats.totalTripleKills ?? "—", context: "Triple Kills", accent: "green" as const },
    { label: "TOTAL 4Ks",    value: stats.totalQuadKills ?? "—", context: "Quad Kills", accent: "orange" as const },
    { label: "TOTAL ACES",   value: stats.totalAces ?? "—", context: "Aces (5K)", accent: "gold" as const },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map(({ label, value, context, accent }) => (
          <div
            key={label}
            className="flex flex-col justify-between p-3.5 bg-surface-deck border border-border/50 rounded-xs text-center"
          >
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              {label}
            </span>
            <span className="text-xl sm:text-2xl font-mono font-black text-foreground my-1 tabular-nums">
              {value}
            </span>
            <span className="text-[10px] text-muted-foreground/50 font-mono">
              {context}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-mono text-muted-foreground/50 text-center">
        Amostra baseada em {stats.sampleSize} partidas com dados avançados
      </p>
    </div>
  );
}

// ─── Tab: Multikills ──────────────────────────────────────────────────────────
function MultikillsTab({ leaderboards }: { leaderboards: MultikillsLeaderboards }) {
  const categories = [
    {
      key: "aces" as const,
      title: "Aces",
      badge: "5K",
      badgeVariant: "gold" as const,
      icon: Crown,
      colorText: "text-gold",
      featuredBg: "bg-gold/[0.07] border-gold/30 hover:border-gold/50",
      barColor: "bg-gold",
    },
    {
      key: "quadKills" as const,
      title: "Quad Kills",
      badge: "4K",
      badgeVariant: "warning" as const,
      icon: Flame,
      colorText: "text-amber-400",
      featuredBg: "bg-amber-500/[0.07] border-amber-500/30 hover:border-amber-500/50",
      barColor: "bg-amber-400",
    },
    {
      key: "tripleKills" as const,
      title: "Triple Kills",
      badge: "3K",
      badgeVariant: "good" as const,
      icon: Target,
      colorText: "text-status-good",
      featuredBg: "bg-status-good/[0.07] border-status-good/30 hover:border-status-good/50",
      barColor: "bg-status-good",
    },
    {
      key: "doubleKills" as const,
      title: "Double Kills",
      badge: "2K",
      badgeVariant: "info" as const,
      icon: Crosshair,
      colorText: "text-cyan-400",
      featuredBg: "bg-cyan-500/[0.07] border-cyan-500/30 hover:border-cyan-500/50",
      barColor: "bg-cyan-400",
    },
  ];

  const hasAnyData = categories.some((c) => leaderboards[c.key]?.length > 0);

  if (!hasAnyData) {
    return (
      <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
        <Trophy className="size-8 text-muted-foreground/30 mb-1" />
        <p className="text-xs font-mono font-bold text-foreground">
          Nenhuma multikill registrada nesta temporada.
        </p>
        <p className="text-[11px] font-mono text-muted-foreground/60 max-w-sm">
          Acompanhe as eliminações múltiplas (2K, 3K, 4K e Aces) assim que as partidas forem disputadas.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
      {categories.map((cat) => {
        const entries = leaderboards[cat.key] ?? [];
        const Icon = cat.icon;

        // Se uma categoria não tem registros, mas outras têm dados:
        // Mantém o card para balancear o grid 2x2, com mensagem elegante e alinhamento no topo
        if (entries.length === 0) {
          return (
            <div
              key={cat.key}
              className="flex flex-col justify-start p-3.5 bg-surface-deck border border-border/50 rounded-xs h-full"
            >
              {/* Header compacto */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={cn("size-3.5 shrink-0", cat.colorText)} />
                  <span className="text-xs sm:text-[13px] font-mono font-bold uppercase tracking-[0.14em] text-foreground truncate">
                    {cat.title}
                  </span>
                </div>
                <TacticalBadge label={cat.badge} variant={cat.badgeVariant} size="xs" />
              </div>

              <div className="py-8 text-center my-auto">
                <p className="text-[11px] font-mono text-muted-foreground/60">
                  {`Nenhum registro de ${cat.title.toLowerCase()} no período.`}
                </p>
              </div>
            </div>
          );
        }

        const maxCount = entries[0]?.count || 1;
        const leader = entries[0];
        const rest = entries.slice(1, 6);

        return (
          <div
            key={cat.key}
            className="flex flex-col justify-start p-3.5 bg-surface-deck border border-border/50 rounded-xs h-full"
          >
            {/* Header compacto */}
            <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={cn("size-3.5 shrink-0", cat.colorText)} />
                <span className="text-xs sm:text-[13px] font-mono font-bold uppercase tracking-[0.14em] text-foreground truncate">
                  {cat.title}
                </span>
              </div>
              <TacticalBadge label={cat.badge} variant={cat.badgeVariant} size="xs" />
            </div>

            {/* Conteúdo começando logo abaixo do cabeçalho (sem justify-between que empurre para o rodapé) */}
            <div className="flex flex-col gap-2 pt-2.5 flex-1 justify-start">
              {/* ─── Destaque: 1ª Linha (#1 Líder do Card) ─── */}
              {leader && (
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 p-2.5 rounded-xs border transition-micro",
                    cat.featuredBg
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "font-mono text-xs font-black w-4 text-center shrink-0 tabular-nums",
                        cat.colorText
                      )}
                    >
                      #1
                    </span>
                    <PlayerAvatar
                      nickname={leader.nickname}
                      avatarUrl={leader.avatarUrl}
                      size="sm"
                    />
                    <Link
                      href={`/players/${leader.playerId}`}
                      className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-micro truncate block"
                    >
                      {leader.nickname}
                    </Link>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Barra horizontal sutil proporcional (100% no líder) */}
                    <div className="w-14 sm:w-20 h-1.5 bg-surface-base/80 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none opacity-85",
                          cat.barColor
                        )}
                        style={{ width: "100%" }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-sm sm:text-base font-black tabular-nums text-right min-w-[22px]",
                        cat.colorText
                      )}
                    >
                      {leader.count}
                    </span>
                  </div>
                </div>
              )}

              {/* ─── Demais Linhas (#2 em diante) ─── */}
              {rest.length > 0 && (
                <div className="flex flex-col gap-1 pt-0.5">
                  {rest.map((p, idx) => {
                    const rank = idx + 2;
                    const ratio = Math.max(0, Math.min(1, p.count / maxCount));
                    const percentage = Math.round(ratio * 100);

                    return (
                      <div
                        key={p.playerId}
                        className="flex items-center justify-between gap-2.5 px-2 py-1.5 rounded-xs hover:bg-surface-elevated/40 transition-micro"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground/60 w-4 text-center shrink-0 tabular-nums">
                            #{rank}
                          </span>
                          <PlayerAvatar
                            nickname={p.nickname}
                            avatarUrl={p.avatarUrl}
                            size="xs"
                          />
                          <Link
                            href={`/players/${p.playerId}`}
                            className="text-xs font-medium text-foreground/85 hover:text-primary transition-micro truncate block"
                          >
                            {p.nickname}
                          </Link>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {/* Barra horizontal sutil proporcional */}
                          <div className="w-14 sm:w-20 h-1.5 bg-surface-base/80 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none opacity-60",
                                cat.barColor
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-muted-foreground/90 tabular-nums text-right min-w-[22px]">
                            {p.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Clutches ────────────────────────────────────────────────────────────
function ClutchesTab({ clutches }: { clutches?: ClutchesBundle }) {
  if (!clutches || clutches.totalAttempts === 0) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Nenhum clutch registrado na temporada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1vX Tiers breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {clutches.tiers.map((t) => (
          <div
            key={t.tier}
            className="flex flex-col justify-between p-3 bg-surface-deck border border-border/50 rounded-xs text-center"
          >
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/60">
              {t.tier}
            </span>
            <span className="font-mono text-base font-black text-foreground mt-0.5 tabular-nums">
              {t.wins} / {t.attempts}
            </span>
            <span className="text-[10px] font-mono font-bold text-cyan-400 mt-0.5">
              {t.winrate}% WR
            </span>
          </div>
        ))}
      </div>

      {/* Leaderboard dos Clutchers */}
      {clutches.leaders.length > 0 && (
        <div className="flex flex-col gap-2 p-3.5 bg-surface-deck border border-border/50 rounded-xs">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-foreground">
            Líderes em Situações 1vX
          </span>
          <div className="flex flex-col gap-1.5 border-t border-border/30 pt-2">
            {clutches.leaders.map((p, idx) => (
              <div
                key={p.playerId}
                className="flex items-center justify-between gap-3 py-1 px-1 rounded-xs hover:bg-surface-elevated/30 transition-micro"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "font-mono text-[10px] font-black w-3 text-center",
                      idx === 0 ? "text-gold" : "text-muted-foreground/40"
                    )}
                  >
                    #{idx + 1}
                  </span>
                  <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                  <Link
                    href={`/players/${p.playerId}`}
                    className="text-xs font-bold text-foreground hover:text-primary truncate"
                  >
                    {p.nickname}
                  </Link>
                </div>
                <div className="flex items-baseline gap-3 text-xs font-mono">
                  <span className="text-muted-foreground/60 text-[10px]">
                    {p.clutchWins}V / {p.clutchAttempts} tentativas
                  </span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      idx === 0 ? "text-gold font-black" : "text-foreground"
                    )}
                  >
                    {p.winrate}% WR
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Combate ─────────────────────────────────────────────────────────────
function CombatTab({ combat }: { combat?: CombatBundle }) {
  if (!combat) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Dados de telemetria de combate ainda não disponíveis.
      </p>
    );
  }

  const tiles = [
    { label: "SKILL KILLS",    description: "Wallbang + Smoke + No Scope + Flash", value: combat.totalSkillKills, accent: "primary" as const },
    { label: "WALLBANGS",      description: "Eliminações através de paredes",      value: combat.wallbangKills,    accent: "orange" as const },
    { label: "THROUGH SMOKE",  description: "Eliminações através de fumaça",      value: combat.throughSmokeKills,accent: "cyan" as const },
    { label: "NO SCOPE",       description: "Eliminações sem mira óptica",        value: combat.noScopeKills,     accent: "green" as const },
    { label: "KILL CEGO",      description: "Sob efeito de granada de luz",       value: combat.blindedKills,     accent: "gold" as const },
    { label: "DANO NA CABEÇA", description: "Percentual do dano aplicado",        value: combat.headDamagePercent != null ? `${combat.headDamagePercent}%` : "—", accent: "gold" as const },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map(({ label, description, value }) => (
          <div
            key={label}
            className="flex flex-col justify-between p-3.5 bg-surface-deck border border-border/50 rounded-xs text-center"
          >
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              {label}
            </span>
            <span className="text-xl sm:text-2xl font-mono font-black text-foreground my-1 tabular-nums">
              {value}
            </span>
            <span className="text-[9px] text-muted-foreground/50 font-sans leading-snug">
              {description}
            </span>
          </div>
        ))}
      </div>
      {combat.avgDamagePerHit != null && (
        <p className="text-[10px] font-mono text-muted-foreground/60 text-center">
          Dano médio por impacto (Damage/Hit):{" "}
          <strong className="text-foreground">{combat.avgDamagePerHit} HP</strong>
        </p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function PerformanceGcSection({
  stats,
  multikillsLeaderboards,
  clutchesBundle,
  combatBundle,
}: PerformanceGcSectionProps) {
  const [activeTab, setActiveTab] = useState<string>("multikills");

  const tabs = [
    { id: "multikills",  label: "Multikills",       icon: Trophy },
    { id: "clutches",    label: "Clutches (1vX)",   icon: ShieldCheck },
    { id: "combate",     label: "Telemetria de Dano",icon: Crosshair },
    { id: "performance", label: "Gamers Club",      icon: Zap },
  ];

  return (
    <div className="bg-surface-panel border border-border/60 rounded-sm overflow-hidden flex flex-col">
      <div className="p-3 border-b border-border/40 bg-surface-deck/40">
        <TacticalTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>
      <div className="p-5">
        {activeTab === "multikills"  && <MultikillsTab leaderboards={multikillsLeaderboards} />}
        {activeTab === "clutches"    && <ClutchesTab clutches={clutchesBundle} />}
        {activeTab === "combate"     && <CombatTab combat={combatBundle} />}
        {activeTab === "performance" && <PerformanceTab stats={stats} />}
      </div>
    </div>
  );
}
