"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, AlertTriangle, Lightbulb, RefreshCw, Cpu, Brain, Clock, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/loading-skeleton";
import type { CoachReportDTO } from "@/server/dtos/coachReport.dto";

type ReportStatus = "none" | "stale" | "fresh";

interface PeekResponse {
  status: ReportStatus;
  report: CoachReportDTO | null;
  generatedAt: string | null;
}

const PROGRESS_MESSAGES = [
  "🧠 Chamando o Coach...",
  "📺 Revendo seus VODs...",
  "🎯 Conferindo sua mira...",
  "☕ Preparando a análise...",
  "📊 Procurando onde os rounds escaparam...",
  "🔎 Analisando seus padrões de jogo...",
  "🧮 Calculando o rating de verdade...",
  "🗺️ Comparando seus mapas...",
  "🤝 Vendo com quem você joga melhor...",
  "📈 Cruzando a tendência recente...",
  "🎮 Revisando os últimos confrontos...",
  "🧊 Conferindo se a mira tava fria ou quente...",
  "💬 Separando elogio de puxão de orelha...",
  "🕵️ Investigando os rounds decisivos...",
  "📋 Montando o resumo tático...",
  "🎯 Medindo consistência...",
  "🔥 Vendo se a fase tá boa ou não...",
  "🧠 Traduzindo número em feedback...",
];

