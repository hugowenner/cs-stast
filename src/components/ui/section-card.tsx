import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionCardVariant = "normal" | "highlight" | "premium";

const VARIANT_CLASS: Record<SectionCardVariant, string> = {
  normal: "glass-panel",
  highlight: "surface-2 border-accent-cyan/25",
  premium: "surface-highlight glow-ring-primary",
};

export function SectionCard({
  title,
  action,
  children,
  className,
  variant = "normal",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** normal = card padrão. highlight = destaque (ranking/performance). premium = Coach/raro. */
  variant?: SectionCardVariant;
}) {
  return (
    <section className={cn(VARIANT_CLASS[variant], "p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
