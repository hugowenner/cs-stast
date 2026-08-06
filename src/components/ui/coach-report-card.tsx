"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, AlertTriangle, Lightbulb, RefreshCw, Cpu, Brain, Clock, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/loading-skeleton";
import type { CoachReportDTO } from "@/server/dtos/coachReport.dto";
import { coachNarratives } from "@/lib/narrator/templates";

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
    <div className="flex items-center gap-3">
      <div className="shrink-0 size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Brain className={`size-4 text-primary ${pulse ? "animate-pulse" : ""}`} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black tracking-[0.2em] uppercase text-gradient-ai">
            TACTICAL AI
          </span>
          <span className="text-[8px] text-muted-foreground/30 font-bold tracking-widest">·</span>
          <span className="text-[8px] font-bold tracking-[0.12em] uppercase text-muted-foreground/40">
            CS2 STATS HUB
          </span>
        </div>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground/50 font-medium tracking-wide mt-0.5">
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
      <div className="card-ai p-5 rounded-2xl flex flex-col gap-4">
        <TacticalAIHeader />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (generating) {
    return (
      <div className="card-ai p-5 rounded-2xl flex flex-col gap-5">
        <TacticalAIHeader subtitle="ANALYZING DATA..." pulse />
        <div className="flex flex-col gap-3">
          <div className="hud-status-line">
            <span className="hud-status-label">PROCESSING</span>
          </div>
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-primary/10">
            <div className="progress-bar-indeterminate absolute inset-y-0 w-1/2 rounded-full bg-primary" />
          </div>
          <p className="text-[11px] text-primary/65 font-medium tracking-wide">{progressMessage}</p>
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
      <div className="card-ai p-5 rounded-2xl flex flex-col gap-4">
        <TacticalAIHeader subtitle="ERROR" />
        <div className="flex flex-col gap-3 items-center text-center py-4">
          <AlertTriangle className="size-7 text-status-critical" />
          <div>
            <h4 className="text-sm font-bold text-white">Falha na análise</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
          </div>
          <button
            onClick={handleGenerate}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="size-3.5" /> Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card-ai rounded-2xl overflow-hidden">
        <div className="p-5 pb-4">
          <TacticalAIHeader />
        </div>
        <div className="px-5 pb-6 border-t border-white/[0.06] pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1 min-w-0">
            <div className="hud-status-line mb-3">
              <span className="hud-status-label">ANALYSIS READY</span>
            </div>
            <p className="text-xs text-muted-foreground/65 leading-relaxed max-w-md">
              Rating, ADR, K/D, mapas, tendências e duplas. Tempo médio: 10–15 segundos.
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
      className={`card-ai p-5 rounded-2xl flex flex-col gap-5 ${flash ? "report-flash" : ""}`}
    >
      {/* Header TACTICAL AI + controles */}
      <div className="flex items-start justify-between flex-wrap gap-3 border-b border-white/[0.06] pb-4">
        <TacticalAIHeader subtitle={coachNarratives.summaryTitle} />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-status-good/12 px-2.5 py-0.5 text-[10px] font-bold text-status-good border border-status-good/18">
            {report.confidence}% confiança
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
          <span className="inline-flex items-center gap-1.5 text-status-good font-semibold">
            <span className="pulse-dot bg-status-good" /> ANALYSIS UP TO DATE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-status-warning font-semibold">
            <span className="pulse-dot bg-status-warning" /> NEW MATCH AVAILABLE
          </span>
        )}
        {generatedAt && (
          <span className="flex items-center gap-1 text-muted-foreground/50">
            <Clock className="size-3" /> {formatRelativeTime(generatedAt)}
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-status-critical -mt-2">{error}</p>
      )}

      {/* Resumo */}
      <div className="text-sm text-muted-foreground leading-relaxed">
        {report.summary}
      </div>

      {/* Forças e Fraquezas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.01] flex flex-col gap-3">
          <div className="hud-section-separator">
            <span className="text-[8px] font-black tracking-[0.14em] uppercase text-status-good/80 flex items-center gap-1.5">
              <CheckCircle className="size-3" /> STRENGTHS
            </span>
          </div>
          <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
            {report.strengths.map((str, idx) => (
              <li key={idx} className="leading-relaxed flex gap-2">
                <span className="text-status-good/60 shrink-0">›</span>
                {str}
              </li>
            ))}
            {report.strengths.length === 0 && <li className="text-muted-foreground/40">Nenhum ponto forte listado.</li>}
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.01] flex flex-col gap-3">
          <div className="hud-section-separator">
            <span className="text-[8px] font-black tracking-[0.14em] uppercase text-status-critical/80 flex items-center gap-1.5">
              <AlertTriangle className="size-3" /> WEAKNESSES
            </span>
          </div>
          <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
            {report.weaknesses.map((weak, idx) => (
              <li key={idx} className="leading-relaxed flex gap-2">
                <span className="text-status-critical/60 shrink-0">›</span>
                {weak}
              </li>
            ))}
            {report.weaknesses.length === 0 && <li className="text-muted-foreground/40">Nenhum ponto de atenção.</li>}
          </ul>
        </div>
      </div>

      {/* Recomendações */}
      <div className="p-4 rounded-xl border border-primary/15 bg-primary/[0.04] flex flex-col gap-3">
        <div className="hud-section-separator">
          <span className="text-[8px] font-black tracking-[0.14em] uppercase text-primary/70 flex items-center gap-1.5">
            <Lightbulb className="size-3" /> TACTICAL RECOMMENDATIONS
          </span>
        </div>
        <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
          {report.recommendations.map((rec, idx) => (
            <li key={idx} className="leading-relaxed flex gap-2">
              <span className="text-primary/50 shrink-0">›</span>
              {rec}
            </li>
          ))}
          {report.recommendations.length === 0 && <li className="text-muted-foreground/40">Nenhuma recomendação listada.</li>}
        </ul>
      </div>

      {/* Próximo Objetivo */}
      {report.nextGoal && (
        <div className="p-4 rounded-xl border border-accent-cyan/15 bg-accent-cyan/[0.03] flex flex-col gap-3">
          <div className="hud-section-separator">
            <span className="text-[8px] font-black tracking-[0.14em] uppercase text-accent-cyan/70 flex items-center gap-1.5">
              <Target className="size-3" /> NEXT OBJECTIVE
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{report.nextGoal}</p>
        </div>
      )}

      {/* Footer Metadata */}
      <div className="flex flex-wrap items-center justify-between text-[9px] text-muted-foreground/40 border-t border-white/[0.04] pt-3 font-mono tracking-wide">
        <span className="flex items-center gap-1.5">
          <Cpu className="size-3" />
          {report.model} · {report.provider}
        </span>
        {report.processingTimeMs > 0 ? (
          <span>{(report.processingTimeMs / 1000).toFixed(2)}s</span>
        ) : (
          <span className="text-status-good">CACHED</span>
        )}
      </div>
    </div>
  );
}
