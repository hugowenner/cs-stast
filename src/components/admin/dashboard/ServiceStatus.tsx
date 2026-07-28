import { Database, Key, Settings, Sparkles, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceStatusProps {
  dbLatency: number;
  isSteamConfigured: boolean;
  isSteamKeyValid: boolean;
  isGcConfigured: boolean;
  gcGroupId: string | null;
  latestSyncDate: Date | string | null;
  isDeepseekConfigured: boolean;
  deepseekModel: string | null;
}

export function ServiceStatus({
  dbLatency,
  isSteamConfigured,
  isSteamKeyValid,
  isGcConfigured,
  gcGroupId,
  latestSyncDate,
  isDeepseekConfigured,
  deepseekModel,
}: ServiceStatusProps) {
  const formattedSyncDate = latestSyncDate
    ? new Date(latestSyncDate).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Nunca";

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg">
      <h2 className="text-sm font-semibold text-foreground mb-4">Saúde dos Serviços & Integrações</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Banco PostgreSQL */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-emerald-400" />
              <span className="text-xs font-semibold text-foreground">PostgreSQL</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle className="size-3" /> Ativo
            </span>
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Latência:</span>
              <span className="text-foreground font-semibold">{dbLatency}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Última Consulta:</span>
              <span className="text-foreground">Agora mesmo</span>
            </div>
          </div>
        </div>

        {/* 2. Steam API */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Key className="size-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Steam Web API</span>
            </div>
            {isSteamConfigured ? (
              <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                <CheckCircle className="size-3" /> Configurada
              </span>
            ) : (
              <span className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                <AlertTriangle className="size-3" /> Pendente
              </span>
            )}
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Status Chave:</span>
              <span className={cn("font-semibold", isSteamConfigured ? "text-foreground" : "text-destructive")}>
                {isSteamConfigured ? (isSteamKeyValid ? "Ativa e Válida" : "Formato Inválido") : "Não configurada"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Segurança:</span>
              <span className="text-foreground">Chave Protegida 🔒</span>
            </div>
          </div>
        </div>

        {/* 3. Gamers Club */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-sky-400" />
              <span className="text-xs font-semibold text-foreground">Gamers Club</span>
            </div>
            {isGcConfigured ? (
              <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1">
                <CheckCircle className="size-3" /> Integrado
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/60 font-semibold flex items-center gap-1">
                <AlertTriangle className="size-3" /> Parcial
              </span>
            )}
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Grupo ID:</span>
              <span className="text-foreground truncate max-w-[80px] font-mono">
                {gcGroupId || "Ausente"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Última Sync:</span>
              <span className="text-foreground">{formattedSyncDate}</span>
            </div>
          </div>
        </div>

        {/* 4. DeepSeek Coach IA */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-purple-400" />
              <span className="text-xs font-semibold text-foreground">DeepSeek Coach IA</span>
            </div>
            {isDeepseekConfigured ? (
              <span className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                <CheckCircle className="size-3" /> Disponível
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/60 font-semibold flex items-center gap-1">
                <AlertTriangle className="size-3" /> Desativado
              </span>
            )}
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Modelo Ativo:</span>
              <span className="text-foreground font-mono truncate max-w-[90px]">
                {deepseekModel || "Nenhum"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Status API:</span>
              <span className={cn("font-semibold", isDeepseekConfigured ? "text-foreground" : "text-muted-foreground/60")}>
                {isDeepseekConfigured ? "Chave Presente" : "Chave Ausente"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
