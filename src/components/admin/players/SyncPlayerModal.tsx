"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
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

interface SyncPlayerModalProps {
  isOpen: boolean;
  player: PlayerData | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

type SyncStep = "preparing" | "fetching" | "updating" | "success" | "error";

export function SyncPlayerModal({ isOpen, player, onClose, onSuccess }: SyncPlayerModalProps) {
  const [step, setStep] = useState<SyncStep>("preparing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !player) return;

    let isMounted = true;
    setStep("preparing");
    setErrorMessage(null);

    const runSync = async () => {
      try {
        // Step 1: Preparing
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (!isMounted) return;

        // Step 2: Fetching Steam
        setStep("fetching");
        const responsePromise = fetch(`/api/admin/players/${player.id}/sync`, {
          method: "POST",
        });

        // Add a minimal delay for UX visibility
        const [response] = await Promise.all([
          responsePromise,
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ]);

        if (!isMounted) return;

        // Step 3: Updating DB
        setStep("updating");
        await new Promise((resolve) => setTimeout(resolve, 600));

        const data = await response.json();
        if (!isMounted) return;

        if (response.ok && data.success) {
          setStep("success");
          await new Promise((resolve) => setTimeout(resolve, 800));
          if (isMounted) {
            onSuccess("Dados do jogador sincronizados com sucesso.");
          }
        } else {
          setStep("error");
          setErrorMessage(data.message || "Falha na sincronização.");
        }
      } catch (err) {
        if (isMounted) {
          setStep("error");
          setErrorMessage("Erro de rede. Verifique sua conexão.");
        }
      }
    };

    runSync();

    return () => {
      isMounted = false;
    };
  }, [isOpen, player]);

  const getStepText = () => {
    switch (step) {
      case "preparing":
        return "Preparando sincronização...";
      case "fetching":
        return "Buscando dados da API da Steam...";
      case "updating":
        return "Atualizando banco de dados...";
      case "success":
        return "Finalizado com sucesso!";
      case "error":
        return "Erro na sincronização";
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl text-center"
          >
            {step === "error" && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}

            <div className="flex flex-col items-center justify-center py-6 gap-4">
              {/* Spinner/Icon state */}
              <div className="relative flex items-center justify-center size-16 rounded-full bg-white/[0.02] border border-white/5">
                {step !== "success" && step !== "error" && (
                  <Loader2 className="size-8 text-primary animate-spin" />
                )}
                {step === "success" && (
                  <CheckCircle className="size-8 text-emerald-500 achievement-pop" />
                )}
                {step === "error" && (
                  <AlertTriangle className="size-8 text-destructive animate-pulse" />
                )}
              </div>

              <div className="flex flex-col gap-1 mt-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Sincronizando Jogador
                </h3>
                <p className="text-xs text-muted-foreground">
                  {player.nickname} ({player.steamId})
                </p>
              </div>

              {/* Progress Steps UI */}
              <div className="w-full flex flex-col gap-2 bg-white/[0.01] border border-white/5 rounded-xl p-4 text-left mt-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 select-none">
                  <span>Progresso</span>
                  <span className="text-primary">{getStepText()}</span>
                </div>

                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${step === "error" ? "bg-destructive" : "bg-primary"}`}
                    initial={{ width: "5%" }}
                    animate={{
                      width:
                        step === "preparing"
                          ? "25%"
                          : step === "fetching"
                            ? "60%"
                            : step === "updating"
                              ? "85%"
                              : "100%",
                    }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {step === "error" && errorMessage && (
                <div className="w-full rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-[11px] text-destructive font-medium leading-relaxed text-left">
                  {errorMessage}
                </div>
              )}

              {step === "error" && (
                <Button
                  onClick={onClose}
                  className="w-full mt-2 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-xl text-xs font-semibold h-9 cursor-pointer"
                >
                  Fechar
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
