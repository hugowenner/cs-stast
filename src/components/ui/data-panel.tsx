import { cn } from "@/lib/utils";

export interface DataPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  chamfer?: boolean | "tl" | "tr" | "card";
  accentBar?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function DataPanel({
  children,
  chamfer = false,
  accentBar = false,
  padding = "md",
  className,
  ...props
}: DataPanelProps) {
  const chamferClass =
    chamfer === true || chamfer === "tl"
      ? "chamfer-tl"
      : chamfer === "tr"
        ? "chamfer-tr"
        : chamfer === "card"
          ? "chamfer-card"
          : "";

  const paddingClass =
    padding === "none"
      ? "p-0"
      : padding === "sm"
        ? "p-3 sm:p-4"
        : padding === "lg"
          ? "p-6 sm:p-8"
          : "p-4 sm:p-5";

  return (
    <div
      className={cn(
        "surface-panel rounded-sm relative overflow-hidden transition-all",
        chamferClass,
        paddingClass,
        className,
      )}
      {...props}
    >
      {accentBar && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
      )}
      {children}
    </div>
  );
}
