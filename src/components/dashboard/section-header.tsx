import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, href, linkLabel, className = "mb-5" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {subtitle ? (
        <div>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">{title}</p>
          <p className="text-xs text-muted-foreground/55 mt-0.5">{subtitle}</p>
        </div>
      ) : (
        <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">{title}</p>
      )}
      {href && linkLabel && (
        <Link href={href} className="text-[10px] text-primary/70 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1 group shrink-0">
          {linkLabel} <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}
