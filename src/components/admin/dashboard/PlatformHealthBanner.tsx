import { cn } from "@/lib/utils";
import type { HealthStatus, ServiceHealth } from "@/lib/admin/health/types";

interface PlatformHealthBannerProps {
  overallStatus: HealthStatus;
  application: ServiceHealth;
  database: ServiceHealth;
  worker: ServiceHealth;
  integrationsHealthy: number;
  integrationsTotal: number;
  nodeEnv: string;
}

const STATUS_CONFIG: Record<
  HealthStatus,
  { label: string; dot: string; banner: string; text: string }
> = {
  HEALTHY: {
    label: "Healthy",
    dot: "bg-emerald-400",
    banner: "border-emerald-500/20 bg-emerald-500/5",
    text: "text-emerald-400",
  },
  DEGRADED: {
    label: "Degraded",
    dot: "bg-amber-400",
    banner: "border-amber-500/20 bg-amber-500/5",
    text: "text-amber-400",
  },
  DOWN: {
    label: "Down",
    dot: "bg-rose-400 animate-pulse",
    banner: "border-rose-500/20 bg-rose-500/5",
    text: "text-rose-400",
  },
  UNKNOWN: {
    label: "Unknown",
    dot: "bg-zinc-400",
    banner: "border-zinc-500/20 bg-zinc-500/5",
    text: "text-zinc-400",
  },
  NOT_CONFIGURED: {
    label: "Not Configured",
    dot: "bg-zinc-400",
    banner: "border-zinc-500/20 bg-zinc-500/5",
    text: "text-zinc-400",
  },
};

function StatusPill({ status, label }: { status: HealthStatus; label: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className={cn("size-2 rounded-full shrink-0", cfg.dot)} />
        <span className={cn("text-xs font-semibold", cfg.text)}>{cfg.label}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function PlatformHealthBanner({
  overallStatus,
  application,
  database,
  worker,
  integrationsHealthy,
  integrationsTotal,
  nodeEnv,
}: PlatformHealthBannerProps) {
  const cfg = STATUS_CONFIG[overallStatus];
  const isProd = nodeEnv === "production";

  return (
    <div className={cn("rounded-xl border p-5 shadow-lg", cfg.banner)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("size-2.5 rounded-full shrink-0", cfg.dot)} />
            <span className={cn("text-sm font-bold", cfg.text)}>{cfg.label}</span>
          </div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Platform Health
          </h2>
        </div>
        <span
          className={cn(
            "self-start sm:self-auto text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border",
            isProd
              ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
              : "border-sky-500/30 bg-sky-500/10 text-sky-400"
          )}
        >
          {isProd ? "Production" : "Development"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
        <StatusPill status={application.status} label="Application" />
        <StatusPill status={database.status} label="Database" />
        <StatusPill status={worker.status} label="Worker" />
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                integrationsHealthy === integrationsTotal
                  ? "bg-emerald-400"
                  : integrationsHealthy === 0
                    ? "bg-rose-400"
                    : "bg-amber-400"
              )}
            />
            <span
              className={cn(
                "text-xs font-semibold",
                integrationsHealthy === integrationsTotal
                  ? "text-emerald-400"
                  : integrationsHealthy === 0
                    ? "text-rose-400"
                    : "text-amber-400"
              )}
            >
              {integrationsHealthy}/{integrationsTotal}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">Integrations</span>
        </div>
      </div>
    </div>
  );
}
