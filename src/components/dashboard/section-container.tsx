import { ReactNode } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { SectionHeader } from "@/components/dashboard/section-header";

interface SectionContainerProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function SectionContainer({
  title,
  subtitle,
  href,
  linkLabel,
  children,
  className = "",
  delay = 0.05,
}: SectionContainerProps) {
  return (
    <section className={`w-full ${className}`}>
      <FadeIn delay={delay}>
        <SectionHeader
          title={title}
          subtitle={subtitle}
          href={href}
          linkLabel={linkLabel}
          className="mb-4"
        />
      </FadeIn>
      <FadeIn delay={delay + 0.02}>
        <div className="w-full">{children}</div>
      </FadeIn>
    </section>
  );
}
