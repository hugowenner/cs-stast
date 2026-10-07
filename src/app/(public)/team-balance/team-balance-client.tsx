"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Scale,
  Shuffle,
  Search,
  Plus,
  Trash2,
  Play,
  Check,
  Copy,
  Shield,
  Sword,
  Trophy,
  RefreshCw,
  X,
  Award,
  Target,
  Swords,
  Sliders,
  RotateCcw,
  Zap,
} from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BalanceMetric,
  PlayerData,
  GameMode,
  BalancedTeamResult,
  TeamBalanceMatchData,
} from "@/lib/team-balance/types";

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
  const [guestLevel, setGuestLevel] = useState(10);
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
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Busca o histórico inicial no client
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/team-balance/matches");
      const data = await res.json();
      if (data.matches) {
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
            playerId: p.playerId || p.trackedPlayerId || null,
            trackedPlayerId: p.playerId || p.trackedPlayerId || null,
          })),
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

  const showAlert = useCallback(
    (text: string, type: "success" | "error" | "info" = "success") => {
      setAlertMessage({ text, type });
      setTimeout(() => setAlertMessage(null), 4000);
    },
    []
  );

  // Filtragem da lista de jogadores disponíveis
  const filteredPlayers = useMemo(() => {
    return availablePlayers.filter((p) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        (p.role && p.role.toLowerCase().includes(query))
      );
    });
  }, [availablePlayers, searchQuery]);

  // Selecionar/deselecionar jogador
  const togglePlayer = useCallback(
    (player: PlayerData) => {
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
    },
    [showAlert]
  );

  // Adicionar convidado manual
  const handleAddGuest = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedPlayers.length >= 10) {
        showAlert("Você já selecionou o limite de 10 jogadores.", "info");
        return;
      }
      const name = guestName.trim() || `Convidado ${selectedPlayers.length + 1}`;

      const guestPlayer: PlayerData = {
        name,
        levelGc: guestLevel,
        rating: 1.0,
        adr: 75.0,
        kd: 1.0,
        winrate: 50.0,
        role: "Convidado",
        guest: true,
      };

      setSelectedPlayers((prev) => [...prev, guestPlayer]);
      setGuestName("");
      setShowGuestForm(false);
      showAlert(`Convidado '${name}' adicionado ao lobby.`);
    },
    [guestName, guestLevel, selectedPlayers.length, showAlert]
  );

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
  const copySeed = useCallback(
    (seed: string) => {
      navigator.clipboard.writeText(seed);
      setCopied(true);
      showAlert("Seed copiada para a área de transferência.");
      setTimeout(() => setCopied(false), 2000);
    },
    [showAlert]
  );

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
  const handleRegisterWinner = useCallback(
    async (outcome: "CT" | "TR" | "DRAW" | null) => {
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
          showAlert(
            `Resultado gravado: ${
              outcome === "DRAW"
                ? "Empate"
                : outcome === "CT"
                ? "Vitória dos Contra-Terroristas"
                : "Vitória dos Terroristas"
            }`
          );
        } else {
          showAlert(data.error || "Erro ao gravar resultado.", "error");
        }
      } catch (error) {
        console.error("Erro ao gravar vencedor:", error);
        showAlert("Erro na gravação do resultado.", "error");
      }
    },
    [currentMatchId, fetchHistory, showAlert]
  );

  // Recarregar partida antiga do histórico
  const handleLoadHistoryMatch = useCallback(
    async (match: TeamBalanceMatchData) => {
      setLoading(true);
      try {
        const playersList: PlayerData[] = match.players.map((p) => {
          const activePlayer = availablePlayers.find(
            (ap) =>
              (p.playerId && ap.id === p.playerId) ||
              (p.trackedPlayerId && ap.id === p.trackedPlayerId) ||
              ap.name.toLowerCase() === p.nickname.toLowerCase()
          );

          return {
            id: activePlayer?.id || p.playerId || p.trackedPlayerId || undefined,
            name: activePlayer?.name || p.nickname,
            avatarUrl: activePlayer?.avatarUrl || p.avatar,
            levelGc: activePlayer?.levelGc ?? (p.guest ? 10 : 1),
            rating: activePlayer?.rating ?? 1.0,
            adr: activePlayer?.adr ?? 75.0,
            kd: activePlayer?.kd ?? 1.0,
            winrate: activePlayer?.winrate ?? 50.0,
            role: activePlayer?.role || (p.guest ? "Convidado" : "Membro"),
            guest: p.guest ?? !activePlayer,
          };
        });

        setSelectedPlayers(playersList);
        setMetric(match.metric);
        setMode(match.mode);
        setCustomSeed(match.seed);
        setUseCustomSeed(true);

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
          showAlert(`Partida histórica (Seed: ${match.seed}) carregada no painel!`);
        } else {
          showAlert("Erro ao reprocessar partida antiga.", "error");
        }
      } catch (error) {
        console.error("Erro ao carregar do histórico:", error);
        showAlert("Erro de conexão ao carregar partida.", "error");
      } finally {
        setLoading(false);
      }
    },
    [availablePlayers, showAlert]
  );

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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 sm:px-6">
      {/* ── HEADER EDITORIAL ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-primary uppercase">
              01 / TEAM ASSEMBLY
            </span>
            <TacticalBadge variant="tactical" size="sm">
              SISTEMA DE BALANCEAMENTO
            </TacticalBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-2.5">
            <Swords className="size-6 text-primary shrink-0" />
            MONTAGEM & SORTEIO DE TIMES
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground/80 max-w-2xl">
            Divisão equilibrada de forças para confrontos internos baseada no histórico estatístico consolidado da temporada.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface-panel border border-border/40 shrink-0">
          <Trophy className="size-3.5 text-accent-gold" />
          <span className="text-[11px] font-mono text-muted-foreground/80">
            {activeSeasonName} · <strong className="text-foreground font-bold">{activeSeasonMatches} {activeSeasonMatches === 1 ? "partida" : "partidas"}</strong>
          </span>
        </div>
      </div>

      {/* Alerta Global de Notificação */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "p-3 rounded-xs border text-xs font-mono font-bold flex items-center justify-between shadow-sm",
              alertMessage.type === "success" &&
                "bg-status-good/10 border-status-good/30 text-status-good",
              alertMessage.type === "error" &&
                "bg-status-critical/10 border-status-critical/30 text-status-critical",
              alertMessage.type === "info" &&
                "bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan"
            )}
          >
            <span>{alertMessage.text}</span>
            <button
              onClick={() => setAlertMessage(null)}
              className="text-muted-foreground hover:text-foreground ml-2"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SEÇÃO DE TIMES SORTEADOS (TACTICAL VERSUS ARENA) ───────────────── */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col gap-4"
        >
          <div className="surface-panel rounded-sm border border-primary/40 p-5 flex flex-col gap-4 bg-surface-elevated/10">
            {/* Versus Arena Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                  CONFRONTO EQUILIBRADO (5v5)
                </span>
                <TacticalBadge
                  variant={
                    result.diff === 0 || (result.diff <= 0.15 && metric === "RATING")
                      ? "good"
                      : "warning"
                  }
                  size="xs"
                >
                  {result.diff === 0
                    ? "PARIDADE PERFEITA"
                    : result.diff <= 0.15 && metric === "RATING"
                    ? "EQUILÍBRIO EXCELENTE"
                    : "EQUILIBRADO"}
                </TacticalBadge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground/70">
                  Diferença: <strong className="text-foreground font-black tabular-nums">{result.diff.toFixed(2)} pts</strong>
                </span>
                {currentMatchId && (
                  <span className="text-[10px] font-mono text-muted-foreground/50 border border-border/60 px-2 py-0.5 rounded-xs">
                    ID: {currentMatchId.slice(0, 8)}
                  </span>
                )}
              </div>
            </div>

            {/* Barra Gráfica Proporcional de Força */}
            <div className="flex flex-col gap-1.5">
              <div className="relative h-5 bg-surface-deck rounded-xs border border-border/60 overflow-hidden flex">
                <div
                  className="h-full bg-accent-cyan/80 transition-all duration-300"
                  style={{ width: `${(result.ctSum / result.total) * 100}%` }}
                />
                <div
                  className="h-full bg-status-critical/80 transition-all duration-300"
                  style={{ width: `${(result.trSum / result.total) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono font-black text-white drop-shadow-sm select-none">
                  <span>CT: {((result.ctSum / result.total) * 100).toFixed(1)}%</span>
                  <span>TR: {((result.trSum / result.total) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Grid dos Times: TIME CT vs TIME TR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Squad CT */}
              <div className="surface-deck rounded-sm border border-accent-cyan/30 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-xs font-mono font-black text-accent-cyan flex items-center gap-1.5 uppercase tracking-wide">
                    <Shield className="size-4" /> Contra-Terroristas (CT)
                  </span>
                  <span className="text-xs font-mono font-black text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded-xs border border-accent-cyan/20 tabular-nums">
                    {result.ctSum.toFixed(2)} pts
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {result.ct.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xs bg-surface-panel border border-border/30 hover:border-border/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar nickname={p.name} avatarUrl={p.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          {p.guest ? (
                            <span className="text-xs font-bold text-foreground truncate block leading-tight">
                              {p.name}
                            </span>
                          ) : (
                            <Link
                              href={`/players/${p.id}`}
                              className="text-xs font-bold text-foreground hover:text-primary truncate block leading-tight transition-colors"
                            >
                              {p.name}
                            </Link>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60 leading-none mt-0.5">
                            <span>{p.guest ? "Convidado" : p.role || "Operador"}</span>
                            <span>·</span>
                            <span>GC {p.levelGc}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 font-mono">
                        <span className="text-xs font-black text-foreground tabular-nums">
                          ★ {p.rating.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 tabular-nums">
                          {metric === "LEVEL"
                            ? `GC ${p.levelGc}`
                            : metric === "ADR"
                            ? `${p.adr.toFixed(0)} ADR`
                            : metric === "KD"
                            ? `KD ${p.kd.toFixed(2)}`
                            : metric === "COMPOUND"
                            ? `${(p.winrate || 50).toFixed(0)}% WR`
                            : `${p.adr.toFixed(0)} ADR`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Squad TR */}
              <div className="surface-deck rounded-sm border border-status-critical/30 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-xs font-mono font-black text-status-critical flex items-center gap-1.5 uppercase tracking-wide">
                    <Sword className="size-4" /> Terroristas (TR)
                  </span>
                  <span className="text-xs font-mono font-black text-status-critical bg-status-critical/10 px-2 py-0.5 rounded-xs border border-status-critical/20 tabular-nums">
                    {result.trSum.toFixed(2)} pts
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {result.tr.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xs bg-surface-panel border border-border/30 hover:border-border/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar nickname={p.name} avatarUrl={p.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          {p.guest ? (
                            <span className="text-xs font-bold text-foreground truncate block leading-tight">
                              {p.name}
                            </span>
                          ) : (
                            <Link
                              href={`/players/${p.id}`}
                              className="text-xs font-bold text-foreground hover:text-primary truncate block leading-tight transition-colors"
                            >
                              {p.name}
                            </Link>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60 leading-none mt-0.5">
                            <span>{p.guest ? "Convidado" : p.role || "Operador"}</span>
                            <span>·</span>
                            <span>GC {p.levelGc}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 font-mono">
                        <span className="text-xs font-black text-foreground tabular-nums">
                          ★ {p.rating.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 tabular-nums">
                          {metric === "LEVEL"
                            ? `GC ${p.levelGc}`
                            : metric === "ADR"
                            ? `${p.adr.toFixed(0)} ADR`
                            : metric === "KD"
                            ? `KD ${p.kd.toFixed(2)}`
                            : metric === "COMPOUND"
                            ? `${(p.winrate || 50).toFixed(0)}% WR`
                            : `${p.adr.toFixed(0)} ADR`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ações de Registro de Resultado */}
            <div className="border-t border-border/30 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[10px] font-mono font-bold text-muted-foreground/70 uppercase tracking-wider">
                Registrar Desfecho da Partida:
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRegisterWinner("CT")}
                  className={cn(
                    "text-xs font-mono font-bold px-3 py-1.5 rounded-xs border transition-all cursor-pointer",
                    winner === "CT"
                      ? "bg-accent-cyan border-accent-cyan text-black font-black"
                      : "bg-surface-deck border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10"
                  )}
                >
                  CT Venceu
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRegisterWinner("DRAW")}
                  className={cn(
                    "text-xs font-mono font-bold px-3 py-1.5 rounded-xs border transition-all cursor-pointer",
                    winner === "DRAW"
                      ? "bg-foreground border-foreground text-background font-black"
                      : "bg-surface-deck border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface-panel"
                  )}
                >
                  Empate
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRegisterWinner("TR")}
                  className={cn(
                    "text-xs font-mono font-bold px-3 py-1.5 rounded-xs border transition-all cursor-pointer",
                    winner === "TR"
                      ? "bg-status-critical border-status-critical text-white font-black"
                      : "bg-surface-deck border-status-critical/30 text-status-critical hover:bg-status-critical/10"
                  )}
                >
                  TR Venceu
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── GRID PRINCIPAL: LOBBY & PRESETS (ESQUERDA) / ROSTER & HISTÓRICO (DIREITA) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: LOBBY & CONFIGURAÇÃO (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Painel do Lobby Ativo */}
          <div className="surface-panel rounded-sm border border-border/40 p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                  Lobby Ativo
                </h3>
              </div>
              <TacticalBadge
                variant={selectedPlayers.length === 10 ? "good" : "neutral"}
                size="xs"
              >
                {selectedPlayers.length} / 10 OPERADORES
              </TacticalBadge>
            </div>

            {/* Lista de Selecionados */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {selectedPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/50 text-xs font-mono flex flex-col items-center justify-center gap-2">
                  <Users className="size-7 stroke-[1.5] text-muted-foreground/30" />
                  <span>Lobby vazio. Selecione 10 operadores no Roster ao lado.</span>
                </div>
              ) : (
                selectedPlayers.map((player, idx) => (
                  <motion.div
                    key={player.id || `guest-${idx}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-2 rounded-xs bg-surface-deck border border-border/30 hover:border-border/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar nickname={player.name} avatarUrl={player.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate leading-tight">
                          {player.name}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground/60 leading-none mt-0.5">
                          {player.guest ? "Convidado" : `Rating ${player.rating.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-surface-panel border border-border/40 text-muted-foreground font-bold">
                        GC {player.levelGc}
                      </span>
                      <button
                        onClick={() => removeSelectedPlayer(idx)}
                        className="p-1 rounded-xs hover:bg-status-critical/10 text-muted-foreground/60 hover:text-status-critical transition-colors"
                        title="Remover do Lobby"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Ações Rápidas: Convidado & Limpar */}
            <div className="flex gap-2 pt-1 border-t border-border/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuestForm(!showGuestForm)}
                className="flex-1 border-border/60 text-xs font-mono font-bold uppercase rounded-xs"
              >
                <Plus className="size-3.5 mr-1" /> Convidado
              </Button>
              {selectedPlayers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearLobby}
                  className="border-status-critical/30 hover:bg-status-critical/10 text-status-critical text-xs font-mono font-bold uppercase rounded-xs"
                >
                  <RotateCcw className="size-3.5 mr-1" /> Limpar
                </Button>
              )}
            </div>

            {/* Formulário de Convidado */}
            <AnimatePresence>
              {showGuestForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleAddGuest}
                  className="border-t border-border/40 pt-3 flex flex-col gap-2 overflow-hidden"
                >
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Nickname do convidado..."
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="bg-surface-deck border border-border/60 rounded-xs px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 flex-1 focus:outline-none focus:border-primary font-mono"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono text-muted-foreground/70 uppercase">GC:</span>
                      <select
                        value={guestLevel}
                        onChange={(e) => setGuestLevel(Number(e.target.value))}
                        className="bg-surface-deck border border-border/60 rounded-xs text-xs py-1 px-1.5 text-foreground focus:outline-none font-mono"
                      >
                        {Array.from({ length: 21 }, (_, i) => 21 - i).map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full text-xs font-mono font-bold uppercase bg-primary hover:bg-primary/80 text-black rounded-xs"
                  >
                    Adicionar ao Lobby
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Médias do Lobby */}
            {selectedPlayers.length > 0 && (
              <div className="grid grid-cols-2 gap-2 border-t border-border/30 pt-3 text-center bg-surface-deck p-2 rounded-xs">
                <div className="border-r border-border/30">
                  <p className="text-[9px] font-mono uppercase tracking-wider font-bold text-muted-foreground/60">
                    Média Nível GC
                  </p>
                  <p className="text-sm font-mono font-black text-foreground mt-0.5 tabular-nums">
                    {avgGcLevel}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-wider font-bold text-muted-foreground/60">
                    Média Rating 2.0
                  </p>
                  <p className="text-sm font-mono font-black text-foreground mt-0.5 tabular-nums">
                    {avgRating}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Configurações & Presets de Sorteio */}
          <div className="surface-panel rounded-sm border border-border/40 p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                  Métricas de Peso & Modo
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                {metric}
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "RATING", label: "Rating 2.0", desc: "Desempenho Hub", icon: Award },
                { key: "LEVEL", label: "Nível GC", desc: "Patente externa", icon: Shield },
                { key: "ADR", label: "ADR Médio", desc: "Dano p/ round", icon: Sword },
                { key: "KD", label: "K/D Ratio", desc: "Taxa de eliminação", icon: Target },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setMetric(item.key as BalanceMetric)}
                  className={cn(
                    "flex flex-col text-left p-2.5 rounded-xs border text-xs font-mono transition-all duration-150",
                    metric === item.key
                      ? "bg-surface-elevated border-primary text-foreground shadow-sm"
                      : "bg-surface-deck border-border/40 text-muted-foreground/70 hover:text-foreground hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <item.icon className="size-3.5 text-primary" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] opacity-60 leading-none">{item.desc}</span>
                </button>
              ))}

              {/* Compound Inteligente */}
              <button
                onClick={() => setMetric("COMPOUND")}
                className={cn(
                  "col-span-2 flex flex-col text-left p-2.5 rounded-xs border text-xs font-mono transition-all duration-150",
                  metric === "COMPOUND"
                    ? "bg-surface-elevated border-accent-violet text-foreground shadow-sm"
                    : "bg-surface-deck border-border/40 text-muted-foreground/70 hover:text-foreground hover:border-border/80"
                )}
              >
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <Zap className="size-3.5 text-accent-violet" />
                  <span className="text-foreground">Peso Composto Inteligente</span>
                </div>
                <span className="text-[10px] opacity-60 leading-normal">
                  Ponderação multivariável: Rating (45%), ADR (30%), K/D (15%) e Winrate (10%).
                </span>
              </button>
            </div>

            {/* Modo de Geração & Seed */}
            <div className="border-t border-border/30 pt-3 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-muted-foreground/80 uppercase">
                  Modo de Divisão:
                </span>
                <div className="flex bg-surface-deck border border-border/60 rounded-xs p-0.5">
                  <button
                    onClick={() => setMode("BALANCED")}
                    className={cn(
                      "px-2.5 py-1 rounded-xs text-[10px] font-mono font-bold uppercase transition-all",
                      mode === "BALANCED"
                        ? "bg-primary text-black font-black"
                        : "text-muted-foreground/70 hover:text-foreground"
                    )}
                  >
                    <Scale className="size-3 inline mr-1" /> Equilibrado
                  </button>
                  <button
                    onClick={() => setMode("RANDOM")}
                    className={cn(
                      "px-2.5 py-1 rounded-xs text-[10px] font-mono font-bold uppercase transition-all",
                      mode === "RANDOM"
                        ? "bg-primary text-black font-black"
                        : "text-muted-foreground/70 hover:text-foreground"
                    )}
                  >
                    <Shuffle className="size-3 inline mr-1" /> Aleatório
                  </button>
                </div>
              </div>

              {/* Seed Manual */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-muted-foreground/70">
                    Fixar Seed Numérica
                  </span>
                  <input
                    type="checkbox"
                    checked={useCustomSeed}
                    onChange={(e) => setUseCustomSeed(e.target.checked)}
                    className="rounded-xs border-border/60 bg-surface-deck text-primary focus:ring-0 cursor-pointer"
                  />
                </div>
                {useCustomSeed && (
                  <input
                    type="text"
                    placeholder="Código da seed..."
                    value={customSeed}
                    onChange={(e) => setCustomSeed(e.target.value)}
                    className="bg-surface-deck border border-border/60 rounded-xs px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary font-mono"
                  />
                )}
              </div>
            </div>

            {/* Botão de Sortear */}
            <Button
              onClick={runShuffle}
              disabled={loading || selectedPlayers.length !== 10}
              className="w-full py-4 rounded-xs font-mono font-black text-xs uppercase bg-primary hover:bg-primary/90 text-black flex items-center justify-center gap-2 mt-1 shrink-0 cursor-pointer shadow-sm tracking-wider"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Calculando Balanceamento...</span>
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  <span>Sortear Equipes (5v5)</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* COLUNA DIREITA: ROSTER DE JOGADORES & HISTÓRICO (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* POOL DE JOGADORES DISPONÍVEIS */}
          <div className="surface-panel rounded-sm border border-border/40 p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                  Roster Disponível ({availablePlayers.length} atletas)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                Clique para adicionar ao lobby
              </span>
            </div>

            {/* Barra de Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Buscar por nickname ou função..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-deck border border-border/60 rounded-xs pl-9 pr-4 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Grid de Roster */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredPlayers.length === 0 ? (
                <div className="col-span-full text-center py-10 text-muted-foreground/50 text-xs font-mono">
                  Nenhum jogador localizado.
                </div>
              ) : (
                filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.some((p) => p.id === player.id);

                  return (
                    <button
                      key={player.id}
                      onClick={() => togglePlayer(player)}
                      className={cn(
                        "text-left p-2.5 rounded-xs border flex gap-2.5 items-center cursor-pointer transition-all duration-150",
                        isSelected
                          ? "bg-surface-elevated border-primary text-foreground shadow-sm"
                          : "bg-surface-deck border-border/40 hover:border-border/80 hover:bg-surface-panel"
                      )}
                    >
                      <PlayerAvatar nickname={player.name} avatarUrl={player.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate leading-tight">
                          {player.name}
                        </p>
                        <div className="flex gap-1.5 mt-0.5 font-mono text-[9px] text-muted-foreground/70">
                          <span>GC {player.levelGc}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-foreground font-bold">★ {player.rating.toFixed(2)}</span>
                        </div>
                        {player.role && (
                          <span className="inline-block text-[8px] font-mono font-bold text-primary bg-primary/10 rounded-xs px-1 mt-0.5">
                            {player.role}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="size-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="size-2.5 text-black stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* HISTÓRICO DE AUDITORIA DE SEEDS */}
          <div className="surface-panel rounded-sm border border-border/40 p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="size-4 text-primary" />
                <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                  Histórico de Sorteios & Auditoria
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                {history.length} registros
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {historyLoading && history.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-muted-foreground">
                  Carregando histórico de auditoria...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-muted-foreground/40">
                  Nenhum balanceamento registrado no histórico ainda.
                </div>
              ) : (
                history.map((match) => (
                  <div
                    key={match.id}
                    onClick={() => handleLoadHistoryMatch(match)}
                    className={cn(
                      "p-3 rounded-xs border bg-surface-deck border-border/40 hover:bg-surface-panel hover:border-border/80 transition-colors cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-3",
                      currentMatchId === match.id && "border-primary bg-surface-elevated"
                    )}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-foreground">
                          Seed: {match.seed}
                        </span>
                        <span className="text-[9px] px-1 bg-surface-panel rounded-xs border border-border/60 text-muted-foreground font-mono uppercase">
                          {match.metric}
                        </span>
                        {match.winner && (
                          <TacticalBadge
                            variant={
                              match.winner === "CT"
                                ? "cyan"
                                : match.winner === "TR"
                                ? "critical"
                                : "neutral"
                            }
                            size="xs"
                          >
                            {match.winner === "DRAW" ? "EMPATE" : `${match.winner} VENCEU`}
                          </TacticalBadge>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground/70 leading-none">
                        Gerado em {new Date(match.createdAt).toLocaleString("pt-BR")} · Diff: {match.difference.toFixed(2)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1 font-mono text-[9px]">
                        {match.players.slice(0, 5).map((p, i) => (
                          <span key={i} className="text-accent-cyan font-bold truncate max-w-[65px]">
                            {p.nickname}
                          </span>
                        ))}
                        <span className="text-muted-foreground/40">vs</span>
                        {match.players.slice(5, 10).map((p, i) => (
                          <span key={i} className="text-status-critical font-bold truncate max-w-[65px]">
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
                        className="p-1.5 rounded-xs bg-surface-panel border border-border/60 hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors"
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
        </div>
      </div>
    </div>
  );
}
