"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayersSummaryCards } from "./PlayersSummaryCards";
import { PlayersToolbar } from "./PlayersToolbar";
import { PlayersFilters } from "./PlayersFilters";
import { PlayersTable } from "./PlayersTable";
import { Pagination } from "./Pagination";
import { AddPlayerModal } from "./AddPlayerModal";
import { EditPlayerModal } from "./EditPlayerModal";
import { RemovePlayerModal } from "./RemovePlayerModal";
import { SyncPlayerModal } from "./SyncPlayerModal";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

interface SummaryData {
  totalPlayers: number;
  totalTracked: number;
  activeTracked: number;
  pausedTracked: number;
  totalMatches: number;
  latestSync: Date | string | null;
}

interface PlayersManagerProps {
  summary: SummaryData;
  players: PlayerData[];
  total: number;
  currentPage: number;
  pageSize: number;
}

interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}

export function PlayersManager({
  summary,
  players,
  total,
  currentPage,
  pageSize,
}: PlayersManagerProps) {
  const router = useRouter();

  // Modals state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  // Selected player for edit/remove/sync
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);

  // Toasts state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: "success" | "error", message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Callback mapping from row dropdown or toolbar click
  const handleActionClick = (action: string, player: PlayerData) => {
    setSelectedPlayer(player);
    if (action.includes("Editar")) {
      setEditOpen(true);
    } else if (action.includes("Pausar") || action.includes("Reativar") || action.includes("Ativar")) {
      // Direct toggle status for quick ease of use
      handleToggleActive(player);
    } else if (action.includes("Remover")) {
      setRemoveOpen(true);
    } else if (action.includes("Sincronizar")) {
      setSyncOpen(true);
    } else if (action.includes("Ver detalhes")) {
      showToast("success", `O perfil completo de '${player.nickname}' estará disponível na Fase 2C.`);
    }
  };

  const handleToggleActive = async (player: PlayerData) => {
    try {
      const newActive = !player.active;
      const response = await fetch(`/api/admin/players/${player.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: player.nickname,
          gamersClubId: player.gamersClubId || "",
          active: newActive,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showToast(
          "success",
          newActive 
            ? `Monitoramento de '${player.nickname}' reativado.` 
            : `Monitoramento de '${player.nickname}' pausado.`
        );
        router.refresh();
      } else {
        showToast("error", data.message || "Erro ao alterar status.");
      }
    } catch (e) {
      showToast("error", "Erro ao tentar alterar status.");
    }
  };

  return (
    <div className="flex flex-col gap-8 relative">
      {/* 1. Summary Cards */}
      <PlayersSummaryCards
        totalTracked={summary.totalTracked}
        activeTracked={summary.activeTracked}
        pausedTracked={summary.pausedTracked}
        totalMatches={summary.totalMatches}
        latestSync={summary.latestSync}
      />

      {/* 2. Controls Area (Toolbar & Filters) */}
      <div className="flex flex-col gap-4">
        <PlayersToolbar onAddClick={() => setAddOpen(true)} />
        <PlayersFilters />
      </div>

      {/* 3. Main Data Table */}
      <PlayersTable
        players={players}
        onActionClick={handleActionClick}
      />

      {/* 4. Pagination */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={total}
      />

      {/* Modals */}
      <AddPlayerModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={(msg) => {
          setAddOpen(false);
          showToast("success", msg);
          router.refresh();
        }}
      />

      <EditPlayerModal
        isOpen={editOpen}
        player={selectedPlayer}
        onClose={() => {
          setEditOpen(false);
          setSelectedPlayer(null);
        }}
        onSuccess={(msg) => {
          setEditOpen(false);
          setSelectedPlayer(null);
          showToast("success", msg);
          router.refresh();
        }}
      />

      <RemovePlayerModal
        isOpen={removeOpen}
        player={selectedPlayer}
        onClose={() => {
          setRemoveOpen(false);
          setSelectedPlayer(null);
        }}
        onSuccess={(msg) => {
          setRemoveOpen(false);
          setSelectedPlayer(null);
          showToast("success", msg);
          router.refresh();
        }}
      />

      <SyncPlayerModal
        isOpen={syncOpen}
        player={selectedPlayer}
        onClose={() => {
          setSyncOpen(false);
          setSelectedPlayer(null);
        }}
        onSuccess={(msg) => {
          setSyncOpen(false);
          setSelectedPlayer(null);
          showToast("success", msg);
          router.refresh();
        }}
      />

      {/* Toast Notifications Overlay */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl pointer-events-auto select-none ${
                toast.type === "success"
                  ? "bg-zinc-950/90 border-emerald-500/20 text-emerald-400"
                  : "bg-zinc-950/90 border-destructive/20 text-destructive"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
              ) : (
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
              )}
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {toast.type === "success" ? "Sucesso" : "Erro"}
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground cursor-pointer mt-0.5"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
