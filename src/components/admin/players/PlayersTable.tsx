"use client";

import { useRouter, usePathname } from "next/navigation";
import { PlayersTableRow } from "./PlayersTableRow";
import { Users, FilterX } from "lucide-react";
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

interface PlayersTableProps {
  players: PlayerData[];
  onActionClick: (action: string, player: PlayerData) => void;
}

export function PlayersTable({ players, onActionClick }: PlayersTableProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClearFilters = () => {
    router.push(pathname);
  };

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-white/5 bg-white/[0.01] rounded-2xl min-h-[350px] text-center select-none">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 mb-4 text-muted-foreground">
          <FilterX className="size-8" />
        </div>
        <h2 className="text-sm font-semibold text-foreground mb-1">
          Nenhum jogador correspondente
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
          Não encontramos nenhum jogador cadastrado que atenda aos filtros de busca selecionados no momento.
        </p>
        <Button
          onClick={handleClearFilters}
          className="h-9 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-xl text-xs font-semibold px-4 cursor-pointer"
        >
          Limpar Filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
              <th className="px-6 py-3 w-16">Avatar</th>
              <th className="px-6 py-3">Nick</th>
              <th className="px-6 py-3">Steam ID</th>
              <th className="px-6 py-3">Gamers Club ID</th>
              <th className="px-6 py-3">Rating</th>
              <th className="px-6 py-3">Partidas</th>
              <th className="px-6 py-3">Última Partida</th>
              <th className="px-6 py-3">Última Sinc.</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Saúde</th>
              <th className="px-6 py-3 text-right w-20">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {players.map((player) => (
              <PlayersTableRow
                key={player.id}
                player={player}
                onActionClick={onActionClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
