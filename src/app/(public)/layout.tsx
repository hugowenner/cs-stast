import { LayoutShell } from "@/components/layout/layout-shell";
import { CinematicIntro } from "@/components/motion/cinematic-intro";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CinematicIntro>
      <LayoutShell>{children}</LayoutShell>
    </CinematicIntro>
  );
}
