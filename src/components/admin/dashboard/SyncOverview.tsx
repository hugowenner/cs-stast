import { cn } from "@/lib/utils";
import type { SyncStats } from "@/lib/admin/health/types";

interface SyncOverviewProps {
  sync: SyncStats;
}

function formatDateTime(date: Date | null): string {
  if (!date) return "Never";
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SyncOverview({ sync }: SyncOverviewProps) {
  const { successRate, todayAttempts, todaySuccess, todayFailed, latestSync, totalImports } = sync;

  const syncStatus =
    totalImports === 0
      ? "No data"
      : successRate >= 95
        ? "Healthy"
        : successRate >= 70
          ? "Degraded"
          : "Failing";

  const statusColor =
    syncStatus === "Healthy"
      ? "text-emerald-400"
      : syncStatus === "Degraded"
        ? "text-amber-400"
        : syncStatus === "No data"
          ? "text-zinc-500"
          : "text-rose-400";

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Sync Engine
        </h2>
        <span className={cn("text-xs font-bold", statusColor)}>{syncStatus}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Today</span>
          <span className="text-xl font-black text-foreground">{todayAttempts}</span>
          <span className="text-[10px] text-muted-foreground">attempts</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Successful
          </span>
          <span className="text-xl font-black text-emerald-400">{todaySuccess}</span>
          <span className="text-[10px] text-muted-foreground">today</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</span>
          <span
            className={cn(
              "text-xl font-black",
              todayFailed > 0 ? "text-rose-400" : "text-foreground"
            )}
          >
            {todayFailed}
          </span>
          <span className="text-[10px] text-muted-foreground">today</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Success rate
          </span>
          <span
            className={cn(
              "text-xl font-black",
              successRate >= 95
                ? "text-emerald-400"
                : successRate >= 70
                  ? "text-amber-400"
                  : "text-rose-400"
            )}
          >
            {totalImports === 0 ? "—" : `${successRate.toFixed(0)}%`}
          </span>
          <span className="text-[10px] text-muted-foreground">all time</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center gap-6 text-[11px] text-muted-foreground">
        <div>
          Last sync:{" "}
          <span className="text-foreground font-medium">{formatDateTime(latestSync)}</span>
        </div>
        <div>
          Total imports:{" "}
          <span className="text-foreground font-medium">{totalImports}</span>
        </div>
      </div>
    </div>
  );
}
