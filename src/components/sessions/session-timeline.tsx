import { SessionCard } from "./session-card";
import type { SimpleSessionSummary } from "@/server/analytics/session.analytics";

interface MonthGroup {
  monthName: string;
  sessions: SimpleSessionSummary[];
}

interface YearGroup {
  year: number;
  months: MonthGroup[];
}

interface SessionTimelineProps {
  sessions: SimpleSessionSummary[];
}

function groupSessionsByDate(sessions: SimpleSessionSummary[]): YearGroup[] {
  const groups: YearGroup[] = [];

  sessions.forEach((session) => {
    const sDate = new Date(session.date);
    const year = sDate.getUTCFullYear();
    const monthName = sDate
      .toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" })
      .replace(/^\w/, (c) => c.toUpperCase());

    let yGroup = groups.find((g) => g.year === year);
    if (!yGroup) {
      yGroup = { year, months: [] };
      groups.push(yGroup);
    }

    let mGroup = yGroup.months.find((m) => m.monthName === monthName);
    if (!mGroup) {
      mGroup = { monthName, sessions: [] };
      yGroup.months.push(mGroup);
    }

    mGroup.sessions.push(session);
  });

  // Ordenação decrescente de anos e meses
  groups.sort((a, b) => b.year - a.year);
  groups.forEach((g) => {
    g.months.sort((a, b) => {
      const dateA = new Date(a.sessions[0].date).getTime();
      const dateB = new Date(b.sessions[0].date).getTime();
      return dateB - dateA;
    });
  });

  return groups;
}

export function SessionTimeline({ sessions }: SessionTimelineProps) {
  const grouped = groupSessionsByDate(sessions);

  return (
    <div className="flex flex-col gap-8">
      {grouped.map((yGroup) => (
        <div key={yGroup.year} className="flex flex-col gap-6">
          {/* Cabeçalho do Ano */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black text-foreground bg-surface-deck border border-border/60 px-3 py-1 rounded-xs tracking-wider">
              {yGroup.year}
            </span>
            <div className="h-px bg-border/40 flex-1" />
          </div>

          {yGroup.months.map((mGroup) => (
            <div key={mGroup.monthName} className="flex flex-col gap-3">
              {/* Cabeçalho do Mês */}
              <div className="flex items-center gap-2 pl-3">
                <span className="size-1.5 rounded-full bg-primary/80" />
                <h3 className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                  {mGroup.monthName}
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground/40">
                  ({mGroup.sessions.length} {mGroup.sessions.length === 1 ? "sessão" : "sessões"})
                </span>
              </div>

              {/* Trilha Timeline */}
              <div className="relative border-l border-border/40 pl-5 sm:pl-6 ml-3.5 flex flex-col gap-3.5">
                {mGroup.sessions.map((session) => (
                  <div key={session.id} className="relative group">
                    {/* Nó Dot Interativo */}
                    <span className="absolute -left-[25px] sm:-left-[29.5px] top-[26px] size-2 rounded-xs bg-muted-foreground/30 border border-background group-hover:bg-primary group-hover:scale-125 transition-all duration-150 z-10" />

                    <SessionCard session={session} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
