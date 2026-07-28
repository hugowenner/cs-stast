import { Clock, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { formatRelativeTime } from "../players/PlayersSummaryCards";

interface ImportData {
  id: string;
  source: string;
  status: string;
  startedAt: Date | string;
  finishedAt: Date | string | null;
  matchesImported: number;
  errorMessage: string | null;
}

interface RecentActivityProps {
  recentImports: ImportData[];
}

export function RecentActivity({ recentImports }: RecentActivityProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Timeline Operacional</h2>
        <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none">
          Últimas Atividades
        </span>
      </div>

      {recentImports.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-lg text-center min-h-[180px] select-none">
          <Clock className="size-6 text-muted-foreground/40 mb-2 animate-pulse" />
          <span className="text-xs font-semibold text-foreground mb-0.5">Sem atividades</span>
          <p className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed">
            Nenhuma sincronização ou importação de partidas foi efetuada até o momento.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
          {recentImports.map((item) => {
            const isSuccess = item.status === "SUCCESS";
            const isFailed = item.status === "FAILED";
            
            return (
              <div key={item.id} className="relative pl-8 group">
                {/* Status Dot/Icon */}
                <div className="absolute left-1.5 top-0.5 z-10 -translate-x-1/2 flex items-center justify-center size-5 rounded-full bg-zinc-950 border border-zinc-900 group-hover:scale-110 transition-transform">
                  {isSuccess && <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />}
                  {isFailed && <XCircle className="size-3.5 text-rose-400 shrink-0" />}
                  {!isSuccess && !isFailed && <AlertCircle className="size-3.5 text-amber-400 shrink-0 animate-pulse" />}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-foreground">
                      Sincronização {isSuccess ? "Concluída" : isFailed ? "Falhou" : "Em andamento"}
                    </span>
                    <span className="text-[9px] text-muted-foreground select-none shrink-0 font-medium">
                      {formatRelativeTime(item.startedAt)}
                    </span>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Provedor: <span className="font-semibold text-foreground">{item.source}</span>
                    {isSuccess && ` • ${item.matchesImported} ${item.matchesImported === 1 ? "partida processada" : "partidas processadas"}.`}
                    {isFailed && item.errorMessage && ` • Erro: ${item.errorMessage}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Alert: future audit log */}
      <div className="rounded-xl border border-white/5 bg-white/5 p-3 flex gap-2.5 items-start">
        <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Auditoria Administrativa
          </span>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            Logs de ações operacionais (ex: cadastro, remoção ou pausa de jogadores) serão consolidados nesta timeline no módulo de Logs futuro.
          </p>
        </div>
      </div>
    </div>
  );
}
