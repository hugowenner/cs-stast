import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

interface ImportRow {
  id: string;
  source: string;
  status: string;
  startedAt: Date | string;
  finishedAt: Date | string | null;
  matchesImported: number;
  errorMessage: string | null;
}

interface OperationalTimelineProps {
  recentImports: ImportRow[];
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function durationLabel(start: Date | string, end: Date | string | null): string | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function OperationalTimeline({ recentImports }: OperationalTimelineProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Operational Timeline
        </h2>
        <span className="text-[10px] text-muted-foreground">Last {recentImports.length} events</span>
      </div>

      {recentImports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/10 rounded-lg text-center select-none">
          <Clock className="size-5 text-muted-foreground/30 mb-2" />
          <span className="text-xs text-muted-foreground">No sync events recorded</span>
        </div>
      ) : (
        <div className="relative space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-white/[0.06]">
          {recentImports.map((item) => {
            const isSuccess = item.status === "SUCCESS";
            const isFailed = item.status === "FAILED";
            const isRunning = !isSuccess && !isFailed;
            const dur = durationLabel(item.startedAt, item.finishedAt);

            return (
              <div key={item.id} className="relative pl-8 group">
                <div className="absolute left-0 top-0.5 z-10 size-6 flex items-center justify-center rounded-full bg-zinc-950 border border-zinc-900">
                  {isSuccess && <CheckCircle2 className="size-3.5 text-emerald-400" />}
                  {isFailed && <XCircle className="size-3.5 text-rose-400" />}
                  {isRunning && <AlertCircle className="size-3.5 text-amber-400 animate-pulse" />}
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {isSuccess
                        ? "SYNC_COMPLETED"
                        : isFailed
                          ? "SYNC_FAILED"
                          : "SYNC_RUNNING"}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {formatDate(item.startedAt)} {formatTime(item.startedAt)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Source: <span className="text-foreground font-medium">{item.source}</span>
                    {isSuccess && ` · ${item.matchesImported} match${item.matchesImported !== 1 ? "es" : ""} processed`}
                    {dur && ` · ${dur}`}
                    {isFailed && item.errorMessage && (
                      <> · <span className="text-rose-400">{item.errorMessage}</span></>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
