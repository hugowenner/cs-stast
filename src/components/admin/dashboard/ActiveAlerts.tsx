import { cn } from "@/lib/utils";
import type { HealthStatus } from "@/lib/admin/health/types";

type AlertSeverity = "CRITICAL" | "HIGH" | "WARNING" | "INFO";

interface Alert {
  severity: AlertSeverity;
  message: string;
  detail?: string;
}

interface ActiveAlertsProps {
  dbStatus: HealthStatus;
  workerStatus: HealthStatus;
  steamStatus: HealthStatus;
  gcStatus: HealthStatus;
  aiStatus: HealthStatus;
  gcGroupId: string | null;
}

const SEVERITY_STYLES: Record<
  AlertSeverity,
  { bar: string; label: string; badge: string }
> = {
  CRITICAL: {
    bar: "bg-rose-500",
    label: "text-rose-400",
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  },
  HIGH: {
    bar: "bg-orange-500",
    label: "text-orange-400",
    badge: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  },
  WARNING: {
    bar: "bg-amber-500",
    label: "text-amber-400",
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  },
  INFO: {
    bar: "bg-sky-500",
    label: "text-sky-400",
    badge: "border-sky-500/20 bg-sky-500/10 text-sky-400",
  },
};

function buildAlerts(props: ActiveAlertsProps): Alert[] {
  const alerts: Alert[] = [];

  if (props.dbStatus === "DOWN") {
    alerts.push({ severity: "CRITICAL", message: "Database connection failed" });
  } else if (props.dbStatus === "DEGRADED") {
    alerts.push({ severity: "HIGH", message: "Database latency is elevated" });
  }

  if (props.workerStatus === "DOWN") {
    alerts.push({ severity: "HIGH", message: "Sync worker is unreachable" });
  } else if (props.workerStatus === "NOT_CONFIGURED") {
    alerts.push({ severity: "WARNING", message: "Sync worker not configured", detail: "SYNC_WORKER_URL is not set" });
  }

  if (props.steamStatus === "NOT_CONFIGURED") {
    alerts.push({ severity: "WARNING", message: "Steam API key not configured or invalid" });
  }

  if (!props.gcGroupId) {
    alerts.push({
      severity: "WARNING",
      message: "Gamers Club Group ID not configured",
      detail: "Match synchronization cannot run without GAMERSCLUB_GROUP_ID",
    });
  }

  if (props.aiStatus === "NOT_CONFIGURED") {
    alerts.push({ severity: "INFO", message: "AI Coach not configured", detail: "DEEPSEEK_API_KEY is not set" });
  }

  return alerts;
}

export function ActiveAlerts(props: ActiveAlertsProps) {
  const alerts = buildAlerts(props);

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Active Alerts
        </h2>
        {alerts.length > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground">
            {alerts.length} {alerts.length === 1 ? "issue" : "issues"}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-xs font-medium">No active alerts — all systems nominal</span>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => {
            const s = SEVERITY_STYLES[alert.severity];
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <div className={cn("w-0.5 self-stretch rounded-full shrink-0", s.bar)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                        s.badge
                      )}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-medium text-foreground">{alert.message}</span>
                  </div>
                  {alert.detail && (
                    <p className="text-[10px] text-muted-foreground mt-1">{alert.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
