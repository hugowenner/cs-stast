import { notFound } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";
import { MatchHeader } from "@/components/matches/match-header";
import { MatchSummary } from "@/components/matches/match-summary";
import { MatchHighlights } from "@/components/matches/match-highlights";
import { PlayerMatchTable } from "@/components/matches/player-match-table";
import { MatchTimeline } from "@/components/matches/match-timeline";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { safeQuery } from "@/server/safeQuery";
import * as matchService from "@/server/services/match.service";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const details = await safeQuery(() => matchService.getMatchDetail(id), null);
  if (!details) notFound();

  const { match, teams, highlights, timeline } = details;

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Partida */}
      <FadeIn>
        <MatchHeader match={match} />
      </FadeIn>

      {/* Resumo da Partida */}
      <FadeIn delay={0.05}>
        <MatchSummary match={match} highlights={highlights} />
      </FadeIn>

      {/* Destaques/Recordes Individuais */}
      <FadeIn delay={0.08}>
        <MatchHighlights highlights={highlights} />
      </FadeIn>

      {/* Tabelas de Time A e B */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {teams.map((team) => (
          <FadeIn key={team.side} delay={0.12}>
            <PlayerMatchTable
              side={team.side}
              score={team.score}
              players={team.players}
            />
          </FadeIn>
        ))}
      </div>

      {/* Timeline de Eventos */}
      <FadeIn delay={0.18}>
        <MatchTimeline events={timeline} />
      </FadeIn>

      {/* Relatório Avançado de IA do Coach */}
      <FadeIn delay={0.2}>
        <CoachReportCard apiUrl={`/api/coach/match/${match.id}`} />
      </FadeIn>
    </div>
  );
}
