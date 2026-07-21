"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, CheckCircle, AlertTriangle, Lightbulb, RefreshCw, Cpu } from "lucide-react";
import { Skeleton } from "@/components/ui/loading-skeleton";
import type { CoachReportDTO } from "@/server/dtos/coachReport.dto";

export function CoachReportCard({ apiUrl }: { apiUrl: string }) {
  const [report, setReport] = useState<CoachReportDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const requestKeyRef = useRef<string | null>(null);
  const ignoreRef = useRef(false);

  useEffect(() => {
    const requestKey = `${apiUrl}:${retryKey}`;
    if (requestKeyRef.current === requestKey) {
      // React StrictMode reexecuta o efeito em dev; evita disparar uma segunda
      // chamada real à API (que consome cota/rate-limit) para o mesmo pedido.
      // Precisa resetar ignoreRef aqui: o cleanup do efeito fantasma anterior
      // já rodou e marcou ignoreRef=true, então sem isso o fetch original
      // (o único que segue em voo) teria seu resultado sempre descartado.
      ignoreRef.current = false;
      return;
    }
    requestKeyRef.current = requestKey;
    ignoreRef.current = false;

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000); // alinhado com DEEPSEEK_TIMEOUT_MS

    fetch(apiUrl, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          return res.json().then((json) => {
            throw new Error(json.error || "Falha ao gerar relatório.");
          });
        }
        return res.json();
      })
      .then((data) => {
        if (ignoreRef.current) return;
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (ignoreRef.current) return;
        if (err.name === "AbortError") {
          setError("A requisição expirou. O modelo demorou muito para responder.");
        } else {
          setError(err.message || "Erro de conexão ao carregar o Coach.");
        }
        setLoading(false);
      });

    return () => {
      ignoreRef.current = true;
      clearTimeout(timeoutId);
      // Não aborta a requisição em voo aqui: no StrictMode isso cancelaria a
      // única chamada real, forçando a reexecução do efeito a disparar outra.
      // O timeout de 240s acima continua sendo a rede de segurança para travamentos reais.
    };
  }, [apiUrl, retryKey]);

  if (loading) {
    return (
      <div className="glass-panel p-5 border border-white/10 bg-white/[0.01] rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Sparkles className="size-4.5 text-primary animate-pulse" />
          <h3 className="text-sm font-bold text-white tracking-wider uppercase">
            Coach IA · Analisando...
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-2/3 mb-1" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-5 border border-status-critical/20 bg-status-critical/5 rounded-2xl flex flex-col gap-3 items-center text-center">
        <AlertTriangle className="size-8 text-status-critical" />
        <div>
          <h4 className="text-sm font-bold text-white">Falha na Análise do Coach IA</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
        </div>
        <button
          onClick={() => setRetryKey((k) => k + 1)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="size-3.5" /> Tentar Novamente
        </button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="glass-panel p-5 border border-white/10 bg-white/[0.01] rounded-2xl flex flex-col gap-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4.5 text-primary" />
          <h3 className="text-sm font-bold text-white tracking-wider uppercase">
            Coach IA · Análise Estratégica
          </h3>
        </div>
        <span className="inline-flex items-center rounded-full bg-status-good/15 px-2.5 py-0.5 text-xs font-semibold text-status-good border border-status-good/20">
          Confiança: {report.confidence}%
        </span>
      </div>

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
            <AlertTriangle className="size-3.5" /> Pontos a Melhorar
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
          <Lightbulb className="size-3.5" /> Recomendações Táticas do Coach
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
