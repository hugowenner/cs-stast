import { Sparkles, CheckCircle, AlertTriangle, Info } from "lucide-react";
import type { PlayerComparisonDTO } from "@/server/dtos/playerComparison.dto";

export function ComparisonInsights({ insights }: { insights: PlayerComparisonDTO["insights"] }) {
  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-white/5 bg-white/[0.01] rounded-2xl">
        <Sparkles className="size-8 text-muted-foreground/30 mb-2" />
        <p className="text-muted-foreground text-sm">Nenhum insight disponível para esta comparação.</p>
      </div>
    );
  }

  const getBorderColor = (severity: string, type: string) => {
    if (type === "negative") return "border-l-status-critical";
    if (type === "positive") return "border-l-status-good";
    
    switch (severity) {
      case "high":
        return "border-l-accent-violet";
      case "medium":
        return "border-l-accent-cyan";
      default:
        return "border-l-white/10";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "positive":
        return <CheckCircle className="size-5 text-status-good shrink-0" />;
      case "negative":
        return <AlertTriangle className="size-5 text-status-critical shrink-0" />;
      default:
        return <Info className="size-5 text-accent-cyan shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {insights.map((insight, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-3.5 p-4 border border-white/5 bg-white/[0.01] rounded-xl border-l-4 ${getBorderColor(
            insight.severity,
            insight.type
          )}`}
        >
          {getIcon(insight.type)}
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white tracking-wide">{insight.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {insight.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
