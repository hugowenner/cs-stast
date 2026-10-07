"use client";

import { useState } from "react";
import Link from "next/link";
import { Handshake, Users, Swords, ChevronLeft, ChevronRight, Flame, ShieldAlert, Target } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { TacticalTabs } from "@/components/ui/tactical-tabs";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import type { DuoSummary, TrioSummary, PlayerMatchupSummary } from "@/server/services/competitive.service";
import type { RivalryH2HSummary } from "@/server/services/rivalry.service";
import { duoNarratives, rivalryNarratives } from "@/lib/narrator/templates";
import { cn } from "@/lib/utils";

interface SinergiaSectionProps {
  duos: DuoSummary[];
  dominantTrio: TrioSummary | null;
  topRivalries: RivalryH2HSummary[];
  matchups: PlayerMatchupSummary[];
  bestRecentDuo: DuoSummary | null;
}

type Tab = "duplas" | "trios" | "rivais" | "matchups";

const TABS: { id: Tab; label: string; icon: typeof Handshake }[] = [
  { id: "duplas",   label: "Duplas de Destaque", icon: Handshake },
  { id: "trios",    label: "Trio Dominante",     icon: Users },
  { id: "rivais",   label: "Rivalidades",        icon: Swords },
  { id: "matchups", label: "Confrontos Diretos", icon: Swords },
];

