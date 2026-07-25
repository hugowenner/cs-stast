import { AlertTriangle } from "lucide-react";
import type { SmartAlert } from "@/server/services/competitive.service";

interface SmartAlertsCardProps {
  alerts: SmartAlert[];
}

export function SmartAlertsCard({ alerts }: SmartAlertsCardProps) {
  return (
    <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden h-full">
      <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-2">
        <AlertTriangle className="size-3.5 text-status-warning shrink-0" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-status-warning/80">Alertas Inteligentes</p>
      </div>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground/55 px-4 py-6 text-center">Nenhum alerta no momento.</p>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {alerts.map((alert) => (
            <div key={alert.id} className="px-4 py-3 flex items-start gap-2.5">
              <span className={`mt-0.5 size-1.5 rounded-full shrink-0 ${alert.severity === "positive" ? "bg-status-good" : "bg-status-warning"}`} />
              <p className="text-xs text-white/85 leading-relaxed">{alert.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
