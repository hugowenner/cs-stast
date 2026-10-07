import { cn } from "@/lib/utils";

export type AchievementTier = "bronze" | "silver" | "gold" | "legendary";

const TIER_CONFIG: Record<AchievementTier, { label: string; className: string }> = {
  bronze: {
    label: "COMUM",
    className: "text-[#c97a48] bg-[#c97a48]/10 border-[#c97a48]/30",
  },
  silver: {
    label: "RARO",
    className: "text-slate-300 bg-slate-400/10 border-slate-400/30",
  },
  gold: {
    label: "ÉPICO",
    className: "text-accent-gold bg-accent-gold/10 border-accent-gold/30",
  },
  legendary: {
    label: "LENDÁRIO",
    className: "text-accent-violet bg-accent-violet/10 border-accent-violet/30",
  },
};

export function AchievementTierBadge({
  tier,
  className,
}: {
  tier: string;
  className?: string;
}) {
  const config = TIER_CONFIG[tier as AchievementTier] ?? TIER_CONFIG.bronze;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs border px-1.5 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider leading-none",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export { TIER_CONFIG };
