import { MetricCard } from "@/components/admin/MetricCard";
import { Users, CheckCircle2, PauseCircle, Swords, Calendar } from "lucide-react";

interface PlayersSummaryCardsProps {
  totalTracked: number;
  activeTracked: number;
  pausedTracked: number;
  totalMatches: number;
  latestSync: Date | string | null;
}

export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "Nunca";
  const d = typeof date === "string" ? new Date(date) : date;
  
  // Return simple formatted string if date parsing failed
  if (isNaN(d.getTime())) return "Nunca";
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `há ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`;
  if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  if (diffDays < 30) return `há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
  
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PlayersSummaryCards({
  totalTracked,
  activeTracked,
  pausedTracked,
  totalMatches,
  latestSync,
}: PlayersSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        title="Jogadores Monitorados"
        value={totalTracked}
        description="Total de perfis cadastrados no monitoramento."
        icon={Users}
      />

      <MetricCard
        title="Jogadores Ativos"
        value={activeTracked}
        description="Jogadores com importação automática ativa."
        icon={CheckCircle2}
      />

      <MetricCard
        title="Jogadores Pausados"
        value={pausedTracked}
        description="Jogadores com monitoramento suspenso."
        icon={PauseCircle}
      />

      <MetricCard
        title="Partidas Monitoradas"
        value={totalMatches}
        description="Volume total de partidas importadas."
        icon={Swords}
      />

      <MetricCard
        title="Última Sincronização"
        value={formatRelativeTime(latestSync)}
        description="Tempo decorrido do último lote importado."
        icon={Calendar}
      />
    </div>
  );
}
