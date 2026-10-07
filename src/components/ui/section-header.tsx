import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  index?: string | number;
  tag?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  index,
  tag,
  href,
  linkLabel,
  className = "mb-4",
}: SectionHeaderProps) {
  const formattedIndex =
    typeof index === "number" ? String(index).padStart(2, "0") : index;

  return (
    <div className={cn("flex items-start justify-between gap-4 select-none", className)}>
      <div className="flex flex-col gap-1 min-w-0">
        {/* Editorial Index / Tag */}
        {(formattedIndex || tag) && (
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-primary/80">
            {formattedIndex && (
              <span className="font-data text-muted-foreground/50">{formattedIndex}</span>
            )}
            {formattedIndex && tag && <span className="text-white/20">/</span>}
            {tag && <span>{tag}</span>}
          </div>
        )}

        {/* Title */}
        <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight leading-tight">
          {title}
        </h2>

        {/* Subtitle / Context */}
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/60 font-medium leading-relaxed max-w-xl">
            {subtitle}
          </p>
        )}
      </div>

      {/* Link Action */}
      {href && linkLabel && (
        <Link
          href={href}
          className="btn-press inline-flex items-center gap-1.5 text-[10px] font-black text-primary/80 hover:text-primary uppercase tracking-wider transition-colors group shrink-0 pt-1"
        >
          <span>{linkLabel}</span>
          <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}
