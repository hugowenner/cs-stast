import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_STYLES = {
  violet: {
    icon: "bg-accent-violet/15 text-accent-violet border border-accent-violet/20",
    label: "text-accent-violet/80",
    value: "text-white",
  },
  cyan: {
    icon: "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/20",
    label: "text-accent-cyan/80",
    value: "text-white",
  },
  gold: {
    icon: "bg-[rgba(212,164,76,0.12)] text-[#d4a44c] border border-[rgba(212,164,76,0.20)]",
    label: "text-[#d4a44c]/80",
    value: "text-gradient-gold",
  },
  green: {
    icon: "bg-status-good/10 text-status-good border border-status-good/20",
    label: "text-status-good/80",
    value: "text-white",
  },
  orange: {
    icon: "bg-[oklch(0.80_0.16_55_/_0.12)] text-[oklch(0.80_0.16_55)] border border-[oklch(0.80_0.16_55_/_0.20)]",
    label: "text-[oklch(0.80_0.16_55)]/80",
    value: "text-white",
  },
} as const;

export function StatTile({
  label,
  value,
  icon: Icon,
  accent = "violet",
  context,
  tagline,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: keyof typeof ACCENT_STYLES;
  context?: string;
  tagline?: string;
}) {
  const styles = ACCENT_STYLES[accent] ?? ACCENT_STYLES.violet;

  return (
    <div className="card-important card-hover-tactical rounded-2xl p-5 flex flex-col gap-3 group relative overflow-hidden hud-corner-tl">
      {/* Accent line top */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] rounded-t-2xl bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", styles.icon)}>
          <Icon className="size-5" />
        </div>
        <p className={cn("text-[8px] uppercase tracking-[0.12em] font-black mt-0.5 text-right", styles.label)}>
          {label}
        </p>
      </div>

      <div className="flex flex-col gap-0">
        <p className={cn("stat-tile-metric", styles.value)}>
          {value}
        </p>
        {context && (
          <p className="text-[10px] text-muted-foreground/50 font-medium mt-2 leading-snug">
            {context}
          </p>
        )}
        {tagline && (
          <p className="narrator-tagline">
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
