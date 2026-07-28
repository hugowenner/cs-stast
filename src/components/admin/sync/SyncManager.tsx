"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Play, RotateCcw, UserCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "../players/PlayersSummaryCards";

interface ImportLog {
  id: string;
  source: string;
  status: string;
  startedAt: Date | string;
  finishedAt: Date | string | null;
  matchesImported: number;
  errorMessage: string | null;
}

interface SyncManagerProps {
  logs: ImportLog[];
}

export function SyncManager({ logs }: SyncManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");

  const triggerAction = (title: string) => {
    setModalTitle(title);
    setModalOpen(true);
  };

  // Calculate metrics from real logs
  const totalSyncs = logs.length;
  const successSyncs = logs.filter((l) => l.status === "SUCCESS").length;
  const failedSyncs = logs.filter((l) => l.status === "FAILED").length;
  const successRate = totalSyncs > 0 ? (successSyncs / totalSyncs) * 100 : 100;

  const getDuration = (start: Date | string, end: Date | string | null) => {
    if (!end) return "-";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff < 1000) return `${diff}ms`;
    const sec = Math.floor(diff / 1000);
    return `${sec}s`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Control actions toolbar */}
      <div className="flex flex-wrap gap-3 justify-end items-center">
        <Button
          onClick={() => triggerAction("🔄 Sincronizar Todo o Hub")}
          className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold px-4 flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Play className="size-3.5 fill-current" />
          <span>Sincronizar Agora</span>
        </Button>
        <Button
          onClick={() => triggerAction("👤 Sincronizar Jogador Específico")}
          className="h-9 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-xl text-xs font-semibold px-4 flex items-center gap-1.5 cursor-pointer"
        >
          <UserCheck className="size-3.5" />
          <span>Sincronizar Jogador</span>
        </Button>
      </div>

      {/* 2. Sync metrics cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card: Total Execuções */}
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Total de Execuções
          </span>
          <span className="text-2xl font-black text-foreground">{totalSyncs}</span>
        </div>

        {/* Card: Taxa de Sucesso */}
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Taxa de Sucesso
          </span>
          <span className="text-2xl font-black text-emerald-400">{successRate.toFixed(1)}%</span>
        </div>

        {/* Card: Falhas Registradas */}
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            Falhas Registradas
          </span>
          <span className="text-2xl font-black text-rose-400">{failedSyncs}</span>
        </div>
      </div>

      {/* 3. Real Sync Logs table */}
      <div className="w-full rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                <th className="px-6 py-3 w-32">Status</th>
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3">Data de Início</th>
                <th className="px-6 py-3">Duração</th>
                <th className="px-6 py-3">Partidas</th>
                <th className="px-6 py-3">Detalhes do Erro</th>
                <th className="px-6 py-3 text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02] text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic select-none">
                    Nenhum log de sincronização cadastrado no banco de dados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === "SUCCESS";
                  const isFailed = log.status === "FAILED";

                  return (
                    <tr key={log.id} className="border-b border-white/[0.01] hover:bg-white/[0.005] transition-colors">
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isSuccess 
                            ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" 
                            : isFailed 
                              ? "bg-rose-500/5 text-rose-400 border-rose-500/20" 
                              : "bg-amber-500/5 text-amber-400 border-amber-500/20"
                        }`}>
                          {isSuccess && <CheckCircle className="size-3 text-emerald-400" />}
                          {isFailed && <XCircle className="size-3 text-rose-400" />}
                          {!isSuccess && !isFailed && <AlertTriangle className="size-3 text-amber-400 animate-pulse" />}
                          <span>{log.status === "SUCCESS" ? "Sucesso" : log.status === "FAILED" ? "Falha" : "Executando"}</span>
                        </span>
                      </td>

                      <td className="px-6 py-3.5 font-medium text-foreground uppercase tracking-wider text-[10px]">
                        {log.source}
                      </td>

                      <td className="px-6 py-3.5 text-muted-foreground">
                        {new Date(log.startedAt).toLocaleString("pt-BR")}
                        <span className="text-[9px] text-muted-foreground/60 block mt-0.5">
                          {formatRelativeTime(log.startedAt)}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 font-mono text-muted-foreground">
                        {getDuration(log.startedAt, log.finishedAt)}
                      </td>

                      <td className="px-6 py-3.5 font-semibold text-foreground">
                        {log.matchesImported}
                      </td>

                      <td className="px-6 py-3.5 text-muted-foreground font-mono text-[10px] max-w-[200px] truncate" title={log.errorMessage || ""}>
                        {log.errorMessage || "-"}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => triggerAction(`🔄 Reprocessar Ingestão #${log.id.slice(0,8)}`)}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Reprocessar Sincronização"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Action Placeholder Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl text-center"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <div className="flex flex-col items-center justify-center py-6 gap-4">
                <div className="relative flex items-center justify-center size-12 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <RefreshCw className="size-6 animate-spin" />
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {modalTitle}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    Fase 3 Planejada
                  </p>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-[11px] text-muted-foreground leading-relaxed text-left">
                  🚧 Esta ação faz parte da **Fase 3 (Central de Sincronizações)** do Painel Administrativo. A interface já está preparada e a funcionalidade será integrada ao pipeline operacional na próxima etapa.
                </div>

                <Button
                  onClick={() => setModalOpen(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-xl text-xs font-semibold h-9 cursor-pointer"
                >
                  Entendi
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
