import { CalendarDays, Clock, Trophy, Activity } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
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
      })
    : "—";

  return (
    <div className="flex flex-col gap-6 mb-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <CalendarDays className="size-6 text-accent-violet shrink-0" />
          🎮 Noites de CS2
        </h1>
        <p className="text-xs text-muted-foreground/75 mt-1">
          Cada noite registrada, cada derrota explicada com dados
        </p>
      </div>

      {/* Grid de Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Total de Sessões"
          value={totalSessions}
          icon={CalendarDays}
          accent="violet"
          context="Noites jogadas no período"
        />
        <StatTile
          label="Última Sessão"
          value={lastSessionText}
          icon={Clock}
          accent="cyan"
          context={lastSessionDate ? "Último encontro do grupo" : "Nenhum jogo registrado"}
        />
        <StatTile
          label="Partidas por Sessão"
          value={avgMatchesPerSession}
          icon={Activity}
          accent="violet"
          context="Média de partidas disputadas"
        />
        <StatTile
          label="Melhor Sessão"
          value={bestSession ? bestSession.ratingAvg.toFixed(2) : "—"}
          icon={Trophy}
          accent="cyan"
          context={bestSession ? bestSession.name : "Nenhum destaque"}
        />
      </div>

      {/* Estatística extra sobre atividade mensal */}
      {monthlyActiveDays > 0 && (
        <div className="glass-panel border-white/[0.06] px-4 py-2.5 rounded-xl bg-white/[0.01] flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
            Frequência Mensal
          </p>
          <p className="text-xs font-black text-white/90">
            {monthlyActiveDays} {monthlyActiveDays === 1 ? "dia jogado" : "dias jogados"} este mês
          </p>
        </div>
      )}
    </div>
  );
}
