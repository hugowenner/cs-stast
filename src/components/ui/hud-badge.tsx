import { cn } from "@/lib/utils";

type BadgeVariant = "gold" | "green" | "red" | "violet" | "cyan" | "neutral" | "orange";
type BadgeSize = "sm" | "md";

const VARIANTS: Record<BadgeVariant, string> = {
  gold:    "tactical-badge-gold",
  green:   "tactical-badge-green",
  red:     "tactical-badge-red",
  violet:  "tactical-badge-violet",
  cyan:    "tactical-badge-cyan",
  neutral: "tactical-badge-neutral",
  orange:  "tactical-badge-orange",
};

const SIZES: Record<BadgeSize, string> = {
  sm: "text-[7px] px-1.5 py-0.5",
  md: "text-[8px] px-2 py-0.5",
};

export function HudBadge({
  label,
  variant = "neutral",
  size = "md",
  className,
}: {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}) {
  return (
    <span className={cn(VARIANTS[variant], SIZES[size], className)}>
      {label}
    </span>
  );
}

// Badges semânticos — sem emoji, traço uniforme
export const Badges = {
  // Performance
  MVP:        () => <HudBadge label="MVP"        variant="gold"    />,
  ACE:        () => <HudBadge label="ACE"        variant="gold"    />,
  Top5:       () => <HudBadge label="TOP 5%"     variant="gold"    />,
  Record:     () => <HudBadge label="RECORDE"    variant="gold"    />,
  Playoff:    () => <HudBadge label="PLAYOFFS"   variant="gold"    />,
  LevelUp:    () => <HudBadge label="LEVEL UP"   variant="gold"    />,
  // Roles
  Entry:      () => <HudBadge label="ENTRY"      variant="red"     />,
  Lurker:     () => <HudBadge label="LURKER"     variant="red"     />,
  Sniper:     () => <HudBadge label="AWP"        variant="red"     />,
  // Impact
  Clutch:     () => <HudBadge label="CLUTCH"     variant="violet"  />,
  IGL:        () => <HudBadge label="IGL"        variant="violet"  />,
  // Info / Neutral
  Support:    () => <HudBadge label="SUPPORT"    variant="green"   />,
  Consistent: () => <HudBadge label="CONSISTENT" variant="green"   />,
  Hot:        () => <HudBadge label="HOT"        variant="green"   />,
  // Metrics
  Impact:     () => <HudBadge label="IMPACT"     variant="orange"  />,
  ADR:        () => <HudBadge label="ADR"        variant="orange"  />,
  Headshot:   () => <HudBadge label="HS%"        variant="orange"  />,
  Trade:      () => <HudBadge label="TRADE"      variant="orange"  />,
  K4:         () => <HudBadge label="4K"         variant="cyan"    />,
  K3:         () => <HudBadge label="3K"         variant="cyan"    />,
  Rating:     () => <HudBadge label="RATING"     variant="cyan"    />,
  Form:       () => <HudBadge label="FORM"       variant="cyan"    />,
  // Status
  Cold:       () => <HudBadge label="COLD"       variant="neutral" />,
  Season:     () => <HudBadge label="TEMPORADA"  variant="neutral" />,
  Live:       () => <HudBadge label="LIVE"       variant="green"   />,
  Stale:      () => <HudBadge label="DESATUALIZADO" variant="neutral" />,
  AI:         () => <HudBadge label="IA"         variant="violet"  />,
};
