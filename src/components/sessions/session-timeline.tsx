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
    const monthName = sDate.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" })
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
    <div className="flex flex-col gap-10">
      {grouped.map((yGroup) => (
        <div key={yGroup.year} className="flex flex-col gap-6">
          {/* Cabeçalho do Ano */}
          <div className="flex items-center gap-4">
            <span className="text-xl font-black text-white bg-white/[0.03] border border-white/[0.08] px-4 py-1 rounded-xl shadow-[0_0_12px_rgba(255,255,255,0.01)]">
              {yGroup.year}
            </span>
            <div className="h-px bg-white/[0.06] flex-1" />
          </div>

          {yGroup.months.map((mGroup) => (
            <div key={mGroup.monthName} className="flex flex-col gap-4">
              {/* Cabeçalho do Mês */}
              <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] pl-3">
                {mGroup.monthName}
              </h3>

              {/* Trilha Timeline */}
              <div className="relative border-l border-white/[0.06] pl-6 ml-3 flex flex-col gap-5">
                {mGroup.sessions.map((session) => (
                  <div key={session.id} className="relative group">
                    {/* Nó Dot Interativo */}
                    <span className="absolute -left-[29.5px] top-[28px] size-2 rounded-full bg-white/20 border border-[#0a0a0c] group-hover:bg-primary group-hover:scale-125 group-hover:shadow-[0_0_8px_0_rgba(var(--primary-rgb),0.5)] transition-all duration-200 z-10" />
                    
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
