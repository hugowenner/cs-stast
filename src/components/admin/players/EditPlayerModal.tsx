"use client";

import { useState, useEffect } from "react";
import { X, Edit3, Loader2 } from "lucide-react";
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

interface EditPlayerModalProps {
  isOpen: boolean;
  player: PlayerData | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function EditPlayerModal({ isOpen, player, onClose, onSuccess }: EditPlayerModalProps) {
  const [nickname, setNickname] = useState("");
  const [gamersClubId, setGamersClubId] = useState("");
  const [active, setActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      setNickname(player.nickname || "");
      setGamersClubId(player.gamersClubId || "");
      setActive(player.active);
      setError(null);
    }
  }, [player, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;

    if (!nickname.trim()) {
      setError("O apelido personalizado é obrigatório.");
      return;
    }

    if (!gamersClubId.trim()) {
      setError("O ID da Gamers Club é obrigatório para monitoramento.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/players/${player.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          gamersClubId: gamersClubId.trim(),
          active,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess(data.message);
      } else {
        setError(data.message || "Erro ao atualizar jogador.");
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
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Edit3 className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Editar Jogador
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Edite as configurações de monitoramento de {player.nickname}.
                  </p>
                </div>
              </div>

              {/* Nickname Input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-nickname" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Apelido Personalizado
                </label>
                <input
                  id="edit-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-10 px-3.5 rounded-xl border border-white/5 bg-white/5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Gamers Club ID Input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-gc-id" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  ID Gamers Club
                </label>
                <input
                  id="edit-gc-id"
                  type="text"
                  value={gamersClubId}
                  onChange={(e) => setGamersClubId(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-10 px-3.5 rounded-xl border border-white/5 bg-white/5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Monitoring Status Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Status de Monitoramento
                </label>
                <select
                  value={active ? "true" : "false"}
                  onChange={(e) => setActive(e.target.value === "true")}
                  disabled={isLoading}
                  className="w-full h-10 px-3 rounded-xl border border-white/5 bg-white/5 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                >
                  <option value="true" className="bg-zinc-950 text-foreground">🟢 Ativo (Sincroniza automaticamente)</option>
                  <option value="false" className="bg-zinc-950 text-foreground">🟡 Pausado (Ignora nas sincronizações)</option>
                </select>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-[11px] text-destructive font-medium leading-relaxed">
                  {error}
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
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 h-9 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
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
