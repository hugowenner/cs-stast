import Link from "next/link";
import { Calendar, Clock, Download, ExternalLink, Shield, Swords, TrendingUp, TrendingDown } from "lucide-react";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { MatchTypeBadge } from "@/components/matches/match-type-badge";
import { cn } from "@/lib/utils";
import type { MatchMetadataDTO } from "@/server/dtos/matchDetails.dto";

export function MatchHeader({ match }: { match: MatchMetadataDTO }) {
  const eloChange = match.eloChangeGroup;
  const isEloPositive = eloChange >= 0;
  const cleanMapName = match.mapName.replace(/^de_/i, "").toUpperCase();

  return (
    <div className="surface-panel rounded-sm border border-border/40 p-5 sm:p-6 flex flex-col gap-4">
      {/* Top Telemetry Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono font-bold tracking-widest text-primary uppercase">
            01 / DETALHES DO CONFRONTO
          </span>
          <MatchTypeBadge trackedPlayersCount={match.trackedPlayersCount} />
        </div>

        <div className="flex items-center gap-2">
          {match.demoUrl && (
            <a
              href={match.demoUrl.startsWith("http") ? match.demoUrl : `https://gamersclub.com.br${match.demoUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xs border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-mono font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              <Download className="size-3" />
              Demo
            </a>
          )}
          {match.sourceId && (
            <a
              href={`https://gamersclub.com.br/lobby/match/${match.sourceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xs border border-border/60 bg-surface-deck px-2.5 py-1 text-xs font-mono font-bold text-foreground hover:bg-surface-elevated transition-colors"
            >
              <ExternalLink className="size-3" />
              Lobby GC
            </a>
          )}
        </div>
      </div>

      {/* Center Banner: Score & Map */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
            MAPA & PLACAR FINAL
          </span>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl sm:text-4xl font-black text-foreground tabular-nums tracking-tight">
              {match.scoreTeamA} <span className="text-muted-foreground/40 font-normal text-2xl">:</span> {match.scoreTeamB}
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-primary">
              {cleanMapName}
            </span>
          </div>
        </div>

        {/* ELO impact badge */}
        <div className="flex flex-col items-start sm:items-end gap-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
            Impacto ELO (Watchlist)
          </span>
          <div
            className={cn(
              "font-mono text-sm font-black px-3 py-1 rounded-xs border flex items-center gap-1.5 tabular-nums",
              isEloPositive
                ? "text-status-good border-status-good/30 bg-status-good/10"
                : "text-status-critical border-status-critical/30 bg-status-critical/10"
            )}
          >
            {isEloPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {isEloPositive ? `+${eloChange}` : eloChange} ELO
          </div>
        </div>
      </div>

      {/* Bottom Metadata Ribbon */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground/70 border-t border-border/30 pt-3">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-primary" />
          {new Date(match.playedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-accent-cyan" />
          {match.durationFormatted}
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="size-3.5 text-accent-gold" />
          Sessão:{" "}
          <Link href={`/sessions/${match.session.id}`} className="text-primary hover:underline font-bold">
            {match.session.name}
          </Link>
        </span>
      </div>
    </div>
  );
}
