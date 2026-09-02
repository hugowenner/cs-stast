import { cn } from "@/lib/utils";
import type { DatabaseHealth, IntegrationHealth, ServiceHealth, HealthStatus } from "@/lib/admin/health/types";

interface ServicesGridProps {
  database: DatabaseHealth;
  worker: ServiceHealth;
  steam: IntegrationHealth;
  gamersClub: IntegrationHealth;
  ai: IntegrationHealth;
  deepseekModel: string;
  gcGroupId: string | null;
}

const STATUS_STYLES: Record<HealthStatus, { badge: string; dot: string; label: string }> = {
  HEALTHY: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
    label: "HEALTHY",
  },
  DEGRADED: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
    label: "DEGRADED",
  },
  DOWN: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    dot: "bg-rose-400 animate-pulse",
    label: "DOWN",
  },
  UNKNOWN: {
    badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
    label: "UNKNOWN",
  },
  NOT_CONFIGURED: {
    badge: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    dot: "bg-zinc-500",
    label: "NOT CONFIGURED",
  },
};

function StatusBadge({ status }: { status: HealthStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
        s.badge
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", s.dot)} />
      {s.label}
    </span>
  );
}

function ServiceRow({
  name,
  status,
  rows,
}: {
  name: string;
  status: HealthStatus;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 py-4 border-b border-white/[0.04] last:border-0">
      <div className="sm:w-40 shrink-0">
        <span className="text-xs font-semibold text-foreground">{name}</span>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <StatusBadge status={status} />
        {rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-1">
            {rows.map((r) => (
              <div key={r.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">{r.label}</span>
                <span className="text-[11px] font-medium text-foreground">{r.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ServicesGrid({
  database,
  worker,
  steam,
  gamersClub,
  ai,
  deepseekModel,
  gcGroupId,
}: ServicesGridProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        Services &amp; Integrations
      </h2>

      <div className="mt-4">
        <ServiceRow
          name="PostgreSQL"
          status={database.status}
          rows={[
            {
              label: "Latency",
              value: database.latencyMs !== undefined ? `${database.latencyMs} ms` : "N/A",
            },
            { label: "Size", value: database.sizeLabel },
            { label: "Version", value: database.version ?? "N/A" },
          ]}
        />

        <ServiceRow
          name="Worker"
          status={worker.status}
          rows={
            worker.detail
              ? [{ label: "Detail", value: worker.detail }]
              : worker.latencyMs !== undefined
                ? [{ label: "Latency", value: `${worker.latencyMs} ms` }]
                : []
          }
        />

        <ServiceRow
          name="Steam Web API"
          status={steam.status}
          rows={[
            { label: "Key status", value: steam.configured ? "Configured" : "Missing" },
            ...(steam.detail ? [{ label: "Note", value: steam.detail }] : []),
          ]}
        />

        <ServiceRow
          name="Gamers Club"
          status={gamersClub.status}
          rows={[
            {
              label: "Group ID",
              value: gcGroupId ? "Configured" : "Not configured",
            },
            ...(gamersClub.reason ? [{ label: "Reason", value: gamersClub.reason }] : []),
          ]}
        />

        <ServiceRow
          name="AI Provider"
          status={ai.status}
          rows={[
            { label: "Key status", value: ai.configured ? "Configured" : "Missing" },
            { label: "Model", value: deepseekModel || "N/A" },
          ]}
        />
      </div>
    </div>
  );
}
