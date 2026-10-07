"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Swords, X } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SelectorPlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  levelGc: number | null;
  rating: number;
}

export function ComparisonSelector({
  players,
  initialPlayerA = "",
  initialPlayerB = "",
}: {
  players: SelectorPlayer[];
  initialPlayerA?: string;
  initialPlayerB?: string;
}) {
  const router = useRouter();

  const initA = players.find((p) => p.id === initialPlayerA) || null;
  const initB = players.find((p) => p.id === initialPlayerB) || null;

  const [selectedA, setSelectedA] = useState<SelectorPlayer | null>(initA);
  const [selectedB, setSelectedB] = useState<SelectorPlayer | null>(initB);

  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");

  const [isOpenA, setIsOpenA] = useState(false);
  const [isOpenB, setIsOpenB] = useState(false);

  const filteredA = players.filter(
    (p) =>
      p.nickname.toLowerCase().includes(searchA.toLowerCase()) &&
      p.id !== selectedB?.id
  );

  const filteredB = players.filter(
    (p) =>
      p.nickname.toLowerCase().includes(searchB.toLowerCase()) &&
      p.id !== selectedA?.id
  );

  const handleCompare = () => {
    if (selectedA && selectedB && selectedA.id !== selectedB.id) {
      router.push(`/compare?playerA=${selectedA.id}&playerB=${selectedB.id}`);
    }
  };

  return (
    <div className="bg-surface-panel border border-border/70 rounded-sm p-5 sm:p-6 flex flex-col gap-6 relative shadow-md">
      {/* Backdrop */}
      {(isOpenA || isOpenB) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setIsOpenA(false);
            setIsOpenB(false);
          }}
        />
      )}

      {/* Versus Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center relative z-20">
        
        {/* JOGADOR A */}
        <div className="md:col-span-5 flex flex-col gap-3 relative">
          <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.16em]">
            Jogador A
          </span>

          {/* Autocomplete Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Pesquisar jogador A..."
              value={searchA}
              onFocus={() => {
                setIsOpenA(true);
                setIsOpenB(false);
              }}
              onChange={(e) => setSearchA(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-mono bg-surface-deck border border-border/60 rounded-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-micro"
            />
            {selectedA && (
              <button
                onClick={() => {
                  setSelectedA(null);
                  setSearchA("");
                }}
                className="absolute right-2 top-2 size-5 flex items-center justify-center rounded-xs bg-surface-elevated text-muted-foreground hover:text-foreground transition-micro"
              >
                <X className="size-3" />
              </button>
            )}

            {/* Dropdown Results */}
            {isOpenA && filteredA.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface-elevated border border-border/80 rounded-xs shadow-xl z-30 p-1 no-scrollbar">
                {filteredA.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedA(p);
                      setSearchA(p.nickname);
                      setIsOpenA(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xs text-left text-xs font-mono text-foreground hover:bg-primary/15 hover:text-primary transition-micro"
                  >
                    <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                    <span className="font-bold flex-1 truncate">{p.nickname}</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      Lvl {p.levelGc ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card Preview Jogador A */}
          {selectedA ? (
            <div className="p-3.5 bg-surface-deck border border-primary/30 rounded-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerAvatar nickname={selectedA.nickname} avatarUrl={selectedA.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground block truncate">
                    {selectedA.nickname}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60 block">
                    GC Nível {selectedA.levelGc ?? "—"}
                  </span>
                </div>
              </div>
              <TacticalBadge label={`${selectedA.rating.toFixed(2)} RTG`} variant="primary" size="xs" />
            </div>
          ) : (
            <div className="p-3.5 bg-surface-deck/40 border border-dashed border-border/40 rounded-xs text-center text-[11px] font-mono text-muted-foreground/50">
              Nenhum jogador selecionado
            </div>
          )}
        </div>

        {/* VERSUS ICON (1 col) */}
        <div className="md:col-span-1 flex flex-col items-center justify-center my-2 md:my-0">
          <div className="flex size-9 items-center justify-center rounded-xs bg-surface-deck border border-border/60 text-primary font-mono font-black text-xs">
            VS
          </div>
        </div>

        {/* JOGADOR B */}
        <div className="md:col-span-5 flex flex-col gap-3 relative">
          <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-[0.16em]">
            Jogador B
          </span>

          {/* Autocomplete Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Pesquisar jogador B..."
              value={searchB}
              onFocus={() => {
                setIsOpenB(true);
                setIsOpenA(false);
              }}
              onChange={(e) => setSearchB(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-mono bg-surface-deck border border-border/60 rounded-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-400/60 transition-micro"
            />
            {selectedB && (
              <button
                onClick={() => {
                  setSelectedB(null);
                  setSearchB("");
                }}
                className="absolute right-2 top-2 size-5 flex items-center justify-center rounded-xs bg-surface-elevated text-muted-foreground hover:text-foreground transition-micro"
              >
                <X className="size-3" />
              </button>
            )}

            {/* Dropdown Results */}
            {isOpenB && filteredB.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface-elevated border border-border/80 rounded-xs shadow-xl z-30 p-1 no-scrollbar">
                {filteredB.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedB(p);
                      setSearchB(p.nickname);
                      setIsOpenB(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xs text-left text-xs font-mono text-foreground hover:bg-cyan-500/15 hover:text-cyan-400 transition-micro"
                  >
                    <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                    <span className="font-bold flex-1 truncate">{p.nickname}</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      Lvl {p.levelGc ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card Preview Jogador B */}
          {selectedB ? (
            <div className="p-3.5 bg-surface-deck border border-cyan-500/30 rounded-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <PlayerAvatar nickname={selectedB.nickname} avatarUrl={selectedB.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground block truncate">
                    {selectedB.nickname}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60 block">
                    GC Nível {selectedB.levelGc ?? "—"}
                  </span>
                </div>
              </div>
              <TacticalBadge label={`${selectedB.rating.toFixed(2)} RTG`} variant="info" size="xs" />
            </div>
          ) : (
            <div className="p-3.5 bg-surface-deck/40 border border-dashed border-border/40 rounded-xs text-center text-[11px] font-mono text-muted-foreground/50">
              Nenhum jogador selecionado
            </div>
          )}
        </div>

      </div>

      {/* Action Compare Button */}
      <div className="flex justify-center border-t border-border/30 pt-4">
        <Button
          onClick={handleCompare}
          disabled={!selectedA || !selectedB || selectedA.id === selectedB.id}
          size="lg"
          variant="tactical"
          className="gap-2 px-8"
        >
          <Swords className="size-4" />
          <span>Executar Scout H2H</span>
        </Button>
      </div>
    </div>
  );
}
