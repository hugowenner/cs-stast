import { MetricBadge } from "@/components/ui/metric-badge";

/** Rating 2.0 aproximado: >=1.15 bom, >=0.95 mediano, abaixo disso fraco. */
export function RatingBadge({ rating }: { rating: number }) {
  const tone = rating >= 1.15 ? "good" : rating >= 0.95 ? "neutral" : "critical";
  return <MetricBadge value={rating.toFixed(2)} tone={tone} />;
}
