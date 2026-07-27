"use client";

import {
  Crosshair, Flame, Shield, Swords, Target, TrendingUp,
  Trophy, Star, Zap, Crown, Award, Heart, Skull, Eye,
  Layers, Users, Timer, Sparkles, Activity, BarChart2,
} from "lucide-react";
import { AchievementTierBadge } from "./achievement-tier-badge";
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

const TIER_COLOR: Record<string, string> = {
  bronze: "text-[#c97a48]",
  silver: "text-slate-300",
  gold: "text-status-warning",
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
  const iconColor = TIER_COLOR[entry.tier] ?? "text-muted-foreground/60";

  return (
    <div className="group relative flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all hover:border-white/[0.12] hover:bg-white/[0.04] overflow-hidden cursor-default select-none">
      {/* Normal state */}
      <div className="flex items-start gap-2">
        <Icon className={`size-3.5 mt-0.5 shrink-0 ${iconColor}`} />
        <p className="text-[10px] font-bold text-white leading-snug line-clamp-2">{entry.name}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <AchievementTierBadge tier={entry.tier} />
        <span className="text-[8px] text-muted-foreground/40 tabular-nums">
          {entry.unlockCount > 0 ? `${entry.unlockCount}×` : "Nenhum"}
        </span>
      </div>

      {/* Hover overlay: description */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/80 px-3 py-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 backdrop-blur-[2px]">
        <p className="text-[10px] text-center text-white/80 leading-relaxed">{entry.description}</p>
      </div>
    </div>
  );
}
