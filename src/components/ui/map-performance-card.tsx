import Link from "next/link";
import { Crown, Flame, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import { DeltaIndicator } from "./delta-indicator";

const MAP_IMAGE_PATHS: Record<string, string> = {
  mirage: "/maps/mirage.png",
  dust2: "/maps/dust2.png",
  inferno: "/maps/inferno.png",
  ancient: "/maps/ancient.png",
  anubis: "/maps/anubis.png",
  nuke: "/maps/nuke.png",
  cache: "/maps/cache.png",
  overpass: "/maps/overpass.png",
  vertigo: "/maps/mirage.png", // fallback
};

export function getCleanMapImage(mapName: string): string | null {
  const norm = mapName.toLowerCase().replace(/^de_/, "").trim();
  return MAP_IMAGE_PATHS[norm] ?? null;
}

export interface MapPerformanceBaseProps {
  mapName: string;
  rating: number;
  winrate: number;
  matchesCount: number;
  recentRatings?: number[];
  delta?: number;
  isBest?: boolean;
  isWorst?: boolean;
  specialistNickname?: string;
  specialistAvatarUrl?: string | null;
  tagline?: string;
  className?: string;
}

export function MapPerformanceCard({
  mapName,
  rating,
  winrate,
  matchesCount,
  recentRatings,
  delta,
  isBest,
  isWorst,
  specialistNickname,
  tagline,
  className,
}: MapPerformanceBaseProps) {
  const mapImg = getCleanMapImage(mapName);
  const cleanName = mapName.replace(/^de_/i, "").toUpperCase();

  return (
    <div
      className={cn(
        "surface-panel rounded-sm relative overflow-hidden flex flex-col justify-between p-4 group transition-all duration-200 border",
        isBest
          ? "border-status-good/35 bg-status-good/[0.02]"
          : isWorst
            ? "border-status-critical/35 bg-status-critical/[0.02]"
            : "border-border-default hover:border-border-strong",
        className,
      )}
    >
      {/* Background image texture (functional, high contrast) */}
      {mapImg && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src={mapImg}
            alt={mapName}
            className="w-full h-full object-cover object-center opacity-[0.22] grayscale-[30%] group-hover:scale-105 group-hover:opacity-[0.28] transition-all duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-panel)] via-[var(--surface-panel)]/80 to-transparent" />
        </div>
      )}

      {/* Top row: Map name + Status Tag */}
      <div className="relative z-10 flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/60">
            MAPA
          </span>
          <h4 className="text-sm font-black text-white uppercase tracking-wider leading-none mt-0.5">
            {cleanName}
          </h4>
        </div>

        {isBest && (
          <span className="badge-tactical-good text-[7.5px] font-black tracking-wider">
            <Flame className="size-2.5" /> FORTE
          </span>
        )}
        {isWorst && (
          <span className="badge-tactical-critical text-[7.5px] font-black tracking-wider">
            <ShieldAlert className="size-2.5" /> DIFÍCIL
          </span>
        )}
      </div>

      {/* Center stats */}
      <div className="relative z-10 grid grid-cols-2 gap-2 my-2 border-y border-white/[0.04] py-2.5">
        <div>
          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50">
            Rating
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-black font-data text-white tabular-nums">
              {rating.toFixed(2)}
            </span>
            {delta !== undefined && (
              <DeltaIndicator value={delta} size="xs" />
            )}
          </div>
        </div>

        <div>
          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50">
            Winrate
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className={cn(
                "text-base font-black font-data tabular-nums",
                winrate >= 60
                  ? "text-status-good"
                  : winrate < 45
                    ? "text-status-critical"
                    : "text-white",
              )}
            >
              {Math.round(winrate)}%
            </span>
            <span className="text-[9px] font-data text-muted-foreground/50">
              ({matchesCount}j)
            </span>
          </div>
        </div>
      </div>

      {/* Bottom row: Sparkline or Specialist / Tagline */}
      <div className="relative z-10 flex items-center justify-between pt-1 text-[9px] text-muted-foreground/55">
        {specialistNickname ? (
          <div className="flex items-center gap-1.5 truncate">
            <Crown className="size-3 text-gold shrink-0" />
            <span className="truncate">
              Dono: <strong className="text-white/80">{specialistNickname}</strong>
            </span>
          </div>
        ) : tagline ? (
          <p className="text-[9px] italic text-muted-foreground/50 truncate max-w-[180px]">
            {tagline}
          </p>
        ) : (
          <span>{matchesCount} partidas</span>
        )}

        {recentRatings && recentRatings.length > 1 && (
          <Sparkline data={recentRatings} width={50} height={14} />
        )}
      </div>
    </div>
  );
}
