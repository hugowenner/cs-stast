import { DeltaIndicator } from "./delta-indicator";
import { cn } from "@/lib/utils";

export function TrendIndicator({
  value,
  isPositive,
  className = "",
}: {
  value: string | number;
  isPositive?: boolean;
  className?: string;
}) {
  const direction =
    isPositive !== undefined
      ? isPositive
        ? "up"
        : "down"
      : undefined;

  return (
    <DeltaIndicator
      value={value}
      direction={direction}
      className={className}
    />
  );
}

export { DeltaIndicator };

