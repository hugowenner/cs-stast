import { FadeIn } from "@/components/motion/fade-in";
import { safeQuery } from "@/server/safeQuery";
import * as sessionService from "@/server/services/session.service";
import {
  computeSimpleSessionSummary,
  calculateSessionsOverview,
} from "@/server/analytics/session.analytics";
import { SessionHero } from "@/components/sessions/session-hero";
import { SessionFilters, type SessionPeriod } from "@/components/sessions/session-filters";
import { SessionTimeline } from "@/components/sessions/session-timeline";
import { SessionEmptyState } from "@/components/sessions/session-empty-state";

import { getActiveSeason } from "@/server/services/season.service";

export const dynamic = "force-dynamic";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const activePeriod = (rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "season" ? rawPeriod : "all") as SessionPeriod;

  // Montar cláusula where baseada no período
  let whereClause = {};
  if (activePeriod === "7d") {
    whereClause = { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
  } else if (activePeriod === "30d") {
    whereClause = { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
  } else if (activePeriod === "season") {
    const activeSeason = await getActiveSeason();
    if (activeSeason) {
      whereClause = {
        date: {
          gte: activeSeason.startDate,
          lte: activeSeason.endDate,
        },
      };
    }
  }

  // Buscar sessões detalhadas
  const dbSessions = await safeQuery(
    () => sessionService.listSessions({ where: whereClause, take: 50 }),
    [],
  );

  // Computar resumos em memória
  const simpleSessions = dbSessions.map(computeSimpleSessionSummary);
  const overview = calculateSessionsOverview(simpleSessions);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full px-4 sm:px-6">
      {/* Hero Header */}
      <FadeIn>
        <SessionHero overview={overview} />
      </FadeIn>

      {/* Filtros Temporais */}
      <FadeIn delay={0.03}>
        <SessionFilters activePeriod={activePeriod} />
      </FadeIn>

      {/* Timeline ou Estado Vazio */}
      <FadeIn delay={0.06}>
        {simpleSessions.length === 0 ? (
          <SessionEmptyState />
        ) : (
          <SessionTimeline sessions={simpleSessions} />
        )}
      </FadeIn>

      {/* Footer Integrado */}
      <footer className="mt-12 pt-6 border-t border-white/[0.04] text-center flex flex-col items-center gap-1.5 pb-8">
        <p className="text-[10px] uppercase tracking-widest font-black text-white/40 leading-none">
          CS2 Stats Hub
        </p>
        <p className="text-[10px] text-muted-foreground/50 leading-none">
          Plataforma de análise competitiva para partidas de CS2
        </p>
        <p className="text-[9px] text-muted-foreground/35 leading-none mt-1">
          &copy; 2026 · Desenvolvido com ⚡ por LorD
        </p>
      </footer>
    </div>
  );
}