function pickRandomProgressMessage(exclude?: string): string {
  const pool = exclude ? PROGRESS_MESSAGES.filter((m) => m !== exclude) : PROGRESS_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function CoachReportCard({ apiUrl }: { apiUrl: string }) {
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<ReportStatus>("none");
  const [report, setReport] = useState<CoachReportDTO | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progressMessage, setProgressMessage] = useState(() => pickRandomProgressMessage());
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const requestKeyRef = useRef<string | null>(null);
  const ignoreRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Verifica se já existe uma análise para essa entidade (sem chamar a IA).
  useEffect(() => {
    if (requestKeyRef.current === apiUrl) {
      // Guarda contra a dupla execução do React StrictMode em dev.
      ignoreRef.current = false;
      return;
    }
    requestKeyRef.current = apiUrl;
    ignoreRef.current = false;

    setChecking(true);
    setError(null);

    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((json) => {
            throw new Error(json.error || "Falha ao verificar análise.");
          });
        }
        return res.json();
      })
      .then((data: PeekResponse) => {
        if (ignoreRef.current) return;
        setStatus(data.status);
        setReport(data.report);
        setGeneratedAt(data.generatedAt);
        setChecking(false);
      })
      .catch((err) => {
        if (ignoreRef.current) return;
        setError(err.message || "Erro de conexão ao verificar o Coach.");
        setChecking(false);
      });

    return () => {
      ignoreRef.current = true;
    };
  }, [apiUrl]);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setProgressMessage((current) => pickRandomProgressMessage(current));
    }, 3000);
    return () => clearInterval(interval);
  }, [generating]);

  async function handleGenerate() {
    setGenerating(true);
    setProgressMessage(pickRandomProgressMessage());
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000); // alinhado com DEEPSEEK_TIMEOUT_MS

    try {
      const res = await fetch(apiUrl, { method: "POST", signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Falha ao gerar relatório.");
      }
      const data: CoachReportDTO = await res.json();
      setReport(data);
      setGeneratedAt(data.generatedAt);
      setStatus("fresh");
      // Scroll e flash de borda ao completar
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setFlash(true);
        setTimeout(() => setFlash(false), 2200);
      }, 80);
    } catch (err) {
      clearTimeout(timeoutId);
      const e = err as Error & { name?: string };
      if (e.name === "AbortError") {
        setError("A requisição expirou. O modelo demorou muito para responder.");
      } else {
        setError(e.message || "Erro de conexão ao gerar a análise.");
      }
    } finally {
      setGenerating(false);
    }
  }

  if (checking) {
    return (
      <div className="glass-panel glow-ring-primary p-5 border border-primary/20 bg-primary/[0.03] rounded-2xl flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
          <Brain className="size-5 text-primary animate-pulse" />
          <h3 className="text-sm font-bold text-white tracking-wider uppercase">Coach IA</h3>
        </div>
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (generating) {
    return (
      <div className="glass-panel glow-ring-primary p-5 border border-primary/20 bg-primary/[0.03] rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
          <Brain className="size-5 text-primary animate-pulse" />
          <h3 className="text-sm font-bold text-white tracking-wider uppercase">
            Coach IA · Analisando...
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
            <div className="progress-bar-indeterminate absolute inset-y-0 w-1/2 rounded-full bg-primary" />
          </div>
          <p className="text-xs text-primary/80 font-medium">{progressMessage}</p>
          <Skeleton className="h-4 w-2/3 mb-1" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="glass-panel p-5 border border-status-critical/20 bg-status-critical/5 rounded-2xl flex flex-col gap-3 items-center text-center">
        <AlertTriangle className="size-8 text-status-critical" />
        <div>
          <h4 className="text-sm font-bold text-white">Falha na Análise do Coach IA</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
        </div>
        <button
          onClick={handleGenerate}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="size-3.5" /> Tentar Novamente
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass-panel glow-ring-primary border border-primary/25 bg-primary/[0.03] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-primary/10 flex items-center gap-2">
          <Brain className="size-4 text-primary" />
          <h4 className="text-sm font-bold text-white tracking-wider uppercase">Coach IA</h4>
          <span className="ml-auto text-[9px] font-bold text-primary/60 border border-primary/20 bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-widest">Disponível</span>
        </div>
        <div className="px-5 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Nenhuma análise gerada ainda.</p>
            <p className="text-xs text-muted-foreground/70 mt-1.5 leading-relaxed max-w-md">
              Gere um relatório técnico da temporada — o Coach analisa Rating, ADR, K/D, mapas,
              tendências e duplas. Tempo médio: 10–15 segundos.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className="btn-press shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Brain className="size-3.5" /> Gerar análise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`glass-panel glow-ring-primary p-5 border border-primary/20 bg-primary/[0.02] rounded-2xl flex flex-col gap-4 ${flash ? "report-flash" : ""}`}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-primary/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-primary" />
          <h3 className="text-sm font-bold text-white tracking-wider uppercase">Coach IA</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-status-good/15 px-2.5 py-0.5 text-[10px] font-bold text-status-good border border-status-good/20">
            Confiança {report.confidence}%
          </span>
          <button
            onClick={handleGenerate}
            className="btn-press inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="size-3" /> Atualizar
          </button>
        </div>
      </div>

      {/* Status da análise */}
      <div className="flex items-center gap-3 text-[10px] -mt-2 flex-wrap">
        {status === "fresh" ? (
          <span className="inline-flex items-center gap-1 text-status-good font-semibold">
            <span className="size-1.5 rounded-full bg-status-good" /> Análise atualizada
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-status-warning font-semibold">
            <span className="size-1.5 rounded-full bg-status-warning" /> Nova partida disponível — atualize
          </span>
        )}
        {generatedAt && (
          <span className="flex items-center gap-1 text-muted-foreground/60">
            <Clock className="size-3" /> {formatRelativeTime(generatedAt)}
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-status-critical -mt-1">{error}</p>
      )}

      {/* Resumo */}
      <div className="text-sm text-muted-foreground leading-relaxed">
        {report.summary}
      </div>

      {/* Forças e Fraquezas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-1">
        {/* Forças */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-2">
          <span className="text-[10px] font-semibold text-status-good uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="size-3.5" /> Pontos Fortes
          </span>
          <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
            {report.strengths.map((str, idx) => (
              <li key={idx} className="leading-relaxed">
                • {str}
              </li>
            ))}
            {report.strengths.length === 0 && <li>Nenhum ponto forte listado no momento.</li>}
          </ul>
        </div>

        {/* Fraquezas */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-2">
          <span className="text-[10px] font-semibold text-status-critical uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="size-3.5" /> Prioridades de Melhoria
          </span>
          <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
            {report.weaknesses.map((weak, idx) => (
              <li key={idx} className="leading-relaxed">
                • {weak}
              </li>
            ))}
            {report.weaknesses.length === 0 && <li>Nenhum ponto de atenção listado.</li>}
          </ul>
        </div>
      </div>

      {/* Recomendações */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-2">
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
          <Lightbulb className="size-3.5" /> Recomendações do Coach
        </span>
        <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
          {report.recommendations.map((rec, idx) => (
            <li key={idx} className="leading-relaxed">
              • {rec}
            </li>
          ))}
          {report.recommendations.length === 0 && <li>Nenhuma recomendação tática listada.</li>}
        </ul>
      </div>

      {/* Próximo Objetivo */}
      {report.nextGoal && (
        <div className="p-4 rounded-xl border border-accent-cyan/20 bg-accent-cyan/[0.04] flex flex-col gap-2">
          <span className="text-[10px] font-semibold text-accent-cyan uppercase tracking-wider flex items-center gap-1">
            <Target className="size-3.5" /> Próximo Objetivo
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">{report.nextGoal}</p>
        </div>
      )}

      {/* Footer Metadata */}
      <div className="flex flex-wrap items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-3 mt-1">
        <span className="flex items-center gap-1">
          <Cpu className="size-3" />
          Modelo: {report.model} ({report.provider})
        </span>
        {report.processingTimeMs > 0 ? (
          <span>Processamento: {(report.processingTimeMs / 1000).toFixed(2)}s</span>
        ) : (
          <span className="text-status-good">Alimentado via Cache</span>
        )}
      </div>
    </div>
  );
}
