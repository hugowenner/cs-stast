import { MessageSquareCode, Flame, Crosshair } from "lucide-react";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { cn } from "@/lib/utils";
import type { MatchTimelineEventDTO } from "@/server/dtos/matchDetails.dto";

export function MatchTimeline({ events }: { events: MatchTimelineEventDTO[] }) {
  const specialEvents = events.filter((e) => e.type !== "KILL");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Linha do Tempo (Eventos de Destaque) */}
      <div className="surface-panel rounded-sm p-5 col-span-1 lg:col-span-2 flex flex-col gap-4 border border-border/40">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-primary" />
            <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
              Timeline de Eventos Críticos
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground/60">
            {specialEvents.length} eventos registrados
          </span>
        </div>

        {specialEvents.length === 0 ? (
          <p className="text-muted-foreground/60 py-8 text-center text-xs font-mono">
            Nenhum evento especial (Aces ou Multi-kills) registrado nesta partida.
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {specialEvents.map((event) => {
              const label =
                event.type === "ACE"
                  ? "Ace (Eliminou o time adversário inteiro)"
                  : event.type === "MULTI_KILL_4"
                  ? "Quadra Kill (4 eliminações no round)"
                  : event.type === "MULTI_KILL_3"
                  ? "Triple Kill (3 eliminações no round)"
                  : event.type;

              const isAce = event.type === "ACE";

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-xs border border-border/40 bg-surface-deck p-2.5 text-xs"
                >
                  <div className="flex size-7 items-center justify-center rounded-xs bg-surface-panel border border-border/60 text-foreground font-mono font-bold text-xs tabular-nums shrink-0">
                    R{event.roundNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground truncate">{event.playerNickname}</p>
                    <p className="text-muted-foreground/70 text-[10px] font-mono">{label}</p>
                  </div>
                  <TacticalBadge variant={isAce ? "gold" : "good"} size="sm">
                    {event.type.replace("MULTI_KILL_", "MK ")}
                  </TacticalBadge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Análise de Inteligência Tática */}
      <div className="surface-panel rounded-sm p-5 flex flex-col justify-between gap-4 border border-border/40 bg-surface-elevated/20">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
            ANÁLISE DE COMBATE
          </span>
          <p className="text-lg font-mono font-black text-foreground">Inteligência Tática</p>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            Métricas integradas de trade, conversão de clutches e impacto round a round computadas diretamente a partir do log do servidor.
          </p>
        </div>

        <div className="rounded-xs border border-border/40 bg-surface-deck p-4 text-center">
          <Crosshair className="size-5 text-primary mx-auto mb-1.5" />
          <p className="text-[10px] font-mono text-muted-foreground/70 font-bold uppercase tracking-wider">
            Telemetria de Rounds Ativa
          </p>
        </div>
      </div>
    </div>
  );
}
