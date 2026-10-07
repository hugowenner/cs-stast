import { Calendar, Clock, Trophy, Activity, Swords } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { MetricDisplay } from "@/components/ui/metric-display";
import type { SessionsOverview } from "@/server/analytics/session.analytics";

interface SessionHeroProps {
  overview: SessionsOverview;
}

export function SessionHero({ overview }: SessionHeroProps) {
  const {
    totalSessions,
    lastSessionDate,
    monthlyActiveDays,
    avgMatchesPerSession,
    bestSession,
  } = overview;

  // Formatar a data da última sessão
  const lastSessionText = lastSessionDate
    ? new Date(lastSessionDate).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  return (
    <div className="flex flex-col gap-5 mb-2">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-primary uppercase">
              01 / MATCH INTELLIGENCE
            </span>
            <TacticalBadge variant="tactical" size="sm">
              TELEMETRIA
            </TacticalBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-2.5">
            <Swords className="size-6 text-primary shrink-0" />
            PARTIDAS & SESSÕES
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground/80 max-w-2xl">
            Histórico operacional de confrontos, telemetria de noites de jogo e análise tática de desempenho por mapa.
          </p>
        </div>

        {monthlyActiveDays > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface-panel border border-border/40 shrink-0">
            <Calendar className="size-3.5 text-primary" />
            <span className="text-[11px] font-mono text-muted-foreground/80">
              Atividade Mensal:{" "}
              <strong className="text-foreground font-bold">
                {monthlyActiveDays} {monthlyActiveDays === 1 ? "dia" : "dias"}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-muted-foreground/60">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Total de Sessões
            </span>
            <Calendar className="size-3.5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {totalSessions}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              noites
            </span>
          </div>
        </div>

        <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-muted-foreground/60">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Última Sessão
            </span>
            <Clock className="size-3.5 text-accent-cyan" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg sm:text-xl font-black text-foreground tabular-nums truncate">
              {lastSessionText}
            </span>
          </div>
        </div>

        <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-muted-foreground/60">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Partidas / Sessão
            </span>
            <Activity className="size-3.5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {avgMatchesPerSession}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              jogos / noite
            </span>
          </div>
        </div>

        <div className="surface-panel rounded-sm p-4 border border-border/40 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-muted-foreground/60">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Melhor Rating de Sessão
            </span>
            <Trophy className="size-3.5 text-accent-gold" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-accent-gold tabular-nums">
              {bestSession ? bestSession.ratingAvg.toFixed(2) : "—"}
            </span>
            {bestSession && (
              <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[100px]" title={bestSession.name}>
                {bestSession.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
