"use client";

import { useState } from "react";
import { Copy, Check, MoreVertical, Eye, Edit3, RefreshCw, Pause, Trash2 } from "lucide-react";
import { formatRelativeTime } from "./PlayersSummaryCards";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

  // Consolidated Status logic
  let statusColor = "bg-status-good";
  let statusText = "Monitorando";
  let statusBadgeClass = "bg-status-good/10 text-status-good border-status-good/20";

  const hasGc = !!player.gamersClubId;
  const hasSteam = !!player.steamId;
  const lastSyncDate = player.steamLastSync ? new Date(player.steamLastSync) : null;

  if (!player.active) {
    statusColor = "bg-muted-foreground";
    statusText = "Pausado";
    statusBadgeClass = "bg-white/5 text-muted-foreground border-white/10";
  } else if (!hasGc || !hasSteam || player.matchCount === 0 || !lastSyncDate) {
    statusColor = "bg-status-critical";
    statusText = "Falha";
    statusBadgeClass = "bg-status-critical/10 text-status-critical border-status-critical/20";
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

      {/* Column: Jogador */}
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

      {/* Column: Partidas */}
      <td className="px-6 py-4 text-xs font-medium text-foreground">
        {player.matchCount}
      </td>

      {/* Column: Última Partida */}
      <td className="px-6 py-4 text-xs text-muted-foreground">
        {formatRelativeTime(player.latestMatchDate)}
      </td>

      {/* Column: Status */}
      <td className="px-6 py-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
            statusBadgeClass
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              statusColor
            )}
          />
          {statusText}
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
              <Link
                href={`/admin/players/${player.id}`}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
              >
                <Eye className="size-3.5" />
                <span>Ver jogador</span>
              </Link>
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
