import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const PODIUM_STYLE: Record<number, string> = {
  1: "bg-status-warning/15 text-status-warning border border-status-warning/30",
  2: "bg-white/10 text-white border border-white/15",
  3: "bg-[#d9772b]/15 text-[#d9772b] border border-[#d9772b]/30",
};

export function RankRow({
  href,
  position,
  icon,
  title,
  subtitle,
  trailing,
  podium = false,
}: {
  href?: string;
  position?: number;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  /** Aplica destaque ouro/prata/bronze às 3 primeiras posições. */
  podium?: boolean;
}) {
  const podiumStyle = podium && position ? PODIUM_STYLE[position] : undefined;

  const content = (
    <>
      {position !== undefined && (
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums",
            podiumStyle ?? "text-muted-foreground",
          )}
        >
          {position}
        </span>
      )}
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="text-muted-foreground truncate text-xs">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </>
  );

  const rowClass = "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(rowClass, "hover:bg-white/5")}>
        {content}
      </Link>
    );
  }

  return <div className={rowClass}>{content}</div>;
}
