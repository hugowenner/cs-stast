"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, HelpCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function AddPlayerModal({ isOpen, onClose, onSuccess }: AddPlayerModalProps) {
  const [inputVal, setInputVal] = useState("");
  const [gcIdVal, setGcIdVal] = useState("");
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect input type on client side
  useEffect(() => {
    const val = inputVal.trim();
    if (!val) {
      setDetectedType(null);
      return;
    }

    if (val.includes("steamcommunity.com/profiles/")) {
      setDetectedType("URL de ID do Steam (profiles)");
    } else if (val.includes("steamcommunity.com/id/")) {
      setDetectedType("URL de Apelido do Steam (id)");
    } else if (val.includes("gamersclub.com.br/player/") || val.includes("gamersclub.gg/player/")) {
      setDetectedType("URL do perfil Gamers Club");
    } else if (/^\d{17}$/.test(val)) {
      setDetectedType("SteamID64 (17 dígitos)");
    } else if (/^\d{3,10}$/.test(val)) {
      setDetectedType("ID da Gamers Club");
    } else if (/^[a-zA-Z0-9_-]+$/.test(val)) {
      setDetectedType("Apelido do Steam (Vanity)");
    } else {
      setDetectedType("Desconhecido / Inválido");
    }
  }, [inputVal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) {
      setError("Por favor, digite um ID ou link do perfil.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: inputVal.trim(),
          gamersClubId: gcIdVal.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInputVal("");
        setGcIdVal("");
        onSuccess(data.message);
      } else {
        setError(data.message || "Erro ao adicionar jogador.");
      }
    } catch (err) {
      setError("Erro de rede. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset states on open/close
  useEffect(() => {
    if (!isOpen) {
      setInputVal("");
      setGcIdVal("");
      setError(null);
    }
  }, [isOpen]);

  const showGcInput = detectedType && (detectedType.includes("Steam") || detectedType.includes("Vanity"));

  return (
    <AnimatePresence>
      {isOpen && (
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
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Adicionar Novo Jogador
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    O sistema buscará nickname e avatar automaticamente.
                  </p>
                </div>
              </div>

              {/* Main Input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="main-input" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Entrada Principal
                </label>
                <input
                  id="main-input"
                  type="text"
                  placeholder="Cole ID Steam, GC ou URL de perfil..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-10 px-3.5 rounded-xl border border-white/5 bg-white/5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  autoFocus
                />
                
                {detectedType && (
                  <span className="text-[9px] text-primary/80 font-medium ml-1">
                    Detectado: <span className="font-semibold">{detectedType}</span>
                  </span>
                )}
              </div>

              {/* Optional GC ID Input if Steam was detected */}
              {showGcInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex flex-col gap-1.5 overflow-hidden"
                >
                  <label htmlFor="gc-input" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <span>ID da Gamers Club</span>
                    <span className="text-[8px] bg-primary/10 text-primary px-1 rounded border border-primary/20">Requerido</span>
                  </label>
                  <input
                    id="gc-input"
                    type="text"
                    placeholder="Ex: 757573 ou link do perfil"
                    value={gcIdVal}
                    onChange={(e) => setGcIdVal(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-10 px-3.5 rounded-xl border border-white/5 bg-white/5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  <p className="text-[9px] text-muted-foreground/60 leading-relaxed ml-1">
                    Para monitorar partidas na Gamers Club, precisamos do vínculo com o ID GC.
                  </p>
                </motion.div>
              )}

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
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Confirmar</span>
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
