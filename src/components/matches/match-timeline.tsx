import { MessageSquareCode } from "lucide-react";
import type { MatchTimelineEventDTO } from "@/server/dtos/matchDetails.dto";

export function MatchTimeline({ events }: { events: MatchTimelineEventDTO[] }) {
  const specialEvents = events.filter((e) => e.type !== "KILL");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Linha do Tempo (Eventos de Destaque) */}
      <div className="glass-panel p-5 col-span-1 lg:col-span-2 flex flex-col gap-4 border border-white/5 bg-white/[0.01]">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Timeline da Partida (Eventos Especiais)
        </h3>

        {specialEvents.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nenhum evento especial (Aces ou Multi-kills) registrado nesta partida.
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {specialEvents.map((event) => {
              const label =
                event.type === "ACE"
                  ? "Ace (Eliminou o time inteiro no round)"
                  : event.type === "MULTI_KILL_4"
                  ? "Quadra Kill (4 eliminação no mesmo round)"
                  : event.type === "MULTI_KILL_3"
                  ? "Triple Kill (3 eliminações no mesmo round)"
                  : event.type;

              const badgeColorClass =
                event.type === "ACE"
                  ? "bg-status-good/10 text-status-good border-status-good/20"
                  : "bg-accent-violet/10 text-accent-violet border-accent-violet/20";

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.01] p-3 text-xs"
                >
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/5 text-muted-foreground font-bold tabular-nums shrink-0">
                    R{event.roundNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">{event.playerNickname}</p>
                    <p className="text-muted-foreground text-[10px] mt-0.5">{label}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ${badgeColorClass}`}>
                    {event.type.replace("MULTI_KILL_", "MK")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Análise da Partida (Coach IA Placeholder) */}
      <div className="glass-panel p-5 flex flex-col justify-between gap-4 border border-white/10 bg-gradient-to-br from-primary/5 to-accent-violet/5">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Coach IA
          </h3>
          <p className="text-xl font-bold mt-1 text-white">Análise da Partida</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Nas próximas etapas, o Coach IA irá analisar automaticamente o andamento deste confronto, destacando viradas de clutch, impacto de abertura e rotinas recomendadas baseadas nas estatísticas de equipe.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4 text-center mt-3">
          <MessageSquareCode className="size-6 text-muted-foreground mx-auto" />
          <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-wider">
            Funcionalidade em Breve
          </p>
        </div>
      </div>
    </div>
  );
}
