import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass-panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between border border-white/10 bg-white/[0.01]", className)}>
      <div className="flex items-center gap-4">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="text-2xl font-bold tracking-tight text-white">{title}</div>
          {subtitle && (
            <div className="text-muted-foreground text-sm mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3 border-t border-white/5 pt-3 md:border-none md:pt-0 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
