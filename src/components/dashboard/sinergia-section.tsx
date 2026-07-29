"use client";

import { useState } from "react";
import Link from "next/link";
import { Handshake, Users, Swords, ChevronLeft, ChevronRight } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { DuoSummary, TrioSummary, PlayerMatchupSummary } from "@/server/services/competitive.service";
import type { RivalryH2HSummary } from "@/server/services/rivalry.service";

interface SinergiaSectionProps {
  duos: DuoSummary[];
  dominantTrio: TrioSummary | null;
  topRivalries: RivalryH2HSummary[];
  matchups: PlayerMatchupSummary[];
  bestRecentDuo: DuoSummary | null;
}

type Tab = "duplas" | "trios" | "rivais" | "matchups";

const TABS: { id: Tab; label: string; icon: typeof Handshake }[] = [
  { id: "duplas",   label: "Duplas",   icon: Handshake },
  { id: "trios",    label: "Trios",    icon: Users },
  { id: "rivais",   label: "Rivais",   icon: Swords },
  { id: "matchups", label: "Matchups", icon: Swords },
];

// ─── Tab: Duplas ──────────────────────────────────────────────────────────────
function DuplasTab({ duos, bestRecentDuo }: { duos: DuoSummary[]; bestRecentDuo: DuoSummary | null }) {
  if (duos.length === 0 && !bestRecentDuo) {
    return <p className="text-sm text-muted-foreground/55 text-center py-8">Nenhuma dupla registrada ainda.</p>;
  }

  const isRecentDuo = (d: DuoSummary) =>
    bestRecentDuo &&
    ((d.playerA.id === bestRecentDuo.playerA.id && d.playerB.id === bestRecentDuo.playerB.id) ||
     (d.playerA.id === bestRecentDuo.playerB.id && d.playerB.id === bestRecentDuo.playerA.id));

  return (
    <div className="flex flex-col gap-3">
      {/* Destaque: dupla quente */}
      {bestRecentDuo && (
        <div className="bg-status-good/[0.04] border border-status-good/15 rounded-xl p-4 flex items-center gap-3">
          <div className="text-base shrink-0">🔥</div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-widest font-bold text-status-good/70 mb-1">Dupla Quente</p>
            <p className="text-sm font-black text-white truncate">
              {bestRecentDuo.playerA.nickname} + {bestRecentDuo.playerB.nickname}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-status-good tabular-nums">
              <AnimatedNumber value={bestRecentDuo.winrate} decimals={0} suffix="%" />
            </p>
            <p className="text-[8px] text-muted-foreground/50 font-semibold">{bestRecentDuo.total}j</p>
          </div>
        </div>
      )}
      {/* Lista de duplas */}
      <div className="divide-y divide-white/[0.04]">
        {duos.slice(0, 6).map((duo, idx) => (
          <div key={`${duo.playerA.id}-${duo.playerB.id}`} className={`py-3 flex items-center gap-3 ${isRecentDuo(duo) ? "opacity-70" : ""}`}>
            <span className="text-[11px] font-black text-muted-foreground/35 w-4 shrink-0">{idx + 1}</span>
            <div className="flex -space-x-2 shrink-0">
              <div className="size-7 rounded-lg border border-slate-800 overflow-hidden">
                <PlayerAvatar nickname={duo.playerA.nickname} avatarUrl={duo.playerA.avatarUrl} size="sm" />
              </div>
              <div className="size-7 rounded-lg border border-slate-800 overflow-hidden">
                <PlayerAvatar nickname={duo.playerB.nickname} avatarUrl={duo.playerB.avatarUrl} size="sm" />
              </div>
            </div>
            <p className="text-xs font-bold text-white/90 truncate flex-1 min-w-0">
              {duo.playerA.nickname} + {duo.playerB.nickname}
            </p>
            <div className="text-right shrink-0 grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-[8px] uppercase tracking-widest text-muted-foreground/45 font-bold">WR</p>
                <p className="text-xs font-black text-white tabular-nums"><AnimatedNumber value={duo.winrate} decimals={0} suffix="%" /></p>
              </div>
              <div className="text-center">
                <p className="text-[8px] uppercase tracking-widest text-muted-foreground/45 font-bold">Jogos</p>
                <p className="text-xs font-black text-white tabular-nums">{duo.total}</p>
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
    return <p className="text-sm text-muted-foreground/55 text-center py-8">Nenhum trio com dados suficientes ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-accent-purple/[0.03] border border-accent-purple/15 rounded-xl p-5 flex flex-col gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest font-bold text-accent-purple/70 mb-2">Trio Dominante da Temporada</p>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {trio.players.map((p) => (
                <div key={p.id} className="size-10 rounded-xl border-2 border-slate-900 overflow-hidden">
                  <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="md" />
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">
                {trio.players.map((p) => p.nickname).join(" + ")}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 border-t border-white/[0.04] pt-4">
          {[
            { label: "Winrate",  val: `${trio.winrate.toFixed(0)}%` },
            { label: "Vitórias", val: trio.wins },
            { label: "Partidas", val: trio.total },
            { label: "Rating",   val: trio.avgRating.toFixed(2) },
          ].map(({ label, val }) => (
            <div key={label} className="text-center">
              <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold">{label}</p>
              <p className="text-sm font-black text-white mt-0.5">{val}</p>
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
    return <p className="text-sm text-muted-foreground/55 text-center py-8">Nenhuma rivalidade registrada ainda.</p>;
  }

  const rivalry = rivalries[page];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5">
        <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50 mb-4 text-center">
          Rivalidade {page + 1} de {rivalries.length}
        </p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <PlayerAvatar nickname={rivalry.playerA.nickname} avatarUrl={rivalry.playerA.avatarUrl} size="lg" />
            <Link href={`/players/${rivalry.playerA.id}`} className="text-sm font-black text-white hover:text-primary transition-colors truncate">
              {rivalry.playerA.nickname}
            </Link>
            <p className="text-lg font-black text-status-good tabular-nums">{rivalry.winsA}V</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Swords className="size-5 text-muted-foreground/40" />
            <p className="text-[10px] font-bold text-muted-foreground/50 text-center">{rivalry.matchesAgainst} confrontos</p>
          </div>
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <PlayerAvatar nickname={rivalry.playerB.nickname} avatarUrl={rivalry.playerB.avatarUrl} size="lg" />
            <Link href={`/players/${rivalry.playerB.id}`} className="text-sm font-black text-white hover:text-primary transition-colors truncate">
              {rivalry.playerB.nickname}
            </Link>
            <p className="text-lg font-black text-status-good tabular-nums">{rivalry.winsB}V</p>
          </div>
        </div>
      </div>
      {rivalries.length > 1 && (
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => (p - 1 + rivalries.length) % rivalries.length)}
            className="flex-1 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => setPage((p) => (p + 1) % rivalries.length)}
            className="flex-1 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer">
            <ChevronRight className="size-4" />
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
    return <p className="text-sm text-muted-foreground/55 text-center py-8">Nenhuma soberania H2H clara ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {relevant.slice(0, 6).map((m) => (
        <div key={m.player.id} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <PlayerAvatar nickname={m.player.nickname} avatarUrl={m.player.avatarUrl} size="sm" />
            <p className="text-sm font-black text-white">{m.player.nickname}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {m.dominates && (
              <span className="text-[10px] font-bold text-status-good bg-status-good/10 border border-status-good/20 px-2 py-0.5 rounded-full">
                ✓ Domina {m.dominates.nickname}
              </span>
            )}
            {m.struggles && (
              <span className="text-[10px] font-bold text-status-critical bg-status-critical/10 border border-status-critical/20 px-2 py-0.5 rounded-full">
                ✗ Sofre contra {m.struggles.nickname}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function SinergiaSection({ duos, dominantTrio, topRivalries, matchups, bestRecentDuo }: SinergiaSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("duplas");

  return (
    <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
      <div className="flex border-b border-white/[0.05]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
              activeTab === id
                ? "border-primary text-white bg-primary/[0.04]"
                : "border-transparent text-muted-foreground/55 hover:text-white/70 hover:bg-white/[0.02]"
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      <div className="p-5">
        {activeTab === "duplas"   && <DuplasTab duos={duos} bestRecentDuo={bestRecentDuo} />}
        {activeTab === "trios"    && <TriosTab trio={dominantTrio} />}
        {activeTab === "rivais"   && <RivaisTab rivalries={topRivalries} />}
        {activeTab === "matchups" && <MatchupsTab matchups={matchups} />}
      </div>
    </div>
  );
}
