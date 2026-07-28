import { Server, Activity, ShieldAlert, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemHealthCardsProps {
  dbLatency: number;
  isDbConnected: boolean;
  nodeEnv: string;
}

export function SystemHealthCards({ dbLatency, isDbConnected, nodeEnv }: SystemHealthCardsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* 1. Status Geral do Sistema */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status Geral do Sistema
            </h3>
            <div className="rounded-lg border border-white/5 bg-white/5 p-2 text-muted-foreground">
              <Activity className="size-4" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
              <span className="text-xs text-muted-foreground">Banco PostgreSQL</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isDbConnected ? "Conectado" : "Desconectado"}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
              <span className="text-xs text-muted-foreground">Aplicação (Next.js)</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ambiente Atual</span>
              <span className="text-xs font-mono uppercase text-foreground">
                {nodeEnv === "production" ? "🚀 Produção" : "🚧 Desenvolvimento"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Monitoramento de Logs */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Auditoria e Logs
            </h3>
            <div className="rounded-lg border border-white/5 bg-white/5 p-2 text-muted-foreground">
              <ShieldAlert className="size-4" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-4 text-center select-none">
            <span className="text-status-warning text-xs font-semibold mb-1">
              Monitoramento de logs inativo
            </span>
            <p className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed">
              O módulo de rastreamento de logs e auditoria interna será implementado em etapas futuras.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Recursos Operacionais */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recursos Operacionais
            </h3>
            <div className="rounded-lg border border-white/5 bg-white/5 p-2 text-muted-foreground">
              <Cpu className="size-4" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Latência DB (Neon)</span>
                <span className="text-foreground">{dbLatency}ms</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    dbLatency < 50 ? "bg-emerald-500" : dbLatency < 120 ? "bg-amber-500" : "bg-rose-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(10, dbLatency / 2))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
