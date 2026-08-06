import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, href, linkLabel, className = "mb-5" }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="section-accent-bar">
        <div>
          <p className="text-[9px] uppercase tracking-[0.14em] font-black text-muted-foreground/65 leading-none">
            {title}
          </p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground/40 mt-1 leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-primary/60 hover:text-primary transition-colors group shrink-0"
        >
          {linkLabel}
          <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}
