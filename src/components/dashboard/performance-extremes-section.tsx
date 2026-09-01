import { FadeIn } from "@/components/motion/fade-in";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { PlayerAvatar } from "@/components/players/player-avatar";
import Link from "next/link";
import { Flame, ShieldAlert } from "lucide-react";
import type { PerformanceExtreme } from "@/server/services/competitive.service";

interface PerformanceExtremesSectionProps {
  best: PerformanceExtreme | null;
  worst: PerformanceExtreme | null;
}

export function PerformanceExtremesSection({ best, worst }: PerformanceExtremesSectionProps) {
  if (!best && !worst) return null;

  return (
    <section>
      <FadeIn delay={0.15}>
        <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60 mb-4">Melhores e piores atuações</p>
      </FadeIn>
      <FadeIn delay={0.155}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {best && (
            <div className="glass-panel rounded-2xl border border-status-warning/25 bg-status-warning/[0.02] overflow-hidden">
              <div className="px-6 py-4 border-b border-status-warning/10 flex items-center gap-2">
                <Flame className="size-3.5 text-status-warning shrink-0" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-status-warning/80">Atuação do servidor</p>
              </div>
              <div className="px-6 py-6 flex items-start gap-5">
                <PlayerAvatar nickname={best.player.nickname} avatarUrl={best.player.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <Link href={`/players/${best.player.id}`} className="text-sm font-black text-white hover:text-primary transition-colors block truncate">
                    {best.player.nickname}
                  </Link>
                  <p className="text-[10px] text-muted-foreground/65 mt-0.5">{best.mapName} · {best.playedAt}</p>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {([
                      { label: "Rating", num: best.rating,           dec: 2, dur: 0.8 },
                      { label: "K/D",    num: parseFloat(best.kd),   dec: 2, dur: 0.7 },
                      { label: "ADR",    num: best.adr,              dec: 0, dur: 0.65 },
                      { label: "Kills",  num: best.kills,            dec: 0, dur: 0.6 },
                    ] as const).map((stat) => (
                      <div key={stat.label} className="text-center bg-status-warning/5 border border-status-warning/10 rounded-lg p-2">
                        <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/60">{stat.label}</p>
                        <p className="text-xs font-black text-status-warning mt-0.5 tabular-nums">
                          <AnimatedNumber value={stat.num} decimals={stat.dec} duration={stat.dur} />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {worst && (
            <div className="glass-panel rounded-2xl border border-status-critical/20 bg-status-critical/[0.02] overflow-hidden">
              <div className="px-6 py-4 border-b border-status-critical/10 flex items-center gap-2">
                <ShieldAlert className="size-3.5 text-status-critical shrink-0" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-status-critical/80">Para esquecer</p>
              </div>
              <div className="px-6 py-6 flex items-start gap-5">
                <PlayerAvatar nickname={worst.player.nickname} avatarUrl={worst.player.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <Link href={`/players/${worst.player.id}`} className="text-sm font-black text-white hover:text-primary transition-colors block truncate">
                    {worst.player.nickname}
                  </Link>
                  <p className="text-[10px] text-muted-foreground/65 mt-0.5">{worst.mapName} · {worst.playedAt}</p>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {([
                      { label: "Rating", num: worst.rating,          dec: 2, dur: 0.8 },
                      { label: "K/D",    num: parseFloat(worst.kd),  dec: 2, dur: 0.7 },
                      { label: "ADR",    num: worst.adr,             dec: 0, dur: 0.65 },
                      { label: "Kills",  num: worst.kills,           dec: 0, dur: 0.6 },
                    ] as const).map((stat) => (
                      <div key={stat.label} className="text-center bg-status-critical/5 border border-status-critical/10 rounded-lg p-2">
                        <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/60">{stat.label}</p>
                        <p className="text-xs font-black text-status-critical mt-0.5 tabular-nums">
                          <AnimatedNumber value={stat.num} decimals={stat.dec} duration={stat.dur} />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </FadeIn>
    </section>
  );
}
