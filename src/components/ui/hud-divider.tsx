import { cn } from "@/lib/utils";

export function HudDivider({ className }: { className?: string }) {
  return <hr className={cn("hud-divider", className)} aria-hidden />;
}

export function HudSectionLabel({
  label,
  sub,
  className,
}: {
  label: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("section-accent-bar", className)}>
      <div>
        <p className="text-[9px] uppercase tracking-[0.14em] font-black text-muted-foreground/60 leading-none">
          {label}
        </p>
        {sub && (
          <p className="text-[10px] text-muted-foreground/40 mt-0.5 leading-none">{sub}</p>
        )}
      </div>
    </div>
  );
}
