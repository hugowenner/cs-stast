import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Handshake, Target } from "lucide-react";
import type { DuoSummary, TrioSummary } from "@/server/services/competitive.service";

interface DuoParceriasSectionProps {
  duos: DuoSummary[];
  dominantTrio: TrioSummary | null;
}

export function DuoParceriasSection({ duos, dominantTrio }: DuoParceriasSectionProps) {
  if (duos.length === 0 && !dominantTrio) return null;

  return (
    <FadeIn delay={0.1}>
      <div className="mt-6">
        <SectionHeader
          title="Melhores Parcerias"
          subtitle="Duplas e trios com maior sinergia na temporada"
          className="mb-4"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">

          {duos.slice(0, 2).map((duo, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-status-good/15 bg-status-good/[0.02] overflow-hidden">
              <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2">
                <Handshake className="size-3 text-status-good shrink-0" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-status-good/80">
                  {i === 0 ? "Dupla principal" : "Dupla #2"}
                </span>
                <span className="ml-auto text-[9px] text-muted-foreground/60 font-semibold">{duo.total} partidas</span>
              </div>
              <div className="px-4 py-4 flex items-center justify-center gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  <PlayerAvatar nickname={duo.playerA.nickname} avatarUrl={duo.playerA.avatarUrl} size="md" />
                  <p className="text-xs font-bold text-white text-center truncate max-w-[90px]">{duo.playerA.nickname}</p>
                </div>
                <span className="text-muted-foreground/40 text-base font-light shrink-0">+</span>
                <div className="flex flex-col items-center gap-1.5">
                  <PlayerAvatar nickname={duo.playerB.nickname} avatarUrl={duo.playerB.avatarUrl} size="md" />
                  <p className="text-xs font-bold text-white text-center truncate max-w-[90px]">{duo.playerB.nickname}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 px-4 pb-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                  <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Vitórias</p>
                  <p className="text-base font-black text-status-good mt-0.5">{duo.wins}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                  <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">WR</p>
                  <p className="text-base font-black text-white mt-0.5">{duo.winrate}%</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                  <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Rating da dupla</p>
                  <p className="text-base font-black text-white mt-0.5">{duo.avgRating?.toFixed(2) ?? "—"}</p>
                </div>
              </div>
            </div>
          ))}

          {dominantTrio && (
            <div className="glass-panel rounded-2xl border border-accent-cyan/15 bg-accent-cyan/[0.02] overflow-hidden">
              <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2">
                <Target className="size-3 text-accent-cyan shrink-0" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-accent-cyan/80">Trio dominante</span>
                <span className="ml-auto text-[9px] text-muted-foreground/60 font-semibold">{dominantTrio.total} partidas</span>
              </div>
              <div className="px-4 py-4 flex items-center justify-center gap-3">
                {dominantTrio.players.map((p) => (
                  <div key={p.id} className="flex flex-col items-center gap-1.5">
                    <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                    <p className="text-[10px] font-bold text-white text-center truncate max-w-[72px]">{p.nickname}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5 px-4 pb-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                  <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Vitórias</p>
                  <p className="text-base font-black text-status-good mt-0.5">{dominantTrio.wins}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                  <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Winrate</p>
                  <p className="text-base font-black text-accent-cyan mt-0.5">{dominantTrio.winrate}%</p>
                </div>
              </div>
            </div>
          )}

          {duos.length > 2 && (
            <div className="sm:col-span-2 lg:col-span-3 glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.05]">
                <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60">Outras duplas</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {duos.slice(2).map((duo, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex -space-x-2 shrink-0">
                      <PlayerAvatar nickname={duo.playerA.nickname} avatarUrl={duo.playerA.avatarUrl} size="sm" />
                      <PlayerAvatar nickname={duo.playerB.nickname} avatarUrl={duo.playerB.avatarUrl} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white/90 truncate">{duo.playerA.nickname} + {duo.playerB.nickname}</p>
                      <p className="text-[10px] text-muted-foreground/65">{duo.total} partidas juntos</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[8px] text-muted-foreground/60 uppercase tracking-widest font-bold">WR</p>
                        <p className="text-sm font-black text-status-good">{duo.winrate}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-muted-foreground/60 uppercase tracking-widest font-bold">Rating da dupla</p>
                        <p className="text-sm font-black text-white/90">{duo.avgRating?.toFixed(2) ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </FadeIn>
  );
}
