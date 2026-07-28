import { LayoutShell } from "@/components/layout/layout-shell";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <LayoutShell>{children}</LayoutShell>;
}
