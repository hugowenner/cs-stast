import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

export interface FormaStyleEntry {
  text: string;
  color: string;
  bg: string;
  border: string;
  /** Prefixo textual (▲▬▼) usado em contextos server-rendered simples, ex: RankingTable. */
  prefix: string;
  /** Ícone Lucide equivalente, usado em cards com mais espaço, ex: MonitoredPlayersCarousel. */
  icon: LucideIcon;
}

export type FormaStyleMap = Record<string, FormaStyleEntry>;

/**
 * Estilo visual da "forma" (tendência recente) de um jogador — Excelente / Em alta /
 * Estável / Oscilando. Antes duplicado em src/app/page.tsx e
 * monitored-players-carousel.tsx com os mesmos valores de cor/bg/border; centralizado
 * aqui como fonte única.
 */
export const FORMA_STYLE: FormaStyleMap = {
  "Excelente": { text: "Excelente", color: "text-status-good",         bg: "bg-status-good/10",    border: "border-status-good/20",    prefix: "▲", icon: TrendingUp },
  "Em alta":   { text: "Em alta",   color: "text-status-good",         bg: "bg-status-good/10",    border: "border-status-good/20",    prefix: "▲", icon: TrendingUp },
  "Estável":   { text: "Estável",   color: "text-muted-foreground/70", bg: "bg-white/[0.04]",      border: "border-white/[0.08]",      prefix: "▬", icon: Minus },
  "Oscilando": { text: "Oscilando", color: "text-status-warning",      bg: "bg-status-warning/10", border: "border-status-warning/20", prefix: "▼", icon: TrendingDown },
};

export function getFormaStyle(forma: string): FormaStyleEntry {
  return FORMA_STYLE[forma] ?? FORMA_STYLE["Oscilando"];
}
