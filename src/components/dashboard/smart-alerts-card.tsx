import { AlertTriangle, TrendingUp, TrendingDown, Flame, ShieldAlert } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { SmartAlert, SmartAlertKind } from "@/server/services/competitive.service";

interface SmartAlertsCardProps {
  alerts: SmartAlert[];
}

const KIND_ICON: Record<SmartAlertKind, typeof TrendingUp> = {
  milestone: TrendingUp,
  drop: TrendingDown,
  "best-map": Flame,
  "worst-map": ShieldAlert,
};

export function SmartAlertsCard({ alerts }: SmartAlertsCardProps) {
  return (
    <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-2">
        <AlertTriangle className="size-3.5 text-status-warning shrink-0" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-status-warning/80">Alertas</p>
        {alerts.length > 0 && (
          <span className="ml-auto text-[9px] text-muted-foreground/60 font-semibold">{alerts.length}</span>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <p className="text-xs text-muted-foreground/55 text-center">Nenhum alerta no momento.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {alerts.map((alert) => {
            const Icon = KIND_ICON[alert.kind];
            const positive = alert.severity === "positive";
            const iconColor = positive ? "text-status-good" : "text-status-warning";
            const iconBg = positive ? "bg-status-good/10 border-status-good/20" : "bg-status-warning/10 border-status-warning/20";

            return (
              <div key={alert.id} className="px-4 py-3 flex items-center gap-3">
                {alert.player ? (
                  <PlayerAvatar nickname={alert.player.nickname} avatarUrl={alert.player.avatarUrl} size="sm" />
                ) : (
                  <span className={`size-7 rounded-full border flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon className={`size-3.5 ${iconColor}`} />
                  </span>
                )}
                <p className="text-xs text-white/85 leading-snug flex-1">{alert.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
