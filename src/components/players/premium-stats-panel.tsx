import { cn } from "@/lib/utils";
import type { PremiumEntryDTO } from "@/server/services/analytics/premium/entry.analytics";
import type { PremiumTradeDTO } from "@/server/services/analytics/premium/trade.analytics";
import type {
  PremiumClutchSummaryDTO,
  PremiumClutchTierDTO,
} from "@/server/services/analytics/premium/clutch.analytics";
import type { PremiumKillDistanceDTO } from "@/server/services/analytics/premium/matchup.analytics";

interface Props {
  entry: PremiumEntryDTO | null;
  trade: PremiumTradeDTO | null;
  clutch: PremiumClutchSummaryDTO | null;
  distance: PremiumKillDistanceDTO | null;
}

function hasEntryData(e: PremiumEntryDTO) {
  return e.entryKills + e.entryDeaths > 0;
}
function hasTradeData(t: PremiumTradeDTO) {
  return t.tradeKills + t.tradedDeaths > 0;
}
function hasClutchData(c: PremiumClutchSummaryDTO) {
  return c.overall.some((t) => t.attempts > 0);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BlockHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="shrink-0 w-0.5 h-3.5 rounded-full bg-primary/60" />
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">{label}</p>
    </div>
  );
}

function EmptyBlock({ label, message }: { label: string; message: string }) {
  return (
    <div className="p-5 flex flex-col">
      <BlockHeader label={label} />
      <p className="text-[10px] text-muted-foreground/40 text-center py-6">{message}</p>
    </div>
  );
}

function WinRatePill({ rate }: { rate: number }) {
  const color =
    rate >= 60
      ? "text-status-good bg-status-good/10 border-status-good/20"
      : rate >= 45
        ? "text-status-warning bg-status-warning/10 border-status-warning/20"
        : "text-status-critical bg-status-critical/10 border-status-critical/20";
  return (
    <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded border tabular-nums", color)}>
      {rate}%
    </span>
  );
}

// ─── Opening Duels ───────────────────────────────────────────────────────────

