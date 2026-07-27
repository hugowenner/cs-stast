import { CalendarDays } from "lucide-react";

export function SessionEmptyState() {
  return (
    <div className="glass-panel rounded-2xl border border-white/[0.07] p-12 text-center flex flex-col items-center justify-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/[0.06] text-muted-foreground/30 mb-4">
        <CalendarDays className="size-6" />
      </div>
      <h3 className="text-base font-bold text-white mb-1">🎮 Ainda não existem sessões registradas</h3>
      <p className="text-xs text-muted-foreground/60 max-w-sm">
        Jogue algumas partidas e o Hub vai montar o histórico de noites de jogo automaticamente.
      </p>
    </div>
  );
}
