"use client";

import { TimelineChart, type TimelineChartPoint } from "@/components/charts/timeline-chart";

export function SessionPerformanceChart({ data }: { data: TimelineChartPoint[] }) {
  return (
    <TimelineChart
      data={data}
      metricName="Rating médio"
      color="var(--primary)"
      idPrefix="session-perf-rating"
    />
  );
}
