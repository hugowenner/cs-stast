"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, Play } from "lucide-react";

export interface SelectorPlayer {
  id: string;
  nickname: string;
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
  const [playerA, setPlayerA] = useState(initialPlayerA);
  const [playerB, setPlayerB] = useState(initialPlayerB);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");

  const filteredA = players.filter((p) =>
    p.nickname.toLowerCase().includes(searchA.toLowerCase())
  );
  const filteredB = players.filter((p) =>
    p.nickname.toLowerCase().includes(searchB.toLowerCase())
  );

  const handleCompare = () => {
    if (playerA && playerB && playerA !== playerB) {
      router.push(`/compare?playerA=${playerA}&playerB=${playerB}`);
    }
  };

  return (
    <div className="glass-panel p-6 border border-white/10 bg-white/[0.01] rounded-2xl flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Scout H2H · CS2 Stats Hub</h2>
          <p className="text-xs text-muted-foreground">Selecione dois jogadores para iniciar a análise comparativa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Jogador A Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Jogador Principal (A)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar jogador A..."
              value={searchA}
              onChange={(e) => setSearchA(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <select
            value={playerA}
            onChange={(e) => {
              setPlayerA(e.target.value);
              const selected = players.find(p => p.id === e.target.value);
              if (selected) setSearchA(selected.nickname);
            }}
            size={4}
            className="w-full p-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50"
          >
            <option value="" disabled className="bg-zinc-900 text-muted-foreground">
              -- Selecione --
            </option>
            {filteredA.map((p) => (
              <option
                key={p.id}
                value={p.id}
                disabled={p.id === playerB}
                className="bg-zinc-900 text-white p-1.5 disabled:text-muted-foreground/30"
              >
                {p.nickname}
              </option>
            ))}
          </select>
        </div>

        {/* Jogador B Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Jogador Comparado (B)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar jogador B..."
              value={searchB}
              onChange={(e) => setSearchB(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <select
            value={playerB}
            onChange={(e) => {
              setPlayerB(e.target.value);
              const selected = players.find(p => p.id === e.target.value);
              if (selected) setSearchB(selected.nickname);
            }}
            size={4}
            className="w-full p-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50"
          >
            <option value="" disabled className="bg-zinc-900 text-muted-foreground">
              -- Selecione --
            </option>
            {filteredB.map((p) => (
              <option
                key={p.id}
                value={p.id}
                disabled={p.id === playerA}
                className="bg-zinc-900 text-white p-1.5 disabled:text-muted-foreground/30"
              >
                {p.nickname}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={!playerA || !playerB || playerA === playerB}
        className="w-full mt-2 py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
      >
        <Play className="size-4 fill-current" /> Comparar Estatísticas
      </button>
    </div>
  );
}
