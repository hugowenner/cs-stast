import { cn } from "@/lib/utils";

export interface FeaturePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "gold" | "terminal" | "default";
  chamfer?: boolean | "card" | "tl";
  padding?: "none" | "sm" | "md" | "lg";
}

export function FeaturePanel({
  children,
  variant = "default",
  chamfer = "card",
  padding = "md",
  className,
  ...props
}: FeaturePanelProps) {
  const chamferClass =
    chamfer === "card"
      ? "chamfer-card"
      : chamfer === true || chamfer === "tl"
        ? "chamfer-tl"
        : "";

  const variantClass =
    variant === "gold"
      ? "bg-surface-elevated border-border-gold shadow-lg shadow-black/40"
      : variant === "primary"
        ? "bg-surface-elevated border-border-accent shadow-lg shadow-black/40"
        : variant === "terminal"
          ? "surface-terminal shadow-lg shadow-black/40"
          : "surface-elevated";

  const paddingClass =
    padding === "none"
      ? "p-0"
      : padding === "sm"
        ? "p-3 sm:p-4"
        : padding === "lg"
          ? "p-6 sm:p-8"
          : "p-4 sm:p-6";

  return (
    <div
      className={cn(
        "rounded-sm relative overflow-hidden transition-all",
        variantClass,
        chamferClass,
        paddingClass,
        className,
      )}
      {...props}
    >
      {variant === "gold" && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold via-gold/30 to-transparent" />
      )}
      {variant === "primary" && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-primary/30 to-transparent" />
      )}
      {children}
    </div>
  );
}
