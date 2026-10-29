"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  Star,
  Flame,
  Zap,
  Crosshair,
  Target,
  Crown,
  Swords,
  TrendingUp,
  Activity,
  Eye,
  Shield,
  Heart,
  Skull,
  BarChart2,
  Layers,
  Award,
  Sparkles,
  Timer,
  Users,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { cn, cleanMapName } from "@/lib/utils";

export interface FeedEntry {
  id: string;
  earnedAt: Date | string;
  matchId?: string | null;
  achievement: {
    code?: string;
    name: string;
    description?: string | null;
    tier: string;
    iconUrl?: string | null;
  };
  player: {
    id?: string;
    nickname: string;
    avatarUrl?: string | null;
    levelGc?: number | null;
  };
  match?: {
    id?: string;
    map?: {
      name: string;
    } | null;
  } | null;
}

const TIER_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    badgeClass: string;
    iconBoxClass: string;
    cardBorderHover: string;
  }
> = {
  bronze: {
    label: "COMUM",
    color: "text-[#c97a48]",
    badgeClass: "text-[#c97a48] bg-[#c97a48]/10 border-[#c97a48]/30",
    iconBoxClass: "text-[#c97a48] bg-[#c97a48]/10 border-[#c97a48]/30",
    cardBorderHover: "hover:border-[#c97a48]/40",
  },
  silver: {
    label: "RARO",
    color: "text-slate-300",
    badgeClass: "text-slate-300 bg-slate-400/10 border-slate-400/30",
    iconBoxClass: "text-slate-300 bg-slate-400/10 border-slate-400/30",
    cardBorderHover: "hover:border-slate-400/40",
  },
  gold: {
    label: "ÉPICO",
    color: "text-accent-gold",
    badgeClass: "text-accent-gold bg-accent-gold/10 border-accent-gold/30",
    iconBoxClass: "text-accent-gold bg-accent-gold/10 border-accent-gold/30",
    cardBorderHover: "hover:border-accent-gold/40",
  },
  legendary: {
    label: "LENDÁRIO",
    color: "text-accent-violet",
    badgeClass: "text-accent-violet bg-accent-violet/10 border-accent-violet/30",
    iconBoxClass: "text-accent-violet bg-accent-violet/10 border-accent-violet/30",
    cardBorderHover: "hover:border-accent-violet/40",
  },
};

const ICON_MAP: Record<string, React.ElementType> = {
  ACE: Trophy,
  MULTI_KILL_3: Swords,
  MULTI_KILL_4: Flame,
  ENTRY_KING_MATCH: Crown,
  HS_MACHINE_MATCH: Target,
  OPENING_DUELIST_MATCH: Crosshair,
  TRADER_MATCH: TrendingUp,
  DAMAGE_DEALER_MATCH: Activity,
  SHARP_SHOOTER_MATCH: Eye,
  SURVIVOR_MATCH: Shield,
  SUPPORT_MATCH: Heart,
  COLD_BLOOD_MATCH: Skull,
  MVP_MATCH: Star,
  HIGH_IMPACT_MATCH: BarChart2,
  WALL_MATCH: Layers,
  UNTOUCHABLE_MATCH: Shield,
  CARRY_MATCH: Crown,
  CLUTCH_1V1: Award,
  CLUTCH_1V2: Award,
  CLUTCH_1V3: Zap,
  CLUTCH_1V4: Zap,
  CLUTCH_1V5: Sparkles,
  MATCHES_10: Timer,
  MATCHES_50: Timer,
  MATCHES_100: Trophy,
  KILLS_250: Crosshair,
  KILLS_500: Crosshair,
  KILLS_1000: Skull,
  HS_100: Target,
  HS_500: Target,
  ENTRY_FRAGGER_CAREER: Crown,
  CLUTCH_MASTER_CAREER: Zap,
  TEAM_PLAYER_CAREER: Users,
  CONSISTENCY_CAREER: Star,
};

const TIER_FALLBACK_ICON: Record<string, React.ElementType> = {
  bronze: Trophy,
  silver: Star,
  gold: Flame,
  legendary: Zap,
};

export interface AchievementFeedItemProps {
  entry: FeedEntry;
  index?: number;
  variant?: "card" | "row";
  className?: string;
}

