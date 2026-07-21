import Link from "next/link";
import { Calendar, Clock, ExternalLink, Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import type { MatchMetadataDTO } from "@/server/dtos/matchDetails.dto";

export function MatchHeader({ match }: { match: MatchMetadataDTO }) {
  const eloChange = match.eloChangeGroup;
  const isEloPositive = eloChange >= 0;
  const eloColorClass = isEloPositive ? "text-status-good border-status-good/20 bg-status-good/10" : "text-status-critical border-status-critical/20 bg-status-critical/10";

  return (
    <PageHeader
      title={
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-extrabold text-white">
            {match.scoreTeamA} <span className="text-muted-foreground text-xl font-normal">x</span> {match.scoreTeamB}
          </span>
          <span className="text-lg font-medium text-accent-cyan">{match.mapName}</span>
        </div>
      }
      subtitle={
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {new Date(match.playedAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {match.durationFormatted}
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="size-3.5" />
            Sessão:{" "}
            <Link href={`/sessions/${match.session.id}`} className="text-primary hover:underline font-medium">
              {match.session.name}
            </Link>
          </span>
        </div>
      }
      actions={
        <div className="flex items-center gap-4 text-right">
          {match.sourceId && (
            <a
              href={`https://gamersclub.com.br/lobby/match/${match.sourceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Lobby GC <ExternalLink className="size-3" />
            </a>
          )}
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Impacto ELO (Watchlist)
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 border ${eloColorClass}`}>
              {isEloPositive ? "+" : ""}{eloChange} ELO
            </span>
          </div>
        </div>
      }
    />
  );
}
