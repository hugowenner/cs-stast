"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Scale, Shuffle, Search, Plus, Trash2, 
  Play, Check, Copy, AlertTriangle, Shield, Sword,
  Trophy, HelpCircle, RefreshCw, X, Award, MapPin, Target
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionContainer } from "@/components/dashboard/section-container";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  BalanceMetric, 
  PlayerData, 
  GameMode, 
  BalancedTeamResult,
  TeamBalanceMatchData 
} from "@/lib/team-balance/types";
import { getPlayerWeight } from "@/lib/team-balance/metrics";

interface TeamBalanceClientProps {
  initialPlayers: PlayerData[];
  activeSeasonName?: string;
  activeSeasonMatches?: number;
}

export function TeamBalanceClient({
  initialPlayers,
  activeSeasonName = "Temporada Atual",
  activeSeasonMatches = 0,
}: TeamBalanceClientProps) {
  // Estado de jogadores
  const [availablePlayers] = useState<PlayerData[]>(initialPlayers);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estado do convidado temporário
  const [guestName, setGuestName] = useState("");
  const [guestLevel, setGuestLevel] = useState(10); // Nível GC padrão do convidado
  const [showGuestForm, setShowGuestForm] = useState(false);

  // Configurações do sorteio
  const [metric, setMetric] = useState<BalanceMetric>("RATING");
  const [mode, setMode] = useState<GameMode>("BALANCED");
  const [customSeed, setCustomSeed] = useState("");
  const [useCustomSeed, setUseCustomSeed] = useState(false);

  // Resultados
  const [result, setResult] = useState<BalancedTeamResult | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Histórico
  const [history, setHistory] = useState<TeamBalanceMatchData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Busca o histórico inicial no client
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/team-balance/matches");
      const data = await res.json();
      if (data.matches) {
        // Mapeia o resultado do prisma para a tipagem local
        const mappedMatches = data.matches.map((m: any) => ({
          id: m.id,
          seed: m.seed,
          mode: m.mode as GameMode,
          metric: m.metric as BalanceMetric,
          difference: m.difference,
          winner: m.winner,
          createdAt: m.createdAt,
          players: m.players.map((p: any) => ({
            id: p.id,
            nickname: p.nickname,
            avatar: p.avatar,
            team: p.team as "CT" | "TR",
            weight: p.weight,
            guest: p.guest,
            trackedPlayerId: p.trackedPlayerId
          }))
        }));
        setHistory(mappedMatches);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Função para exibir alertas temporários
  const showAlert = useCallback((text: string, type: "success" | "error" | "info" = "success") => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 4000);
  }, []);

  // Filtragem da lista de jogadores disponíveis
  const filteredPlayers = useMemo(() => {
    return availablePlayers.filter((p) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return p.name.toLowerCase().includes(query) || (p.role && p.role.toLowerCase().includes(query));
    });
  }, [availablePlayers, searchQuery]);

  // Selecionar/deselecionar jogador
  const togglePlayer = useCallback((player: PlayerData) => {
    setSelectedPlayers((prev) => {
      const isSelected = prev.some((p) => p.id === player.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== player.id);
      } else {
        if (prev.length >= 10) {
          showAlert("Você já selecionou o limite de 10 jogadores.", "info");
          return prev;
        }
        return [...prev, player];
      }
    });
  }, [showAlert]);

  // Adicionar convidado manual
  const handleAddGuest = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlayers.length >= 10) {
      showAlert("Você já selecionou o limite de 10 jogadores.", "info");
      return;
    }
    const name = guestName.trim() || `Convidado ${selectedPlayers.length + 1}`;
    
    // Convidado padrão com níveis neutros
    const guestPlayer: PlayerData = {
      name,
      levelGc: guestLevel,
      rating: 1.00,
      adr: 75.0,
      kd: 1.00,
      winrate: 50.0,
      role: "Convidado",
      guest: true,
    };

    setSelectedPlayers((prev) => [...prev, guestPlayer]);
    setGuestName("");
    setShowGuestForm(false);
    showAlert(`Convidado '${name}' adicionado ao lobby.`);
  }, [guestName, guestLevel, selectedPlayers.length, showAlert]);

  // Remover jogador do Lobby
  const removeSelectedPlayer = useCallback((index: number) => {
    setSelectedPlayers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Limpar o lobby de jogadores
  const clearLobby = useCallback(() => {
    setSelectedPlayers([]);
    setResult(null);
    setCurrentMatchId(null);
    setWinner(null);
  }, []);

  // Copiar seed da partida
  const copySeed = useCallback((seed: string) => {
    navigator.clipboard.writeText(seed);
    setCopied(true);
    showAlert("Seed copiada para a área de transferência.");
    setTimeout(() => setCopied(false), 2000);
  }, [showAlert]);

  // Executar balanceamento chamando a API do backend
  const runShuffle = useCallback(async () => {
    if (selectedPlayers.length !== 10) {
      showAlert("Selecione exatamente 10 jogadores para sortear.", "error");
      return;
    }

    setLoading(true);
    setResult(null);
    setCurrentMatchId(null);
    setWinner(null);

    const seed = useCustomSeed && customSeed.trim() ? customSeed.trim() : undefined;

    try {
      const res = await fetch("/api/team-balance/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: selectedPlayers,
          mode,
          metric,
          seed,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.result);
        setCurrentMatchId(data.match.id);
        fetchHistory();
        showAlert("Times gerados e salvos com sucesso!", "success");
      } else {
        showAlert(data.error || "Erro ao balancear times.", "error");
      }
    } catch (error) {
      console.error("Erro no balanceamento:", error);
      showAlert("Erro na chamada do servidor.", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedPlayers, mode, metric, useCustomSeed, customSeed, fetchHistory, showAlert]);

  // Registrar resultado da partida
  const handleRegisterWinner = useCallback(async (outcome: "CT" | "TR" | "DRAW" | null) => {
    if (!currentMatchId) return;

    try {
      const res = await fetch(`/api/team-balance/matches/${currentMatchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner: outcome }),
      });

      const data = await res.json();
      if (data.success) {
        setWinner(outcome);
        fetchHistory();
        showAlert(`Resultado gravado: ${outcome === "DRAW" ? "Empate" : outcome === "CT" ? "Vitória do CT" : "Vitória do TR"}`);
      } else {
        showAlert(data.error || "Erro ao gravar resultado.", "error");
      }
    } catch (error) {
      console.error("Erro ao gravar vencedor:", error);
      showAlert("Erro na gravação do resultado.", "error");
    }
  }, [currentMatchId, fetchHistory, showAlert]);

  // Recarregar partida antiga do histórico
  const handleLoadHistoryMatch = useCallback(async (match: TeamBalanceMatchData) => {
    setLoading(true);
    try {
      // Reconstroi os jogadores originais a partir do log
      const playersList: PlayerData[] = match.players.map((p) => {
        // Procura se o jogador existe no pool ativo para trazer mais estatísticas atuais se necessário, 
        // caso contrário usa fallback estático guardado no banco
        const activePlayer = availablePlayers.find((ap) => ap.id === p.trackedPlayerId);
        
        return {
          id: p.trackedPlayerId || undefined,
          name: p.nickname,
          avatarUrl: p.avatar,
          levelGc: activePlayer?.levelGc ?? 10,
          rating: activePlayer?.rating ?? 1.00,
          adr: activePlayer?.adr ?? 75.0,
          kd: activePlayer?.kd ?? 1.00,
          winrate: activePlayer?.winrate ?? 50.0,
          role: activePlayer?.role || (p.guest ? "Convidado" : "Membro"),
          guest: p.guest,
        };
      });

      // Define estados para carregar na tela
      setSelectedPlayers(playersList);
      setMetric(match.metric);
      setMode(match.mode);
      setCustomSeed(match.seed);
      setUseCustomSeed(true);

      // Re-executa localmente via API de replay
      const res = await fetch("/api/team-balance/matches/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed: match.seed,
          mode: match.mode,
          metric: match.metric,
          players: playersList,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.result);
        setCurrentMatchId(match.id);
        setWinner(match.winner || null);
        showAlert(`Partida antiga (Seed: ${match.seed}) carregada no painel!`);
      } else {
        showAlert("Erro ao reprocessar partida antiga.", "error");
      }
    } catch (error) {
      console.error("Erro ao carregar do histórico:", error);
      showAlert("Erro de conexão ao carregar partida.", "error");
    } finally {
      setLoading(false);
    }
  }, [availablePlayers, showAlert]);


  // Métricas do Lobby atual
  const avgGcLevel = useMemo(() => {
    if (selectedPlayers.length === 0) return 0;
    const sum = selectedPlayers.reduce((acc, p) => acc + p.levelGc, 0);
    return Number((sum / selectedPlayers.length).toFixed(1));
  }, [selectedPlayers]);

  const avgRating = useMemo(() => {
    if (selectedPlayers.length === 0) return "0.00";
    const sum = selectedPlayers.reduce((acc, p) => acc + p.rating, 0);
    return (sum / selectedPlayers.length).toFixed(2);
  }, [selectedPlayers]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="🎯 Gerador de Times Inteligente" 
        subtitle="Monte lobbies determinísticos e balanceados utilizando estatísticas em tempo real da temporada."
        actions={
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-bold text-xs text-primary shadow-sm select-none">
            🏆 {activeSeasonName} · {activeSeasonMatches} {activeSeasonMatches === 1 ? "partida analisada" : "partidas analisadas"}
          </div>
        }
      />

      {/* Alerta Global */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-3 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-lg",
              alertMessage.type === "success" && "bg-status-good/10 border-status-good/30 text-green-400",
              alertMessage.type === "error" && "bg-status-critical/10 border-status-critical/30 text-red-400",
              alertMessage.type === "info" && "bg-accent-cyan/10 border-accent-cyan/30 text-cyan-400"
            )}
          >
            <span>{alertMessage.text}</span>
            <button onClick={() => setAlertMessage(null)} className="text-white/40 hover:text-white ml-2">
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA ESQUERDA: LOBBY & PRESETS (4 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <SectionContainer 
            title={`Lobby (${selectedPlayers.length}/10)`} 
            subtitle="Selecione 10 jogadores da lista ou adicione convidados."
          >
            <div className="glass-panel border border-white/10 rounded-2xl p-4 flex flex-col gap-4 bg-white/[0.01]">
              
              {/* Jogadores no Lobby */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {selectedPlayers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/40 text-xs flex flex-col items-center justify-center gap-2">
                    <Users className="size-8 stroke-[1.5]" />
                    <span>Lobby vazio. Adicione jogadores do roster à direita.</span>
                  </div>
                ) : (
                  selectedPlayers.map((player, idx) => (
                    <motion.div 
                      key={player.id || `guest-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar nickname={player.name} avatarUrl={player.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate leading-snug">{player.name}</p>
                          <p className="text-[9px] text-muted-foreground/60 leading-none">
                            {player.guest ? "👤 Convidado" : `⭐ Rating ${player.rating.toFixed(2)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white/70 font-mono">
                          Nível {player.levelGc}
                        </span>
                        <button 
                          onClick={() => removeSelectedPlayer(idx)}
                          className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Botão Convidado & Limpar */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowGuestForm(!showGuestForm)}
                  className="flex-1 border-white/10 text-xs font-semibold"
                >
                  <Plus className="size-3.5 mr-1" /> Convidado
                </Button>
                {selectedPlayers.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearLobby}
                    className="border-red-500/20 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-semibold"
                  >
                    Limpar Tudo
                  </Button>
                )}
              </div>

              {/* Formulário Convidado */}
              <AnimatePresence>
                {showGuestForm && (
                  <motion.form 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddGuest}
                    className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-2 overflow-hidden"
                  >
                    <div className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        placeholder="Nome do convidado..."
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 flex-1 focus:outline-none focus:border-accent-cyan/50"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-white/40 font-semibold">Nível:</span>
                        <select 
                          value={guestLevel} 
                          onChange={(e) => setGuestLevel(Number(e.target.value))}
                          className="bg-zinc-900 border border-white/10 rounded-lg text-xs py-1 px-1.5 focus:outline-none"
                        >
                          {Array.from({ length: 21 }, (_, i) => 21 - i).map((lvl) => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button type="submit" size="sm" className="w-full text-xs font-semibold bg-accent-cyan hover:bg-accent-cyan/80 text-white">
                      Adicionar Convidado
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Estatísticas Rápidas do Lobby */}
              {selectedPlayers.length > 0 && (
                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3 mt-1 text-center bg-white/[0.01]">
                  <div className="border-r border-white/5">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/50">Média Nível GC</p>
                    <p className="text-sm font-black text-white mt-0.5">{avgGcLevel}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/50">Média Rating</p>
                    <p className="text-sm font-black text-white mt-0.5">{avgRating}</p>
                  </div>
                </div>
              )}

            </div>
          </SectionContainer>

          <SectionContainer title="Métricas & Presets" subtitle="Escolha o fator de peso para equilibrar.">
            <div className="glass-panel border border-white/10 rounded-2xl p-4 flex flex-col gap-4 bg-white/[0.01]">
              
              {/* Presets Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: "RATING", label: "Rating", desc: "Performance hub", icon: Award },
                  { key: "LEVEL", label: "Nível GC", desc: "Patente externa", icon: Shield },
                  { key: "ADR", label: "ADR", desc: "Dano p/ rodada", icon: Sword },
                  { key: "KD", label: "K/D Ratio", desc: "Morte/Abate", icon: Target },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setMetric(item.key as BalanceMetric)}
                    className={cn(
                      "flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all card-hover",
                      metric === item.key
                        ? "bg-primary/10 border-primary text-white"
                        : "bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-0.5">
                      <item.icon className="size-3.5" />
                      {item.label}
                    </div>
                    <span className="text-[9px] opacity-60 leading-none">{item.desc}</span>
                  </button>
                ))}
                
                {/* Compound / Peso Composto Inteligente */}
                <button
                  onClick={() => setMetric("COMPOUND")}
                  className={cn(
                    "col-span-2 flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all card-hover",
                    metric === "COMPOUND"
                      ? "bg-accent-violet/15 border-accent-violet text-white glow-ring"
                      : "bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <Award className="size-3.5 text-accent-violet" />
                    🧠 Peso Composto (Balanceamento Inteligente)
                  </div>
                  <span className="text-[9px] opacity-60 leading-normal">
                    Fórmula baseada em Rating (45%), ADR (30%), K/D (15%) e Winrate (10%).
                  </span>
                </button>
              </div>

              {/* Modo de Geração & Seed */}
              <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-white/60">Modo de Sorteio</span>
                  <div className="flex bg-[#0b1220] border border-white/10 rounded-lg p-0.5">
                    <button
                      onClick={() => setMode("BALANCED")}
                      className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-bold transition-all",
                        mode === "BALANCED" ? "bg-primary text-white" : "text-muted-foreground"
                      )}
                    >
                      <Scale className="size-3 inline mr-1" /> Equilibrado
                    </button>
                    <button
                      onClick={() => setMode("RANDOM")}
                      className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-bold transition-all",
                        mode === "RANDOM" ? "bg-primary text-white" : "text-muted-foreground"
                      )}
                    >
                      <Shuffle className="size-3 inline mr-1" /> Aleatório
                    </button>
                  </div>
                </div>

                {/* Switch de Seed Manual */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-white/60">Forçar Seed Manual</span>
                    <input
                      type="checkbox"
                      checked={useCustomSeed}
                      onChange={(e) => setUseCustomSeed(e.target.checked)}
                      className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 cursor-pointer"
                    />
                  </div>
                  {useCustomSeed && (
                    <input
                      type="text"
                      placeholder="Seed numérica..."
                      value={customSeed}
                      onChange={(e) => setCustomSeed(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent-cyan/50 font-mono"
                    />
                  )}
                </div>
              </div>

              {/* Botão de Sortear */}
              <Button
                onClick={runShuffle}
                disabled={loading || selectedPlayers.length !== 10}
                className="w-full py-4.5 rounded-xl font-bold bg-primary hover:bg-primary/80 text-white flex items-center justify-center gap-2 mt-1 shrink-0 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Balanceando Lobbies...</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4" />
                    <span>Sortear Equipes (5v5)</span>
                  </>
                )}
              </Button>

            </div>
          </SectionContainer>
        </div>

        {/* COLUNA DIREITA: ROSTER DE JOGADORES OU RESULTADOS (8 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* PAINEL DE RESULTADOS (Se existirem) */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-6"
            >
              <SectionContainer title="Times Sorteados" subtitle="Divisão equilibrada das forças em campo.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Time CT */}
                  <div className="glass-panel border border-cyan-500/20 bg-cyan-950/[0.03] rounded-2xl overflow-hidden p-4.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-sm font-black text-cyan-400 flex items-center gap-1.5">
                        <Shield className="size-4" /> Contra-Terroristas
                      </span>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {result.ctSum.toFixed(2)} pts
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {result.ct.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar nickname={p.name} avatarUrl={p.avatarUrl} size="sm" />
                            <div className="min-w-0">
                              {p.guest ? (
                                <span className="text-xs font-bold text-white/90 leading-tight block">{p.name}</span>
                              ) : (
                                <Link 
                                  href={`/players/${p.id}`}
                                  className="text-xs font-bold text-white hover:text-primary leading-tight hover:underline block truncate"
                                >
                                  {p.name}
                                </Link>
                              )}
                              <span className="text-[9px] text-muted-foreground/60 leading-none">
                                {p.guest ? "👥 Convidado" : p.role || "Membro"}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {metric === "LEVEL" ? `GC ${p.levelGc}` : metric === "RATING" ? `★ ${p.rating.toFixed(2)}` : metric === "ADR" ? `${p.adr} ADR` : `KD ${p.kd}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time TR */}
                  <div className="glass-panel border border-red-500/20 bg-red-950/[0.03] rounded-2xl overflow-hidden p-4.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-sm font-black text-red-400 flex items-center gap-1.5">
                        <Sword className="size-4" /> Terroristas
                      </span>
                      <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        {result.trSum.toFixed(2)} pts
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {result.tr.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar nickname={p.name} avatarUrl={p.avatarUrl} size="sm" />
                            <div className="min-w-0">
                              {p.guest ? (
                                <span className="text-xs font-bold text-white/90 leading-tight block">{p.name}</span>
                              ) : (
                                <Link 
                                  href={`/players/${p.id}`}
                                  className="text-xs font-bold text-white hover:text-primary leading-tight hover:underline block truncate"
                                >
                                  {p.name}
                                </Link>
                              )}
                              <span className="text-[9px] text-muted-foreground/60 leading-none">
                                {p.guest ? "👥 Convidado" : p.role || "Membro"}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {metric === "LEVEL" ? `GC ${p.levelGc}` : metric === "RATING" ? `★ ${p.rating.toFixed(2)}` : metric === "ADR" ? `${p.adr} ADR` : `KD ${p.kd}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Indicador de Qualidade */}
                <div className="glass-panel border border-white/10 rounded-2xl p-4 mt-4 bg-white/[0.01] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/50">Diferença de Força</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {result.diff.toFixed(2)} ({result.diff === 0 ? "Perfeita" : result.diff <= 0.15 && metric === "RATING" ? "Excelente" : "Boa"})
                    </span>
                  </div>
                  
                  {/* Barra Gráfica de Equilíbrio */}
                  <div className="relative h-6 bg-[#0b1220] rounded-lg border border-white/10 overflow-hidden flex">
                    <div 
                      className="h-full bg-cyan-600 transition-all duration-500" 
                      style={{ width: `${(result.ctSum / result.total) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-red-600 transition-all duration-500" 
                      style={{ width: `${(result.trSum / result.total) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/90">
                      CT: {((result.ctSum / result.total) * 100).toFixed(1)}% vs TR: {((result.trSum / result.total) * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* Registrar Vencedor */}
                  <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                      Registrar Resultado do Lobby
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRegisterWinner("CT")}
                        className={cn(
                          "flex-1 text-xs font-bold border cursor-pointer",
                          winner === "CT"
                            ? "bg-cyan-500 border-cyan-400 text-white"
                            : "bg-white/[0.02] border-white/10 text-cyan-400 hover:bg-cyan-500/10"
                        )}
                      >
                        CT Venceu
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRegisterWinner("DRAW")}
                        className={cn(
                          "flex-1 text-xs font-bold border cursor-pointer",
                          winner === "DRAW"
                            ? "bg-zinc-600 border-zinc-500 text-white"
                            : "bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/10"
                        )}
                      >
                        Empate
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRegisterWinner("TR")}
                        className={cn(
                          "flex-1 text-xs font-bold border cursor-pointer",
                          winner === "TR"
                            ? "bg-red-500 border-red-400 text-white"
                            : "bg-white/[0.02] border-white/10 text-red-400 hover:bg-red-500/10"
                        )}
                      >
                        TR Venceu
                      </Button>
                    </div>
                  </div>

                </div>

              </SectionContainer>
            </motion.div>
          )}

          {/* POOL DE JOGADORES DISPONÍVEIS */}
          <SectionContainer 
            title={`Roster de Jogadores (${availablePlayers.length} cadastrados)`} 
            subtitle="Clique nos jogadores para selecioná-los para o Lobby ativo."
          >
            <div className="glass-panel border border-white/10 rounded-2xl p-4 flex flex-col gap-4 bg-white/[0.01]">
              
              {/* Barra de Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                <input 
                  type="text" 
                  placeholder="Buscar jogador por nickname ou função..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent-cyan/50"
                />
              </div>

              {/* Grid de Roster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredPlayers.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground/45 text-xs">
                    Nenhum jogador correspondente encontrado.
                  </div>
                ) : (
                  filteredPlayers.map((player) => {
                    const isSelected = selectedPlayers.some((p) => p.id === player.id);
                    
                    return (
                      <button
                        key={player.id}
                        onClick={() => togglePlayer(player)}
                        className={cn(
                          "glass-panel text-left p-3 rounded-xl border flex gap-2.5 items-center cursor-pointer transition-all card-hover",
                          isSelected
                            ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(110,68,255,0.06)]"
                            : "bg-white/[0.01] border-white/[0.06]"
                        )}
                      >
                        <PlayerAvatar nickname={player.name} avatarUrl={player.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate leading-snug">{player.name}</p>
                          <div className="flex gap-1.5 mt-0.5">
                            <span className="text-[8px] font-mono text-muted-foreground/70">GC {player.levelGc}</span>
                            <span className="text-[8px] font-mono text-white/50">★ {player.rating.toFixed(2)}</span>
                          </div>
                          {player.role && (
                            <span className="inline-block text-[7px] font-bold text-accent-cyan/80 bg-accent-cyan/5 border border-accent-cyan/15 rounded px-1.5 py-0.2 mt-1">
                              {player.role}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="size-4.5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="size-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

            </div>
          </SectionContainer>

          {/* HISTÓRICO DE AUDITORIA */}
          <SectionContainer title="Histórico de Auditoria" subtitle="Recupere seeds e resultados de balanceamentos anteriores.">
            <div className="glass-panel border border-white/10 rounded-2xl p-4 bg-white/[0.01]">
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {historyLoading && history.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Carregando histórico...
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground/40">
                    Nenhum balanceamento registrado no histórico ainda.
                  </div>
                ) : (
                  history.map((match) => (
                    <div 
                      key={match.id}
                      onClick={() => handleLoadHistoryMatch(match)}
                      className={cn(
                        "p-3 rounded-xl border bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] transition-colors cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-3",
                        currentMatchId === match.id && "border-primary bg-primary/5"
                      )}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">Seed: {match.seed}</span>
                          <span className="text-[9px] px-1 bg-white/5 rounded border border-white/10 text-white/50 font-mono uppercase">
                            {match.metric}
                          </span>
                          {match.winner && (
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.2 rounded border",
                              match.winner === "CT" && "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
                              match.winner === "TR" && "bg-red-500/10 border-red-500/20 text-red-400",
                              match.winner === "DRAW" && "bg-zinc-500/10 border-zinc-500/20 text-white/70"
                            )}>
                              {match.winner === "DRAW" ? "EMPATE" : `${match.winner} VENCEU`}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 leading-none">
                          Gerado em {new Date(match.createdAt).toLocaleString("pt-BR")} · Diff: {match.difference.toFixed(2)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {match.players.slice(0, 5).map((p, i) => (
                            <span key={i} className="text-[8px] text-cyan-400 font-medium truncate max-w-[70px]">
                              {p.nickname}
                            </span>
                          ))}
                          <span className="text-[8px] text-white/20">|</span>
                          {match.players.slice(5, 10).map((p, i) => (
                            <span key={i} className="text-[8px] text-red-400 font-medium truncate max-w-[70px]">
                              {p.nickname}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copySeed(match.seed);
                          }}
                          className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                          title="Copiar Seed"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          </SectionContainer>

        </div>

      </div>
    </div>
  );
}
