"use client";

import { useState } from "react";
import { Copy, Check, MoreVertical, Eye, Edit3, RefreshCw, Pause, Trash2 } from "lucide-react";
import { formatRelativeTime } from "./PlayersSummaryCards";
import { cn } from "@/lib/utils";

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

interface PlayersTableRowProps {
  player: PlayerData;
  onActionClick: (action: string, player: PlayerData) => void;
}

export function PlayersTableRow({ player, onActionClick }: PlayersTableRowProps) {
  const [copiedField, setCopiedField] = useState<"steam" | "gc" | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleCopy = (text: string, field: "steam" | "gc") => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Determine Health status
  let health: "good" | "warning" | "error" = "good";
  let healthLabel = "Saudável";
  
  const hasGc = !!player.gamersClubId;
  const hasSteam = !!player.steamId;
  const lastSyncDate = player.steamLastSync ? new Date(player.steamLastSync) : null;
  const isOldSync = lastSyncDate 
    ? (Date.now() - lastSyncDate.getTime()) > 7 * 24 * 60 * 60 * 1000 
    : true;

  if (!hasGc || !hasSteam || player.matchCount === 0 || !lastSyncDate) {
    health = "error";
    healthLabel = "Erro";
  } else if (isOldSync) {
    health = "warning";
    healthLabel = "Atenção";
  }

  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors group/row">
      {/* Column: Avatar */}
      <td className="px-6 py-4">
        <div className="size-8 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
          {player.avatarUrl ? (
            <img
              src={player.avatarUrl}
              alt={player.nickname}
              className="size-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {player.nickname.slice(0, 2)}
            </span>
          )}
        </div>
      </td>

      {/* Column: Nickname */}
      <td className="px-6 py-4">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground truncate">
              {player.nickname}
            </span>
            {player.levelGc !== null && (
              <span className="bg-primary/20 border border-primary/30 text-primary text-[8px] font-bold px-1 rounded-sm uppercase tracking-wider shrink-0">
                LVL {player.levelGc}
              </span>
            )}
          </div>
          {player.steamNickname && (
            <span className="text-[10px] text-muted-foreground truncate">
              Steam: {player.steamNickname}
            </span>
          )}
        </div>
      </td>

      {/* Column: Steam ID */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono select-all">
          <span className="truncate max-w-[100px]">{player.steamId}</span>
          <button
            onClick={() => handleCopy(player.steamId, "steam")}
            className="text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer rounded p-0.5"
            title="Copiar Steam ID"
          >
            {copiedField === "steam" ? (
              <span className="text-[9px] font-semibold text-status-good font-sans">Copiado!</span>
            ) : (
              <Copy className="size-3" />
            )}
          </button>
        </div>
      </td>

      {/* Column: Gamers Club ID */}
      <td className="px-6 py-4">
        {player.gamersClubId ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono select-all">
            <span className="truncate max-w-[80px]">{player.gamersClubId}</span>
            <button
              onClick={() => handleCopy(player.gamersClubId!, "gc")}
              className="text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer rounded p-0.5"
              title="Copiar Gamers Club ID"
            >
              {copiedField === "gc" ? (
                <span className="text-[9px] font-semibold text-status-good font-sans">Copiado!</span>
              ) : (
                <Copy className="size-3" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/40 italic">Ausente</span>
        )}
      </td>

      {/* Column: Rating */}
      <td className="px-6 py-4 text-xs font-semibold text-foreground">
        {player.rating.toFixed(2)}
      </td>

      {/* Column: Partidas */}
      <td className="px-6 py-4 text-xs font-medium text-foreground">
        {player.matchCount}
      </td>

      {/* Column: Última Partida */}
      <td className="px-6 py-4 text-xs text-muted-foreground">
        {formatRelativeTime(player.latestMatchDate)}
      </td>

      {/* Column: Última Sincronização */}
      <td className="px-6 py-4 text-xs text-muted-foreground">
        {formatRelativeTime(player.steamLastSync)}
      </td>

      {/* Column: Status */}
      <td className="px-6 py-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold",
            player.active
              ? "bg-status-good/10 text-status-good border border-status-good/20"
              : "bg-white/5 text-muted-foreground border border-white/10"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              player.active ? "bg-status-good" : "bg-muted-foreground"
            )}
          />
          {player.active ? "Ativo" : "Pausado"}
        </span>
      </td>

      {/* Column: Saúde */}
      <td className="px-6 py-4">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
            health === "good" && "bg-status-good/5 text-status-good border-status-good/20",
            health === "warning" && "bg-status-warning/5 text-status-warning border-status-warning/20",
            health === "error" && "bg-status-critical/5 text-status-critical border-status-critical/20"
          )}
        >
          {health === "good" && "🟢"}
          {health === "warning" && "🟡"}
          {health === "error" && "🔴"}
          <span>{healthLabel}</span>
        </span>
      </td>

      {/* Column: Ações */}
      <td className="px-6 py-4 text-right relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <MoreVertical className="size-4" />
        </button>

        {isMenuOpen && (
          <>
            {/* Backdrop target to close dropdown */}
            <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
            
            {/* Context menu */}
            <div className="absolute right-6 top-10 mt-1 w-36 rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-2xl z-40 text-left">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onActionClick("👁 Ver detalhes", player);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
              >
                <Eye className="size-3.5" />
                <span>Ver detalhes</span>
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onActionClick("✏ Editar Jogador", player);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
              >
                <Edit3 className="size-3.5" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onActionClick("🔄 Sincronizar Jogador", player);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Sincronizar</span>
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onActionClick(player.active ? "⏸ Pausar Monitoramento" : "▶ Ativar Monitoramento", player);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
              >
                <Pause className="size-3.5" />
                <span>{player.active ? "Pausar" : "Ativar"}</span>
              </button>
              
              <div className="h-px bg-white/5 my-1" />
              
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onActionClick("🗑 Remover Jogador", player);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-status-critical hover:bg-status-critical/10 transition-colors cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Remover</span>
              </button>
            </div>
          </>
        )}
      </td>
    </tr>
  );
}
