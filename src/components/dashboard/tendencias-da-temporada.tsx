import Link from "next/link";
import { TrendingUp, TrendingDown, Flame, Snowflake, ArrowRight, BarChart3 } from "lucide-react";
import { trendNarratives } from "@/lib/narrator/templates";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { SeasonComparisonEntry, StreakEntry, MapPerformanceEntry } from "@/server/services/competitive.service";

interface TendenciasDaTemporadaProps {
  topGainers: SeasonComparisonEntry[];
  topDecliners: SeasonComparisonEntry[];
  hotStreaks: StreakEntry[];
  coldStreaks: StreakEntry[];
  mapWinrates: MapPerformanceEntry[];
}

// ─── Card padrão de tendência ─────────────────────────────────────────────────
function TendenciaCard({
  icon: Icon,
  label,
  badge,
  badgeColor,
  borderColor,
  bgColor,
  description,
  children,
}: {
  icon: typeof TrendingUp;
  label: string;
  badge: string;
  badgeColor: string;
  borderColor: string;
  bgColor: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`glass-panel ${borderColor} ${bgColor} rounded-2xl p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`size-4 shrink-0 ${badgeColor}`} />
          <p className={`text-[10px] uppercase tracking-widest font-bold ${badgeColor} opacity-80`}>{label}</p>
        </div>
        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${badgeColor} border-current bg-current/[0.04] opacity-90`}>
          {badge}
        </span>
      </div>
      {description && (
        <p className="text-[9px] text-muted-foreground/40 -mt-1 font-semibold">{description}</p>
      )}
      {children}
    </div>
  );
}

