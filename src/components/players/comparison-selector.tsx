"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Swords, X } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
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

  // Encontrar jogadores selecionados inicialmente
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
    <div className="glass-panel p-5 border border-white/[0.06] bg-white/[0.01] rounded-2xl flex flex-col gap-6 max-w-3xl mx-auto relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 size-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      {/* Backdrop para fechar dropdowns */}
      {(isOpenA || isOpenB) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setIsOpenA(false);
            setIsOpenB(false);
          }}
        />
      )}

      {/* Grid de Seleção (Duelo) */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center relative z-20">
        
        {/* JOGADOR A */}
        <div className="md:col-span-5 flex flex-col gap-3 relative">
          <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest text-center md:text-left">
            Jogador Principal (A)
          </span>

          {/* Autocomplete Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/45" />
            <input
              type="text"
              placeholder="Pesquisar jogador A..."
              value={searchA}
              onFocus={() => {
                setIsOpenA(true);
                setIsOpenB(false);
              }}
              onChange={(e) => setSearchA(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white/[0.03] border border-white/[0.07] rounded-xl text-white focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all"
            />
            {selectedA && (
              <button
                onClick={() => {
                  setSelectedA(null);
                  setSearchA("");
                }}
                className="absolute right-2.5 top-2 size-5 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-status-critical/10 hover:text-status-critical hover:border-status-critical/20 transition-all text-muted-foreground"
              >
                <X className="size-3" />
              </button>
            )}

            {/* Dropdown de Resultados */}
            {isOpenA && filteredA.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-[#0a0a0c] border border-white/[0.08] rounded-xl shadow-xl z-30 p-1 scrollbar-none">
                {filteredA.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedA(p);
                      setSearchA(p.nickname);
                      setIsOpenA(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-white hover:bg-white/[0.04] hover:text-primary transition-colors"
                  >
                    <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                    <span className="font-bold flex-1">{p.nickname}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-medium">
                      Level {p.levelGc ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card Preview Jogador A */}
          {selectedA ? (
            <div className="glass-panel border border-primary/20 bg-primary/[0.01] rounded-2xl p-4 flex flex-col items-center text-center gap-2 select-none shadow-[0_0_15px_rgba(var(--primary-rgb),0.02)]">
              <PlayerAvatar nickname={selectedA.nickname} avatarUrl={selectedA.avatarUrl} size="sm" />
              <div className="min-w-0">
                <span className="text-sm font-black text-white block truncate">{selectedA.nickname}</span>
                <p className="text-[9px] text-muted-foreground/50 font-bold mt-0.5 flex items-center justify-center gap-0.5">
                  <span>🏅</span>
                  <span>Nível {selectedA.levelGc ?? "—"} GC</span>
                </p>
              </div>
              <div className="mt-1 bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                <span className="text-[10px] font-black text-primary tabular-nums">
                  {selectedA.rating.toFixed(2)} Rating
                </span>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/[0.06] bg-white/[0.005] rounded-2xl p-6 flex flex-col items-center justify-center text-center select-none min-h-[126px]">
              <span className="text-muted-foreground/30 text-[10px] uppercase tracking-wider font-bold">
                Selecione o Jogador A
              </span>
            </div>
          )}
        </div>

        {/* VS CENTRAL NODE */}
        <div className="md:col-span-1 flex items-center justify-center py-2 md:py-0">
          <div className="flex size-9 items-center justify-center rounded-full bg-white/[0.02] border border-white/[0.08] text-white/40 text-[10px] font-black select-none shadow-[0_0_12px_rgba(255,255,255,0.01)] group-hover:border-primary/20 transition-all">
            VS
          </div>
        </div>

        {/* JOGADOR B */}
        <div className="md:col-span-5 flex flex-col gap-3 relative">
          <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest text-center md:text-left">
            Jogador Comparado (B)
          </span>

          {/* Autocomplete Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/45" />
            <input
              type="text"
              placeholder="Pesquisar jogador B..."
              value={searchB}
              onFocus={() => {
                setIsOpenB(true);
                setIsOpenA(false);
              }}
              onChange={(e) => setSearchB(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white/[0.03] border border-white/[0.07] rounded-xl text-white focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all"
            />
            {selectedB && (
              <button
                onClick={() => {
                  setSelectedB(null);
                  setSearchB("");
                }}
                className="absolute right-2.5 top-2 size-5 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-status-critical/10 hover:text-status-critical hover:border-status-critical/20 transition-all text-muted-foreground"
              >
                <X className="size-3" />
              </button>
            )}

            {/* Dropdown de Resultados */}
            {isOpenB && filteredB.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-[#0a0a0c] border border-white/[0.08] rounded-xl shadow-xl z-30 p-1 scrollbar-none">
                {filteredB.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedB(p);
                      setSearchB(p.nickname);
                      setIsOpenB(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-white hover:bg-white/[0.04] hover:text-primary transition-colors"
                  >
                    <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                    <span className="font-bold flex-1">{p.nickname}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-medium">
                      Level {p.levelGc ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card Preview Jogador B */}
          {selectedB ? (
            <div className="glass-panel border border-accent-cyan/20 bg-accent-cyan/[0.01] rounded-2xl p-4 flex flex-col items-center text-center gap-2 select-none shadow-[0_0_15px_rgba(var(--accent-cyan-rgb),0.02)]">
              <PlayerAvatar nickname={selectedB.nickname} avatarUrl={selectedB.avatarUrl} size="sm" />
              <div className="min-w-0">
                <span className="text-sm font-black text-white block truncate">{selectedB.nickname}</span>
                <p className="text-[9px] text-muted-foreground/50 font-bold mt-0.5 flex items-center justify-center gap-0.5">
                  <span>🏅</span>
                  <span>Nível {selectedB.levelGc ?? "—"} GC</span>
                </p>
              </div>
              <div className="mt-1 bg-accent-cyan/10 border border-accent-cyan/20 px-2.5 py-0.5 rounded-full">
                <span className="text-[10px] font-black text-accent-cyan tabular-nums">
                  {selectedB.rating.toFixed(2)} Rating
                </span>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/[0.06] bg-white/[0.005] rounded-2xl p-6 flex flex-col items-center justify-center text-center select-none min-h-[126px]">
              <span className="text-muted-foreground/30 text-[10px] uppercase tracking-wider font-bold">
                Selecione o Jogador B
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Botão Iniciar Confronto */}
      <button
        onClick={handleCompare}
        disabled={!selectedA || !selectedB || selectedA.id === selectedB.id}
        className="w-full py-2.5 px-4 bg-primary text-black font-black rounded-xl text-xs hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(var(--primary-rgb),0.1)] active:scale-[0.99] cursor-pointer"
      >
        <Swords className="size-4 shrink-0" />
        Iniciar Scout
      </button>
    </div>
  );
}
