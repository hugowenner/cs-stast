import { MetricCard } from "@/components/admin/MetricCard";
import { Swords, Users, RefreshCw, Database, FileText, Activity } from "lucide-react";

export const metadata = {
  title: "Painel Admin — CS2 Stats Hub",
  description: "Visão geral administrativa do sistema.",
};

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header section */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">
          Visão Geral do Hub
        </h1>
        <p className="text-xs text-muted-foreground">
          Estatísticas básicas de infraestrutura e integridade do projeto.
        </p>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Partidas Registradas"
          value="342"
          description="Partidas computadas na temporada atual."
          icon={Swords}
          trend={{ value: "+12 na semana", isPositive: true }}
        />

        <MetricCard
          title="Jogadores Ativos"
          value="18"
          description="Jogadores monitorados com estatísticas."
          icon={Users}
          trend={{ value: "Estável", isPositive: true }}
        />

        <MetricCard
          title="Sincronizações"
          value="98.7%"
          description="Taxa de sucesso nas sincronizações automáticas."
          icon={RefreshCw}
          trend={{ value: "+0.5%", isPositive: true }}
        />

        <MetricCard
          title="Banco de Dados"
          value="14.2 MB"
          description="Tamanho ocupado pelas tabelas relacionais."
          icon={Database}
          trend={{ value: "Normal", isPositive: true }}
        />

        <MetricCard
          title="Erros de Logs"
          value="2"
          description="Ocorrências registradas nas últimas 24 horas."
          icon={FileText}
          trend={{ value: "-4 erros", isPositive: true }}
        />

        <MetricCard
          title="Status do Sistema"
          value="99.98%"
          description="Uptime global do Hub e APIs integradas."
          icon={Activity}
          trend={{ value: "Excelente", isPositive: true }}
        />
      </div>

      {/* Placeholder Charts and Tables section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-white/[0.01] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Sincronizações Recentes</h2>
            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">Últimos 7 dias</span>
          </div>
          <div className="h-48 flex items-center justify-center border border-dashed border-white/10 rounded-lg text-xs text-muted-foreground bg-white/[0.005]">
            Área reservada para o gráfico de volume de sincronização.
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Atividade do Servidor</h2>
          <div className="space-y-4">
            {[
              { label: "Uso de CPU", val: "12%" },
              { label: "Uso de Memória", val: "48%" },
              { label: "Latência DB (Neon)", val: "45ms" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="text-foreground">{stat.val}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: stat.val.includes("ms") ? "15%" : stat.val }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
