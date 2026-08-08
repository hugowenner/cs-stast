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
    <div className={cn(
      "card-important rounded-2xl relative",
      className
    )}>
      {/* Accent top-line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      {/* Corner bracket TL */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-[1.5px] border-l-[1.5px] border-white/[0.15] rounded-tl-2xl pointer-events-none" />
      {/* Corner bracket BR */}
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[1.5px] border-r-[1.5px] border-white/[0.10] rounded-br-2xl pointer-events-none" />

      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="shrink-0 flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <div className="text-muted-foreground/65 text-[11px] mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3 border-t border-white/[0.05] pt-3 md:border-none md:pt-0 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
