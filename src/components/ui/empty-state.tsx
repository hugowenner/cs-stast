import type { LucideIcon } from "lucide-react";
import { Gamepad2 } from "lucide-react";

export function EmptyState({
  message = "Nenhum dado encontrado.",
  icon: Icon = Gamepad2,
  className = "",
}: {
  message?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 px-4 text-center ${className}`}>
      <div className="flex size-10 items-center justify-center rounded-xl bg-white/5 text-muted-foreground/45 border border-white/5 mb-3">
        <Icon className="size-5" />
      </div>
      <p className="text-muted-foreground text-sm font-medium">{message}</p>
    </div>
  );
}
