"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface PlayerData {
  id: string;
  nickname: string;
  steamNickname: string | null;
  avatarUrl: string | null;
  steamId: string;
  gamersClubId: string | null;
  levelGc: number | null;
  steamLastSync: Date | string | null;
  active: boolean;
  matchCount: number;
  latestMatchDate: Date | string | null;
  rating: number;
}

interface RemovePlayerModalProps {
  isOpen: boolean;
  player: PlayerData | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function RemovePlayerModal({ isOpen, player, onClose, onSuccess }: RemovePlayerModalProps) {
  const [mode, setMode] = useState<"untrack" | "full">("untrack");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode("untrack");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/players/${player.id}?mode=${mode}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess(data.message);
      } else {
        setError(data.message || "Erro ao remover jogador.");
      }
    } catch (err) {
      setError("Erro de rede. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && player && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl text-left"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Remover Jogador
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Escolha o método de remoção de {player.nickname}.
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Como deseja remover este jogador?
              </div>

              {/* Options selection */}
              <div className="flex flex-col gap-3">
                {/* Option 1: Untrack */}
                <label className={`flex flex-col gap-1 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  mode === "untrack" 
                    ? "border-primary/40 bg-primary/[0.02]" 
                    : "border-white/5 bg-white/[0.01] hover:border-white/10"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="remove-mode"
                      value="untrack"
                      checked={mode === "untrack"}
                      onChange={() => setMode("untrack")}
                      disabled={isLoading}
                      className="accent-primary"
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Remover apenas do monitoramento (Recomendado)
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-5 leading-relaxed">
                    Remove do painel do admin, mas preserva todo o histórico de partidas e as estatísticas históricas.
                  </p>
                </label>

                {/* Option 2: Full Delete */}
                <label className={`flex flex-col gap-1 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  mode === "full" 
                    ? "border-destructive/40 bg-destructive/[0.02]" 
                    : "border-white/5 bg-white/[0.01] hover:border-white/10"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="remove-mode"
                      value="full"
                      checked={mode === "full"}
                      onChange={() => setMode("full")}
                      disabled={isLoading}
                      className="accent-destructive"
                    />
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <span>Remover completamente os dados</span>
                      <AlertTriangle className="size-3 text-destructive shrink-0" />
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-5 leading-relaxed">
                    Exclui permanentemente todos os dados do banco. **Esta ação só é permitida se o jogador tiver 0 partidas cadastradas**, para evitar corromper o histórico do grupo.
                  </p>
                </label>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-[11px] text-destructive font-medium leading-relaxed flex gap-2">
                  <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-1">
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="bg-white/5 hover:bg-white/10 text-foreground border border-white/10 px-4 h-9 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`px-4 h-9 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    mode === "full" 
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <span>Confirmar Remoção</span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
