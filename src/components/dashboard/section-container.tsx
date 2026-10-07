import * as React from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";

export interface SectionContainerProps {
  title: string;
  subtitle?: string;
  index?: string | number;
  tag?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function SectionContainer({
  title,
  subtitle,
  index,
  tag,
  href,
  linkLabel,
  children,
  className = "",
  delay = 0.05,
}: SectionContainerProps) {
  return (
    <section className={cn("w-full flex flex-col gap-3", className)}>
      <FadeIn delay={delay}>
        <SectionHeader
          title={title}
          subtitle={subtitle}
          index={index}
          tag={tag}
          href={href}
          linkLabel={linkLabel}
          className="mb-1"
        />
      </FadeIn>
      <FadeIn delay={delay + 0.02}>
        <div className="w-full">{children}</div>
      </FadeIn>
    </section>
  );
}