// ─── Tab: Duplas ──────────────────────────────────────────────────────────────
function DuplasTab({ duos, bestRecentDuo }: { duos: DuoSummary[]; bestRecentDuo: DuoSummary | null }) {
  if (duos.length === 0 && !bestRecentDuo) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Nenhuma dupla registrada com volume suficiente nesta temporada.
      </p>
    );
  }

  const isRecentDuo = (d: DuoSummary) =>
    bestRecentDuo &&
    ((d.playerA.id === bestRecentDuo.playerA.id && d.playerB.id === bestRecentDuo.playerB.id) ||
     (d.playerA.id === bestRecentDuo.playerB.id && d.playerB.id === bestRecentDuo.playerA.id));

  return (
    <div className="flex flex-col gap-3.5">
      {/* Destaque: dupla em alta */}
      {bestRecentDuo && (
        <div className="bg-surface-deck border border-status-good/30 rounded-sm p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-xs bg-status-good/15 text-status-good border border-status-good/25 shrink-0">
                <Flame className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <TacticalBadge label="SINERGIA RECENTE" variant="good" size="xs" />
                  <span className="text-[10px] font-mono text-status-good font-bold uppercase tracking-wider">
                    {duoNarratives[0].headline}
                  </span>
                </div>
                <p className="text-sm font-black text-foreground uppercase tracking-tight truncate mt-0.5">
                  {bestRecentDuo.playerA.nickname} + {bestRecentDuo.playerB.nickname}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-mono font-black text-status-good tabular-nums">
                <AnimatedNumber value={bestRecentDuo.winrate} decimals={0} suffix="%" />
              </div>
              <p className="text-[10px] font-mono text-muted-foreground/60 font-semibold">{bestRecentDuo.total} jogos juntos</p>
            </div>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/70 italic border-t border-border/30 pt-2">
            &ldquo;{duoNarratives[0].tagline}&rdquo;
          </p>
        </div>
      )}

      {/* Lista de duplas */}
      <div className="flex flex-col divide-y divide-border/30 border border-border/40 rounded-sm overflow-hidden bg-surface-deck/40">
        {duos.slice(0, 6).map((duo, idx) => (
          <div
            key={`${duo.playerA.id}-${duo.playerB.id}`}
            className={cn(
              "px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-surface-elevated/30 transition-micro group",
              isRecentDuo(duo) ? "bg-status-good/[0.03]" : ""
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="font-mono text-xs font-black w-5 text-center text-muted-foreground/50 shrink-0 tabular-nums">
                {idx + 1}
              </span>
              <div className="flex -space-x-1.5 shrink-0">
                <PlayerAvatar nickname={duo.playerA.nickname} avatarUrl={duo.playerA.avatarUrl} size="sm" />
                <PlayerAvatar nickname={duo.playerB.nickname} avatarUrl={duo.playerB.avatarUrl} size="sm" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {duo.playerA.nickname}
                </span>
                <span className="text-xs text-muted-foreground/40 font-mono">+</span>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {duo.playerB.nickname}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 font-mono text-xs tabular-nums">
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-semibold">WR</span>
                <span className="font-bold text-foreground">
                  <AnimatedNumber value={duo.winrate} decimals={0} suffix="%" />
                </span>
              </div>
              <div className="text-right min-w-[40px]">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 block font-semibold">JOGOS</span>
                <span className="text-muted-foreground/80">{duo.total}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Trios ───────────────────────────────────────────────────────────────
function TriosTab({ trio }: { trio: TrioSummary | null }) {
  if (!trio) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Nenhum trio com volume estatístico consolidado na temporada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-surface-deck border border-primary/30 rounded-sm p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex -space-x-2 shrink-0">
              {trio.players.map((p) => (
                <div key={p.id} className="rounded-sm border border-border/80 overflow-hidden">
                  <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="md" />
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <TacticalBadge label="TRIO DOMINANTE" variant="primary" size="xs" />
              <p className="text-sm font-black text-foreground uppercase tracking-tight truncate mt-1">
                {trio.players.map((p) => p.nickname).join(" + ")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "WINRATE",  val: `${trio.winrate.toFixed(0)}%`, accent: "text-status-good" },
            { label: "VITÓRIAS", val: trio.wins, accent: "text-foreground" },
            { label: "PARTIDAS", val: trio.total, accent: "text-foreground" },
            { label: "RATING MÉDIO", val: trio.avgRating.toFixed(2), accent: "text-primary" },
          ].map(({ label, val, accent }) => (
            <div key={label} className="p-2.5 bg-surface-panel border border-border/40 rounded-xs text-center">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">{label}</span>
              <span className={cn("text-base font-mono font-black mt-0.5 tabular-nums block", accent)}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Rivais ──────────────────────────────────────────────────────────────
function RivaisTab({ rivalries }: { rivalries: RivalryH2HSummary[] }) {
  const [page, setPage] = useState(0);
  if (rivalries.length === 0) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Nenhuma rivalidade consolidada ainda nesta temporada.
      </p>
    );
  }

  const rivalry = rivalries[page];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-surface-deck border border-border/60 rounded-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-3 mb-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70">
            RIVALIDADE {page + 1} DE {rivalries.length}
          </span>
          <p className="text-[11px] font-mono text-muted-foreground/60 italic truncate max-w-xs">
            {rivalryNarratives[page % rivalryNarratives.length].tagline}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0 text-center">
            <PlayerAvatar nickname={rivalry.playerA.nickname} avatarUrl={rivalry.playerA.avatarUrl} size="lg" />
            <Link href={`/players/${rivalry.playerA.id}`} className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors truncate block w-full">
              {rivalry.playerA.nickname}
            </Link>
            <span className="text-base sm:text-lg font-mono font-black text-status-good tabular-nums">{rivalry.winsA}V</span>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0 px-2">
            <div className="size-8 rounded-xs bg-surface-panel border border-border/60 flex items-center justify-center text-muted-foreground">
              <Swords className="size-4" />
            </div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground/70 mt-1">{rivalry.matchesAgainst} jogos</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1 min-w-0 text-center">
            <PlayerAvatar nickname={rivalry.playerB.nickname} avatarUrl={rivalry.playerB.avatarUrl} size="lg" />
            <Link href={`/players/${rivalry.playerB.id}`} className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors truncate block w-full">
              {rivalry.playerB.nickname}
            </Link>
            <span className="text-base sm:text-lg font-mono font-black text-status-good tabular-nums">{rivalry.winsB}V</span>
          </div>
        </div>
      </div>

      {rivalries.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setPage((p) => (p - 1 + rivalries.length) % rivalries.length)}
            className="flex-1 py-1.5 rounded-xs bg-surface-deck border border-border/50 hover:bg-surface-elevated flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-mono text-xs gap-1 cursor-pointer"
            aria-label="Rivalidade anterior"
          >
            <ChevronLeft className="size-3.5" />
            <span className="text-[10px] font-bold uppercase">Anterior</span>
          </button>
          <button
            onClick={() => setPage((p) => (p + 1) % rivalries.length)}
            className="flex-1 py-1.5 rounded-xs bg-surface-deck border border-border/50 hover:bg-surface-elevated flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-mono text-xs gap-1 cursor-pointer"
            aria-label="Próxima rivalidade"
          >
            <span className="text-[10px] font-bold uppercase">Próxima</span>
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Matchups ────────────────────────────────────────────────────────────
function MatchupsTab({ matchups }: { matchups: PlayerMatchupSummary[] }) {
  const relevant = matchups.filter((m) => m.dominates || m.struggles);
  if (relevant.length === 0) {
    return (
      <p className="text-xs font-mono text-muted-foreground/60 text-center py-8">
        Sem confrontos diretos suficientes registrados.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {relevant.slice(0, 6).map((m) => (
        <div key={m.player.id} className="bg-surface-deck border border-border/50 rounded-sm p-3 flex flex-col justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <PlayerAvatar nickname={m.player.nickname} avatarUrl={m.player.avatarUrl} size="sm" />
            <span className="text-xs font-bold text-foreground truncate">{m.player.nickname}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {m.dominates && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-status-good">
                <Target className="size-3 shrink-0" />
                <span className="truncate">Vantagem sobre <strong>{m.dominates.rivalName}</strong></span>
              </div>
            )}
            {m.struggles && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-status-warning">
                <ShieldAlert className="size-3 shrink-0" />
                <span className="truncate">Dificuldade contra <strong>{m.struggles.rivalName}</strong></span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SinergiaSection({ duos, dominantTrio, topRivalries, matchups, bestRecentDuo }: SinergiaSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("duplas");

  return (
    <div className="bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col">
      {/* Header com Tactical Tabs */}
      <div className="p-3 sm:p-4 border-b border-border/40 bg-surface-deck/40">
        <TacticalTabs
          tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as Tab)}
        />
      </div>

      <div className="p-4 sm:p-5">
        {activeTab === "duplas"   && <DuplasTab duos={duos} bestRecentDuo={bestRecentDuo} />}
        {activeTab === "trios"    && <TriosTab trio={dominantTrio} />}
        {activeTab === "rivais"   && <RivaisTab rivalries={topRivalries} />}
        {activeTab === "matchups" && <MatchupsTab matchups={matchups} />}
      </div>
    </div>
  );
}
