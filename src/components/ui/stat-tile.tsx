import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  icon: Icon,
  accent = "violet",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "violet" | "cyan";
}) {
  return (
    <div className="glass-panel flex items-center gap-4 p-5">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          accent === "violet"
            ? "bg-accent-violet/20 text-accent-violet"
            : "bg-accent-cyan/20 text-accent-cyan",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground truncate text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
