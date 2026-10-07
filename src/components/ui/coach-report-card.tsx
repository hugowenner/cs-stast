"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, AlertTriangle, Lightbulb, RefreshCw, Cpu, Brain, Clock, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import type { CoachReportDTO } from "@/server/dtos/coachReport.dto";
import { coachNarratives } from "@/lib/narrator/templates";
import { cn } from "@/lib/utils";

type ReportStatus = "none" | "stale" | "fresh";

interface PeekResponse {
  status: ReportStatus;
  report: CoachReportDTO | null;
  generatedAt: string | null;
}

const PROGRESS_MESSAGES = coachNarratives.progressMessages;

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

function TacticalAIHeader({ subtitle, pulse = false }: { subtitle?: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="shrink-0 size-7 rounded-xs bg-primary/10 border border-primary/25 flex items-center justify-center">
        <Brain className={`size-3.5 text-primary ${pulse ? "animate-pulse" : ""}`} />
      </div>
      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-foreground">
            TACTICAL AI // INTELLIGENCE
          </span>
        </div>
        {subtitle && (
          <p className="text-[10px] font-mono text-muted-foreground/70 tracking-wide mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
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

  useEffect(() => {
    if (requestKeyRef.current === apiUrl) {
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
    const timeoutId = setTimeout(() => controller.abort(), 240000);

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
      <div className="bg-surface-panel border border-border/70 rounded-sm p-4 sm:p-5 flex flex-col gap-4">
        <TacticalAIHeader />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (generating) {
    return (
      <div className="bg-surface-panel border border-border/70 rounded-sm p-4 sm:p-5 flex flex-col gap-4">
        <TacticalAIHeader subtitle="PROCESSANDO TELEMETRIA COLETIVA..." pulse />
        <div className="flex flex-col gap-3">
          <div className="h-1 w-full overflow-hidden rounded-none bg-surface-deck">
            <div className="progress-bar-indeterminate h-full w-1/2 bg-primary" />
          </div>
          <p className="text-xs font-mono text-primary font-medium">{progressMessage}</p>
          <Skeleton className="h-4 w-2/3 mb-1" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="bg-surface-panel border border-border/70 rounded-sm p-4 sm:p-5 flex flex-col gap-4">
        <TacticalAIHeader subtitle="DIAGNÓSTICO INDISPONÍVEL" />
        <div className="flex flex-col gap-3 items-center text-center py-4 bg-surface-deck/40 rounded-xs border border-border/40">
          <AlertTriangle className="size-6 text-status-critical" />
          <div>
            <h4 className="text-xs font-mono font-bold text-foreground uppercase">Falha na análise</h4>
            <p className="text-xs font-mono text-muted-foreground mt-1 max-w-md">{error}</p>
          </div>
          <button
            onClick={handleGenerate}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xs bg-surface-deck border border-border/60 hover:bg-surface-elevated px-3 py-1.5 text-xs font-mono font-bold text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3.5" /> Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 sm:p-5 pb-3 border-b border-border/40 bg-surface-deck/40">
          <TacticalAIHeader />
        </div>
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <TacticalBadge label="DIAGNÓSTICO PRONTO" variant="primary" size="xs" />
            </div>
            <p className="text-xs font-mono text-muted-foreground leading-relaxed max-w-md">
              Avaliação de Rating, ADR, K/D, aproveitamento em mapas e tendências de combate.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xs bg-primary px-3.5 py-2 text-xs font-mono font-bold text-primary-foreground hover:bg-primary/90 transition-opacity cursor-pointer uppercase"
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
      className={cn(
        "bg-surface-panel border border-border/70 rounded-sm p-4 sm:p-5 flex flex-col gap-4 shadow-sm",
        flash ? "report-flash" : ""
      )}
    >
      {/* Header TACTICAL AI + controles */}
      <div className="flex items-start justify-between flex-wrap gap-3 border-b border-border/40 pb-3.5">
        <TacticalAIHeader subtitle={coachNarratives.summaryTitle} />
        <div className="flex items-center gap-2 flex-wrap">
          <TacticalBadge label={`${report.confidence}% CONFIANÇA`} variant="good" size="xs" />
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-1 rounded-xs bg-surface-deck border border-border/50 hover:bg-surface-elevated px-2.5 py-1 text-[10px] font-mono font-bold text-foreground transition-colors cursor-pointer uppercase"
          >
            <RefreshCw className="size-3" /> Atualizar
          </button>
        </div>
      </div>

      {/* Status da análise */}
      <div className="flex items-center gap-3 text-[10px] font-mono -mt-1 flex-wrap">
        {status === "fresh" ? (
          <span className="inline-flex items-center gap-1.5 text-status-good font-bold">
            <span className="size-1.5 rounded-full bg-status-good" /> RELATÓRIO ATUALIZADO
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-status-warning font-bold">
            <span className="size-1.5 rounded-full bg-status-warning" /> NOVAS PARTIDAS REGISTRADAS
          </span>
        )}
        {generatedAt && (
          <span className="flex items-center gap-1 text-muted-foreground/60">
            <Clock className="size-3" /> {formatRelativeTime(generatedAt)}
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs font-mono text-status-critical">{error}</p>
      )}

      {/* Resumo */}
      <div className="text-xs sm:text-sm font-sans text-muted-foreground leading-relaxed bg-surface-deck/40 p-3.5 rounded-xs border border-border/40">
        {report.summary}
      </div>

      {/* Forças e Fraquezas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-3.5 rounded-xs border border-status-good/25 bg-surface-deck/60 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-status-good border-b border-border/30 pb-1.5">
            <CheckCircle className="size-3" /> PONTOS FORTES
          </div>
          <ul className="flex flex-col gap-1.5 text-xs font-sans text-muted-foreground">
            {report.strengths.map((str, idx) => (
              <li key={idx} className="leading-relaxed flex gap-2">
                <span className="text-status-good font-mono font-bold shrink-0">›</span>
                {str}
              </li>
            ))}
            {report.strengths.length === 0 && <li className="text-muted-foreground/50 font-mono text-xs">Nenhum ponto forte registrado.</li>}
          </ul>
        </div>

        <div className="p-3.5 rounded-xs border border-status-critical/25 bg-surface-deck/60 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-status-critical border-b border-border/30 pb-1.5">
            <AlertTriangle className="size-3" /> PONTOS DE ATENÇÃO
          </div>
          <ul className="flex flex-col gap-1.5 text-xs font-sans text-muted-foreground">
            {report.weaknesses.map((weak, idx) => (
              <li key={idx} className="leading-relaxed flex gap-2">
                <span className="text-status-critical font-mono font-bold shrink-0">›</span>
                {weak}
              </li>
            ))}
            {report.weaknesses.length === 0 && <li className="text-muted-foreground/50 font-mono text-xs">Nenhum ponto de atenção crítico.</li>}
          </ul>
        </div>
      </div>

      {/* Recomendações */}
      <div className="p-3.5 rounded-xs border border-primary/25 bg-primary/[0.03] flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-primary border-b border-border/30 pb-1.5">
          <Lightbulb className="size-3" /> RECOMENDAÇÕES TÁTICAS
        </div>
        <ul className="flex flex-col gap-2 text-xs font-sans text-muted-foreground">
          {report.recommendations.map((rec, idx) => (
            <li key={idx} className="leading-relaxed flex gap-2">
              <span className="text-primary font-mono font-bold shrink-0">›</span>
              {rec}
            </li>
          ))}
          {report.recommendations.length === 0 && <li className="text-muted-foreground/50 font-mono text-xs">Nenhuma recomendação listada.</li>}
        </ul>
      </div>

      {/* Próximo Objetivo */}
      {report.nextGoal && (
        <div className="p-3.5 rounded-xs border border-cyan-500/25 bg-cyan-500/[0.02] flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400 border-b border-border/30 pb-1.5">
            <Target className="size-3" /> DIRETRIZ COLETIVA
          </div>
          <p className="text-xs font-sans text-muted-foreground leading-relaxed">{report.nextGoal}</p>
        </div>
      )}

      {/* Footer Metadata */}
      <div className="flex flex-wrap items-center justify-between text-[9px] text-muted-foreground/50 border-t border-border/30 pt-2.5 font-mono tracking-wide">
        <span className="flex items-center gap-1.5">
          <Cpu className="size-3" />
          {report.model} · {report.provider}
        </span>
        {report.processingTimeMs > 0 ? (
          <span>{(report.processingTimeMs / 1000).toFixed(2)}s</span>
        ) : (
          <span className="text-status-good font-bold">CACHED</span>
        )}
      </div>
    </div>
  );
}