export function AchievementFeedItem({
  entry,
  index = 0,
  variant = "card",
  className,
}: AchievementFeedItemProps) {
  const tier = TIER_CONFIG[entry.achievement.tier] ?? TIER_CONFIG.bronze;
  const Icon =
    (entry.achievement.code && ICON_MAP[entry.achievement.code]) ||
    TIER_FALLBACK_ICON[entry.achievement.tier] ||
    Trophy;

  const mapName = entry.match?.map?.name;
  const matchId = entry.matchId || entry.match?.id;

  const earnedDate =
    entry.earnedAt instanceof Date ? entry.earnedAt : new Date(entry.earnedAt);
  const isSameYear = earnedDate.getFullYear() === new Date().getFullYear();
  const formattedDate = isNaN(earnedDate.getTime())
    ? ""
    : earnedDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        ...(isSameYear ? {} : { year: "numeric" }),
      });

  if (variant === "row") {
    return (
      <div
        className={cn(
          "flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-elevated/40",
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-xs border shrink-0",
              tier.iconBoxClass
            )}
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground truncate">
                {entry.achievement.name}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-2xs border px-1.5 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider leading-none",
                  tier.badgeClass
                )}
              >
                {tier.label}
              </span>
            </div>
            {entry.achievement.description && (
              <span className="text-[11px] text-muted-foreground/75 truncate mt-0.5">
                {entry.achievement.description}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0 text-right">
          {mapName && (
            <span className="text-[10px] font-mono text-muted-foreground/60 inline-flex items-center gap-0.5">
              <MapPin className="size-2.5" />
              {cleanMapName(mapName)}
            </span>
          )}
          <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums mt-0.5">
            {formattedDate}
          </span>
        </div>
      </div>
    );
  }

  // ─── Default: Card compacto (Grade do Dashboard) ───────────────────────────
  return (
    <div
      className={cn(
        "bg-surface-panel border border-border/60 hover:border-border/90 rounded-sm p-4",
        "flex flex-col justify-between gap-3.5 transition-micro group relative",
        tier.cardBorderHover,
        className
      )}
    >
      {/* 1. Top row: Ícone da conquista em destaque e selo de raridade */}
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-xs border shrink-0 transition-micro",
            tier.iconBoxClass
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </div>

        <span
          className={cn(
            "inline-flex items-center rounded-xs border px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider leading-none",
            tier.badgeClass
          )}
        >
          {tier.label}
        </span>
      </div>

      {/* 2. Nome da conquista como título principal e 3. Descrição curta do requisito */}
      <div className="flex flex-col gap-1 min-w-0">
        <h4 className="text-sm font-black text-foreground uppercase tracking-tight truncate group-hover:text-primary transition-micro">
          {entry.achievement.name}
        </h4>
        {entry.achievement.description && (
          <p className="text-xs text-muted-foreground/85 line-clamp-2 leading-relaxed font-sans">
            {entry.achievement.description}
          </p>
        )}
      </div>

      {/* 4. Avatar e nome do jogador */}
      <div className="flex items-center gap-2.5 pt-1 min-w-0">
        <PlayerAvatar
          nickname={entry.player.nickname}
          avatarUrl={entry.player.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground/50 uppercase shrink-0">
            Desbloqueado por
          </span>
          {entry.player.id ? (
            <Link
              href={`/players/${entry.player.id}`}
              className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xs"
            >
              {entry.player.nickname}
            </Link>
          ) : (
            <span className="text-xs font-bold text-foreground truncate">
              {entry.player.nickname}
            </span>
          )}
        </div>
      </div>

      {/* 5. Mapa e data no rodapé */}
      <div className="border-t border-border/30 pt-2.5 flex items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground/75">
        <div className="flex items-center gap-2 min-w-0">
          {mapName && (
            <span className="inline-flex items-center gap-1 text-muted-foreground/80 shrink-0">
              <MapPin className="size-3 text-muted-foreground/60" aria-hidden="true" />
              {cleanMapName(mapName)}
            </span>
          )}
          {matchId && (
            <>
              {mapName && <span className="text-border/80">·</span>}
              <Link
                href={`/matches/${matchId}`}
                className="text-[10px] font-bold text-primary/80 hover:text-primary hover:underline transition-micro focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-xs shrink-0 inline-flex items-center gap-1"
              >
                Ver partida
                <ExternalLink className="size-2.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
          {formattedDate}
        </span>
      </div>
    </div>
  );
}