function OpeningDuelsBlock({ entry }: { entry: PremiumEntryDTO }) {
  if (!hasEntryData(entry)) {
    return <EmptyBlock label="Opening Duels" message="Sem dados de duelo de abertura." />;
  }

  const total = entry.entryKills + entry.entryDeaths;

  return (
    <div className="p-5 flex flex-col gap-4">
      <BlockHeader label="Opening Duels" />

      {/* Big stat */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-3xl font-black text-white tabular-nums leading-none">
            {entry.successRate}
            <span className="text-lg text-white/50">%</span>
          </p>
          <p className="text-[9px] text-muted-foreground/55 font-bold uppercase tracking-wider mt-1">
            Win Rate
          </p>
        </div>
        <div className="mb-0.5 text-[10px] text-muted-foreground/50 leading-snug">
          <span className="text-status-good font-black">{entry.entryKills}</span>
          <span className="text-white/20 mx-1">/</span>
          <span className="text-status-critical font-black">{entry.entryDeaths}</span>
          <p className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-wide mt-0.5">
            {total} duelo{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* CT / T breakdown */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-muted-foreground/60 uppercase tracking-wide">CT</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/40 tabular-nums text-[9px]">
              {entry.ct.entryKills}K / {entry.ct.entryDeaths}D
            </span>
            <WinRatePill rate={entry.ct.successRate} />
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-muted-foreground/60 uppercase tracking-wide">T</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/40 tabular-nums text-[9px]">
              {entry.tr.entryKills}K / {entry.tr.entryDeaths}D
            </span>
            <WinRatePill rate={entry.tr.successRate} />
          </div>
        </div>
      </div>

      {/* First death impact */}
      {entry.firstDeathImpact.totalFirstDeaths > 0 && (
        <div className="border-t border-white/[0.05] pt-3">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-muted-foreground/45 mb-1.5">
            First Death Impact
          </p>
          <p className="text-[10px] text-muted-foreground/60 leading-snug">
            <span
              className={cn(
                "font-black tabular-nums",
                entry.firstDeathImpact.lossRateAfterDeath >= 70
                  ? "text-status-critical"
                  : entry.firstDeathImpact.lossRateAfterDeath >= 50
                    ? "text-status-warning"
                    : "text-status-good",
              )}
            >
              {entry.firstDeathImpact.lossRateAfterDeath}%
            </span>{" "}
            de perda quando morre primeiro
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Trades ──────────────────────────────────────────────────────────────────

function TradesBlock({ trade }: { trade: PremiumTradeDTO }) {
  if (!hasTradeData(trade)) {
    return <EmptyBlock label="Trades" message="Sem dados de trade." />;
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <BlockHeader label="Trades" />

      {/* Big stat */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-3xl font-black text-white tabular-nums leading-none">
            {trade.tradeEfficiency}
            <span className="text-lg text-white/50">%</span>
          </p>
          <p className="text-[9px] text-muted-foreground/55 font-bold uppercase tracking-wider mt-1">
            Efficiency
          </p>
        </div>
        <p className="mb-0.5 text-[9px] text-muted-foreground/40 leading-snug">
          das mortes foram vingadas
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-muted-foreground/60 uppercase tracking-wide">
            Trades Realizados
          </span>
          <span className="font-black text-status-good tabular-nums">{trade.tradeKills}</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-muted-foreground/60 uppercase tracking-wide">
            Vezes Tradado
          </span>
          <span className="font-black text-white tabular-nums">{trade.tradedDeaths}</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-muted-foreground/60 uppercase tracking-wide">
            Total de Mortes
          </span>
          <span className="font-black text-muted-foreground/50 tabular-nums">{trade.totalDeaths}</span>
        </div>
      </div>

      {/* Context bar */}
      <div className="border-t border-white/[0.05] pt-3 space-y-2.5">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-muted-foreground/45 mb-1.5">
            Trade Ratio
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-status-good"
                style={{ width: `${Math.min(trade.tradeEfficiency, 100)}%` }}
              />
            </div>
            <span className="text-[9px] font-black text-muted-foreground/50 tabular-nums w-8 text-right">
              {trade.tradeEfficiency}%
            </span>
          </div>
        </div>
        {trade.avgTradeTime !== null && (
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-muted-foreground/45">
              Avg Trade Time
            </p>
            <span className="text-[11px] font-black text-white tabular-nums">
              {trade.avgTradeTime.toFixed(1)}
              <span className="text-[9px] text-muted-foreground/50 font-bold ml-0.5">s</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Clutches ────────────────────────────────────────────────────────────────

function ClutchRow({ tier }: { tier: PremiumClutchTierDTO }) {
  const rateColor =
    tier.successRate >= 50
      ? "text-status-good"
      : tier.successRate >= 25
        ? "text-status-warning"
        : "text-muted-foreground/50";

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
      {/* Tier label */}
      <span className="w-8 text-[9px] font-black text-muted-foreground/60 uppercase tracking-wide shrink-0">
        {tier.tier}
      </span>

      {/* Progress bar */}
      <div className="flex-1 h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
        {tier.attempts > 0 ? (
          <div
            className={cn(
              "h-full rounded-full",
              tier.successRate >= 50
                ? "bg-status-good"
                : tier.successRate >= 25
                  ? "bg-status-warning"
                  : "bg-white/20",
            )}
            style={{ width: `${tier.successRate}%` }}
          />
        ) : null}
      </div>

      {/* Score */}
      <span className="text-[9px] tabular-nums text-muted-foreground/50 w-9 text-right shrink-0">
        {tier.wins}/{tier.attempts}
      </span>

      {/* Rate */}
      <span
        className={cn("text-[10px] font-black tabular-nums w-8 text-right shrink-0", rateColor)}
      >
        {tier.attempts > 0 ? `${tier.successRate}%` : "—"}
      </span>
    </div>
  );
}

function ClutchBlock({ clutch }: { clutch: PremiumClutchSummaryDTO }) {
  if (!hasClutchData(clutch)) {
    return <EmptyBlock label="Clutches" message="Sem dados de clutch." />;
  }

  const totalAttempts = clutch.overall.reduce((s, t) => s + t.attempts, 0);
  const totalWins = clutch.overall.reduce((s, t) => s + t.wins, 0);
  const overallRate = totalAttempts > 0 ? Math.round((totalWins / totalAttempts) * 100) : 0;

  return (
    <div className="p-5 flex flex-col gap-4">
      <BlockHeader label="Clutches" />

      {/* Big stat */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-3xl font-black text-white tabular-nums leading-none">
            {totalWins}
            <span className="text-lg text-white/50">/{totalAttempts}</span>
          </p>
          <p className="text-[9px] text-muted-foreground/55 font-bold uppercase tracking-wider mt-1">
            {overallRate}% win rate geral
          </p>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 pb-1 mb-0.5">
          <span className="w-8 text-[8px] font-black text-muted-foreground/35 uppercase tracking-wide shrink-0">
            Tier
          </span>
          <div className="flex-1" />
          <span className="text-[8px] font-black text-muted-foreground/35 uppercase tracking-wide w-9 text-right shrink-0">
            V/T
          </span>
          <span className="text-[8px] font-black text-muted-foreground/35 uppercase tracking-wide w-8 text-right shrink-0">
            WR
          </span>
        </div>
        {clutch.overall.map((tier) => (
          <ClutchRow key={tier.tier} tier={tier} />
        ))}
      </div>
    </div>
  );
}

// ─── Kill Distance ────────────────────────────────────────────────────────────

function KillDistanceBlock({ distance }: { distance: PremiumKillDistanceDTO }) {
  return (
    <div className="px-5 py-4 flex items-center gap-6 border-t border-white/[0.05]">
      <div className="flex items-center gap-2 shrink-0">
        <div className="shrink-0 w-0.5 h-3.5 rounded-full bg-primary/60" />
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/65">
          Kill Distance
        </p>
      </div>

      {distance.avgKillDistance !== null ? (
        <div className="flex items-center gap-6">
          <div>
            <span className="text-xl font-black text-white tabular-nums">
              {distance.avgKillDistance.toLocaleString()}
            </span>
            <span className="text-[9px] text-muted-foreground/45 font-bold ml-1.5">un.</span>
            <p className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-wide mt-0.5">
              média ponderada · {distance.sampleSize} kills
            </p>
          </div>
          <div className="text-[9px] text-muted-foreground/35 leading-snug max-w-[200px]">
            Unidades de mapa CS2 · 1 un ≈ 2,54 cm
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/40">Sem dados de distância.</p>
      )}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function PremiumStatsPanel({ entry, trade, clutch, distance }: Props) {
  const hasData =
    (entry && hasEntryData(entry)) ||
    (trade && hasTradeData(trade)) ||
    (clutch && hasClutchData(clutch)) ||
    (distance && distance.avgKillDistance !== null);

  if (!hasData) return null;

  const showDistance = distance !== null;

  return (
    <div className="card-important rounded-2xl overflow-hidden">
      {/* Panel header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-2.5 border-b border-white/[0.04]">
        <div className="shrink-0 size-1.5 rounded-full bg-primary animate-pulse" />
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
          Premium Analytics
        </p>
        <span className="text-[8px] font-black text-primary/70 bg-primary/10 border border-primary/15 px-1.5 py-0.5 rounded tracking-wider uppercase ml-1">
          Demo
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent ml-2" />
      </div>

      {/* Three blocks — Entry / Trade / Clutch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05]">
        {entry ? (
          <OpeningDuelsBlock entry={entry} />
        ) : (
          <EmptyBlock label="Opening Duels" message="Dado não disponível." />
        )}
        {trade ? (
          <TradesBlock trade={trade} />
        ) : (
          <EmptyBlock label="Trades" message="Dado não disponível." />
        )}
        {clutch ? (
          <ClutchBlock clutch={clutch} />
        ) : (
          <EmptyBlock label="Clutches" message="Dado não disponível." />
        )}
      </div>

      {/* Kill Distance strip */}
      {showDistance && <KillDistanceBlock distance={distance} />}
    </div>
  );
}
