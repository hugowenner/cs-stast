import { MetricBadge } from "@/components/ui/metric-badge";
import { getMatchType } from "@/server/domain/matchClassification";

/**
 * Identificação visual de SOLO x COMUNIDADE — puramente informativa, nunca filtra
 * nada. A regra em si mora só em domain/matchClassification.ts.
 */
export function MatchTypeBadge({ trackedPlayersCount }: { trackedPlayersCount: number }) {
  const type = getMatchType(trackedPlayersCount);
  return type === "COMMUNITY" ? (
    <MetricBadge value="Comunidade" tone="info" />
  ) : (
    <MetricBadge value="Solo" tone="neutral" />
  );
}
