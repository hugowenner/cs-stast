"use client";

import { useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { TimelineChart, type TimelineChartPoint } from "@/components/charts/timeline-chart";

export interface ProfileChartsProps {
  eloTimeline: TimelineChartPoint[];
  ratingTimeline: TimelineChartPoint[];
}

export function ProfileChartsSection({ eloTimeline, ratingTimeline }: ProfileChartsProps) {
  const [activeTab, setActiveTab] = useState<"elo" | "rating">("elo");

  const currentData = activeTab === "elo" ? eloTimeline : ratingTimeline;
  const currentMetric = activeTab === "elo" ? "ELO" : "Rating";
  const currentColor = activeTab === "elo" ? "var(--series-1)" : "var(--series-2)";

  return (
    <SectionCard
      title="Evolução de Desempenho"
      action={
        <div className="flex gap-2 rounded-lg bg-white/5 p-1">
          <button
            onClick={() => setActiveTab("elo")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === "elo"
                ? "bg-primary/20 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            ELO
          </button>
          <button
            onClick={() => setActiveTab("rating")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === "rating"
                ? "bg-primary/20 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            Rating
          </button>
        </div>
      }
    >
      <div className="mt-2">
        <TimelineChart
          data={currentData}
          metricName={currentMetric}
          color={currentColor}
          idPrefix={activeTab}
        />
      </div>
    </SectionCard>
  );
}
