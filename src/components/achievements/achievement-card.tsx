"use client";

import {
  Crosshair,
  Flame,
  Shield,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Star,
  Zap,
  Crown,
  Award,
  Heart,
  Skull,
  Eye,
  Layers,
  Users,
  Timer,
  Sparkles,
  Activity,
  BarChart2,
  Check,
  Lock,
} from "lucide-react";
import { AchievementTierBadge } from "./achievement-tier-badge";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { cn } from "@/lib/utils";
import type { AchievementCode } from "@/server/domain/achievementCatalog";

const ICON_MAP: Partial<Record<AchievementCode, React.ElementType>> = {
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

const TIER_BORDER: Record<string, string> = {
  bronze: "border-border/40 hover:border-[#c97a48]/50",
  silver: "border-border/40 hover:border-slate-400/50",
  gold: "border-border/40 hover:border-accent-gold/50",
  legendary: "border-border/40 hover:border-accent-violet/50",
};

const TIER_ICON_COLOR: Record<string, string> = {
  bronze: "text-[#c97a48]",
  silver: "text-slate-300",
  gold: "text-accent-gold",
  legendary: "text-accent-violet",
};

type CardEntry = {
  code: string;
  name: string;
  description: string;
  tier: string;
  unlockCount: number;
};

export function AchievementCard({ entry }: { entry: CardEntry }) {
  const Icon = ICON_MAP[entry.code as AchievementCode] ?? Trophy;
  const iconColor = TIER_ICON_COLOR[entry.tier] ?? "text-primary";
  const borderHover = TIER_BORDER[entry.tier] ?? "hover:border-primary/50";
  const isUnlocked = entry.unlockCount > 0;

  return (
    <div
      className={cn(
        "surface-panel rounded-sm p-3.5 sm:p-4 border transition-all duration-150 flex flex-col justify-between gap-3 group relative",
        borderHover,
        isUnlocked ? "bg-surface-panel" : "bg-surface-deck/80 opacity-80"
      )}
    >
      {/* Header: Icon + Name + Tier Badge */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xs border bg-surface-deck",
              isUnlocked ? "border-border/60" : "border-border/40"
            )}
          >
            <Icon className={cn("size-4 shrink-0", iconColor)} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-mono font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {entry.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <AchievementTierBadge tier={entry.tier} />
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {isUnlocked ? (
            <span className="font-mono text-[9px] font-black text-status-good px-1.5 py-0.5 rounded-xs bg-status-good/10 border border-status-good/30 tabular-nums">
              {entry.unlockCount}×
            </span>
          ) : (
            <span className="font-mono text-[9px] text-muted-foreground/40 px-1.5 py-0.5 rounded-xs bg-surface-deck border border-border/40 flex items-center gap-1">
              <Lock className="size-2.5" /> 0×
            </span>
          )}
        </div>
      </div>

      {/* Description / Requirement */}
      <p className="text-[11px] text-muted-foreground/75 leading-relaxed">
        {entry.description}
      </p>

      {/* Footer State */}
      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[9px] font-mono">
        <span className="text-muted-foreground/50 uppercase">Status:</span>
        <span
          className={cn(
            "font-bold uppercase tracking-wider",
            isUnlocked ? "text-status-good" : "text-muted-foreground/60"
          )}
        >
          {isUnlocked ? "DESBLOQUEADA" : "EM PROGRESSO"}
        </span>
      </div>
    </div>
  );
}
