import type { ReactNode } from "react";

export function StatCell({
  children,
  className = "",
  align = "right",
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const alignClass =
    align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right";

  return (
    <td className={`px-4 py-3 text-sm font-medium tabular-nums ${alignClass} ${className}`}>
      {children}
    </td>
  );
}
