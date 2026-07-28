import { MetricCard } from "../MetricCard";
import { Swords, Users, RefreshCw, Database } from "lucide-react";

interface AdminStatsCardsProps {
  totalMatches: number;
  activeTracked: number;
  successRate: number;
  totalImports: number;
  latestSync: Date | string | null;
  dbLatency: number;
  dbSize: string;
}

export function AdminStatsCards({
  totalMatches,
  activeTracked,
  successRate,
  totalImports,
  latestSync,
  dbLatency,
  dbSize,
}: AdminStatsCardsProps) {
  const formattedSyncDate = latestSync
    ? new Date(latestSync).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Nenhuma";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Partidas Registradas"
        value={totalMatches}
        description="Partidas computadas na base de dados do Hub."
        icon={Swords}
      />

      <MetricCard
        title="Jogadores Ativos"
        value={activeTracked}
        description="Jogadores com monitoramento ativado no painel."
        icon={Users}
      />

      <MetricCard
        title="Sincronizações"
        value={`${successRate.toFixed(1)}%`}
        description={`Taxa de sucesso de ${totalImports} syncs. Última: ${formattedSyncDate}`}
        icon={RefreshCw}
        trend={{
          value: successRate >= 95 ? "Excelente" : "Atenção",
          isPositive: successRate >= 95,
        }}
      />

      <MetricCard
        title="Banco de Dados"
        value={dbSize}
        description={`PostgreSQL no Neon. Latência: ${dbLatency}ms`}
        icon={Database}
      />
    </div>
  );
}