// ─── Maior Evolução ───────────────────────────────────────────────────────────
function EvolucaoCards({ gainers }: { gainers: SeasonComparisonEntry[] }) {
  const top = gainers.slice(0, 3);
  if (top.length === 0) return null;
  const [featured, ...rest] = top;

  return (
    <TendenciaCard
      icon={TrendingUp}
      label="📈 Subindo nos Gráficos"
      badge="↑ Em modo deus"
      badgeColor="text-status-good"
      borderColor="border border-status-good/20"
      bgColor="bg-status-good/[0.015]"
      description="Últimas 10 partidas vs. média da temporada"
    >
      {/* Featured */}
      <div className="flex items-center gap-3">
        <PlayerAvatar nickname={featured.player.nickname} avatarUrl={featured.player.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <Link href={`/players/${featured.player.id}`} className="text-sm font-black text-white hover:text-primary transition-colors block truncate">
            {featured.player.nickname}
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs tabular-nums">
            <span className="text-muted-foreground/55">{featured.season.rating.toFixed(2)}</span>
            <ArrowRight className="size-2.5 text-muted-foreground/30 shrink-0" />
            <span className="font-black text-status-good">{featured.recent.rating.toFixed(2)}</span>
            <span className="text-[10px] text-status-good font-bold">(+{featured.diff.rating.toFixed(2)})</span>
          </div>
        </div>
      </div>
      {/* Rest */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-status-good/10">
          {rest.map((e) => (
            <div key={e.player.id} className="flex items-center gap-2">
              <PlayerAvatar nickname={e.player.nickname} avatarUrl={e.player.avatarUrl} size="sm" />
              <Link href={`/players/${e.player.id}`} className="text-xs font-bold text-white/80 hover:text-primary transition-colors flex-1 truncate">
                {e.player.nickname}
              </Link>
              <span className="text-xs font-black text-status-good tabular-nums shrink-0">+{e.diff.rating.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </TendenciaCard>
  );
}

// ─── Maior Queda ──────────────────────────────────────────────────────────────
function QuedaCards({ decliners }: { decliners: SeasonComparisonEntry[] }) {
  const top = decliners.slice(0, 3);
  if (top.length === 0) return null;
  const [featured, ...rest] = top;

  return (
    <TendenciaCard
      icon={TrendingDown}
      label="😂 Fase ruim detectada"
      badge="↓ Reza"
      badgeColor="text-status-warning"
      borderColor="border border-status-warning/20"
      bgColor="bg-status-warning/[0.015]"
      description="Últimas 10 partidas vs. média da temporada"
    >
      <div className="flex items-center gap-3">
        <PlayerAvatar nickname={featured.player.nickname} avatarUrl={featured.player.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <Link href={`/players/${featured.player.id}`} className="text-sm font-black text-white hover:text-primary transition-colors block truncate">
            {featured.player.nickname}
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs tabular-nums">
            <span className="text-muted-foreground/55">{featured.season.rating.toFixed(2)}</span>
            <ArrowRight className="size-2.5 text-muted-foreground/30 shrink-0" />
            <span className="font-black text-status-warning">{featured.recent.rating.toFixed(2)}</span>
            <span className="text-[10px] text-status-warning font-bold">({featured.diff.rating.toFixed(2)})</span>
          </div>
        </div>
      </div>
      {rest.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-status-warning/10">
          {rest.map((e) => (
            <div key={e.player.id} className="flex items-center gap-2">
              <PlayerAvatar nickname={e.player.nickname} avatarUrl={e.player.avatarUrl} size="sm" />
              <Link href={`/players/${e.player.id}`} className="text-xs font-bold text-white/80 hover:text-primary transition-colors flex-1 truncate">
                {e.player.nickname}
              </Link>
              <span className="text-xs font-black text-status-warning tabular-nums shrink-0">{e.diff.rating.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </TendenciaCard>
  );
}

// ─── Sequência Ativa ──────────────────────────────────────────────────────────
function SequenciaCard({ hotStreaks, coldStreaks }: { hotStreaks: StreakEntry[]; coldStreaks: StreakEntry[] }) {
  const hot = hotStreaks[0] ?? null;
  const cold = coldStreaks[0] ?? null;
  if (!hot && !cold) return null;

  return (
    <TendenciaCard
      icon={Flame}
      label="🔥 Sequências em Tempo Real"
      badge="Streaks"
      badgeColor="text-accent-gold"
      borderColor="border border-accent-gold/15"
      bgColor="bg-accent-gold/[0.01]"
    >
      <div className="flex flex-col gap-3">
        {hot && (
          <div className="flex items-center gap-3">
            <Flame className="size-3.5 text-status-good shrink-0" />
            <PlayerAvatar nickname={hot.player.nickname} avatarUrl={hot.player.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <Link href={`/players/${hot.player.id}`} className="text-xs font-black text-white hover:text-primary transition-colors block truncate">
                {hot.player.nickname}
              </Link>
              <p className="text-[10px] text-status-good font-bold">{trendNarratives.hotStreak.headline} · {hot.streak}x</p>
            </div>
            <span className="text-xs font-black text-status-good tabular-nums shrink-0">
              <AnimatedNumber value={hot.recentRating} decimals={2} />
            </span>
          </div>
        )}
        {hot && cold && <div className="border-t border-white/[0.04]" />}
        {cold && (
          <div className="flex items-center gap-3">
            <Snowflake className="size-3.5 text-status-critical shrink-0" />
            <PlayerAvatar nickname={cold.player.nickname} avatarUrl={cold.player.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <Link href={`/players/${cold.player.id}`} className="text-xs font-black text-white hover:text-primary transition-colors block truncate">
                {cold.player.nickname}
              </Link>
              <p className="text-[10px] text-status-critical font-bold">{trendNarratives.coldStreak.headline} · {cold.streak}x</p>
            </div>
            <span className="text-xs font-black text-status-critical tabular-nums shrink-0">
              {cold.adrChangePercent > 0 ? "+" : ""}{cold.adrChangePercent}%
            </span>
          </div>
        )}
      </div>
    </TendenciaCard>
  );
}

// ─── Mapa em Crescimento / Queda ──────────────────────────────────────────────
function MapaTendenciaCard({ mapWinrates }: { mapWinrates: MapPerformanceEntry[] }) {
  if (mapWinrates.length < 2) return null;
  const sorted = [...mapWinrates].sort((a, b) => b.winrate - a.winrate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <TendenciaCard
      icon={BarChart3}
      label="Mapa em Destaque"
      badge="📍 Mapas"
      badgeColor="text-accent-cyan"
      borderColor="border border-accent-cyan/15"
      bgColor="bg-accent-cyan/[0.01]"
    >
      <div className="flex flex-col gap-3">
        <div className="bg-status-good/[0.04] border border-status-good/10 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-widest font-bold text-status-good/70">{trendNarratives.mapBest.headline}</p>
            <p className="text-sm font-black text-white mt-0.5">{best.map}</p>
            <p className="text-[9px] text-muted-foreground/40 italic mt-0.5">{trendNarratives.mapBest.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-status-good tabular-nums">
              <AnimatedNumber value={best.winrate} decimals={0} suffix="%" />
            </p>
            <p className="text-[9px] text-muted-foreground/50 font-semibold">{best.matchesPlayed} partidas</p>
          </div>
        </div>
        <div className="bg-status-critical/[0.04] border border-status-critical/10 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-widest font-bold text-status-critical/70">{trendNarratives.mapWorst.headline}</p>
            <p className="text-sm font-black text-white mt-0.5">{worst.map}</p>
            <p className="text-[9px] text-muted-foreground/40 italic mt-0.5">{trendNarratives.mapWorst.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-status-critical tabular-nums">
              <AnimatedNumber value={worst.winrate} decimals={0} suffix="%" />
            </p>
            <p className="text-[9px] text-muted-foreground/50 font-semibold">{worst.matchesPlayed} partidas</p>
          </div>
        </div>
      </div>
    </TendenciaCard>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function TendenciasDaTemporada({
  topGainers,
  topDecliners,
  hotStreaks,
  coldStreaks,
  mapWinrates,
}: TendenciasDaTemporadaProps) {
  const hasContent = topGainers.length > 0 || topDecliners.length > 0 || hotStreaks.length > 0 || coldStreaks.length > 0;
  if (!hasContent) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <EvolucaoCards gainers={topGainers} />
      <QuedaCards decliners={topDecliners} />
      <SequenciaCard hotStreaks={hotStreaks} coldStreaks={coldStreaks} />
      <MapaTendenciaCard mapWinrates={mapWinrates} />
    </div>
  );
}
