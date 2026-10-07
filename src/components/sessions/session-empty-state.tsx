import { Swords, RefreshCw } from "lucide-react";

export function SessionEmptyState() {
  return (
    <div className="surface-panel rounded-sm border border-border/40 p-12 text-center flex flex-col items-center justify-center gap-3">
      <div className="flex size-12 items-center justify-center rounded-sm bg-surface-deck border border-border/60 text-primary">
        <Swords className="size-6" />
      </div>
      <div className="flex flex-col gap-1 max-w-md">
        <h3 className="text-base font-bold text-foreground font-mono uppercase tracking-wide">
          Nenhuma Partida ou Sessão Localizada
        </h3>
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          Nenhum confronto foi computado para os filtros selecionados. Sincronize partidas via GC Companion ou ajuste o período temporal acima.
        </p>
      </div>
    </div>
  );
}
