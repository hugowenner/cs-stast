import { cn } from "@/lib/utils";

export type AchievementTier = "bronze" | "silver" | "gold" | "legendary";

const TIER_CONFIG: Record<AchievementTier, { label: string; className: string }> = {
  bronze:    { label: "Comum",    className: "text-[#c97a48] bg-[#c97a48]/12 border-[#c97a48]/25" },
  silver:    { label: "Raro",     className: "text-slate-300 bg-slate-400/12 border-slate-400/25" },
  gold:      { label: "Épico",    className: "text-status-warning bg-status-warning/12 border-status-warning/25" },
  legendary: { label: "Lendário", className: "text-accent-violet bg-accent-violet/12 border-accent-violet/25" },
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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

export { TIER_CONFIG };
