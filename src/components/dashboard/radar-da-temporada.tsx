"use client";

import * as React from "react";
import Link from "next/link";
import { Star, AlertTriangle, Sparkles, Crosshair, Zap, ShieldAlert } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { DeltaIndicator } from "@/components/ui/delta-indicator";
import type {
  JogadorDaSemanaInfo,
  WeeklyCuriosity,
  SmartAlert,
} from "@/server/services/competitive.service";
import { performanceNarratives } from "@/lib/narrator/templates";

export interface RadarDaTemporadaProps {
  jogadorDaSemana: JogadorDaSemanaInfo | null;
  weeklyCuriosity: WeeklyCuriosity | null;
  smartAlerts: SmartAlert[];
}

// ─── Hero Card: Destaque da Semana ────────────────────────────────────────────
function DestaqueDaSemana({ info }: { info: JogadorDaSemanaInfo }) {
  return (
    <div className="flex flex-col justify-between gap-3.5 p-4 sm:p-5 bg-surface-panel border border-gold/30 rounded-sm md:col-span-2 lg:col-span-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Star className="size-3.5 text-gold shrink-0" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-gold truncate">
            Destaque da Semana
          </span>
        </div>
        <TacticalBadge label="FORMA ATIVA" variant="gold" size="xs" />
      </div>

      <div className="flex items-center gap-3.5">
        <PlayerAvatar
          nickname={info.player.nickname}
          avatarUrl={info.player.avatarUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/players/${info.player.id}`}
            className="text-base font-black text-foreground hover:text-primary transition-micro block truncate leading-tight"
          >
            {info.player.nickname}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-status-good font-bold">
              {info.evolutionText}
            </span>
          </div>
        </div>
      </div>

      {/* Tagline Narrativa */}
      <p className="text-[11px] font-mono text-muted-foreground/80 italic leading-snug">
        &ldquo;{performanceNarratives.positive[0].tagline}&rdquo;
      </p>

      {/* Metric Breakdown */}
      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-border/30">
        <div className="text-center">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">
            RATING
          </span>
          <span className="font-mono text-sm font-black text-foreground mt-0.5 tabular-nums block">
            <AnimatedNumber value={info.rating} decimals={2} />
          </span>
        </div>
        <div className="text-center border-x border-border/30">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">
            WINRATE
          </span>
          <span className="font-mono text-sm font-black text-foreground mt-0.5 tabular-nums block">
            <AnimatedNumber value={info.winrate} decimals={0} suffix="%" />
          </span>
        </div>
        <div className="text-center">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60 block">
            EVOLUÇÃO
          </span>
          <span className="font-mono text-sm font-black text-status-good mt-0.5 tabular-nums block">
            +<AnimatedNumber value={Math.abs(info.evolution)} decimals={2} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Card: Smart Alert ────────────────────────────────────────────────────────
function SmartAlertCard({ alert }: { alert: SmartAlert }) {
  const positive = alert.severity === "positive";
  return (
    <div
      className={`flex flex-col justify-between gap-3 p-4 bg-surface-panel border rounded-sm ${
        positive
          ? "border-cyan-500/30"
          : "border-status-warning/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {positive ? (
            <Zap className="size-3.5 text-cyan-400 shrink-0" />
          ) : (
            <ShieldAlert className="size-3.5 text-status-warning shrink-0" />
          )}
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-[0.16em] truncate ${
              positive ? "text-cyan-400" : "text-status-warning"
            }`}
          >
            {positive ? "Alerta de Desempenho" : "Ponto de Atenção"}
          </span>
        </div>
        <TacticalBadge
          label={positive ? "POSITIVO" : "ATENÇÃO"}
          variant={positive ? "info" : "warning"}
          size="xs"
        />
      </div>

      <div className="flex items-start gap-3 min-h-[44px]">
        {alert.player && (
          <PlayerAvatar
            nickname={alert.player.nickname}
            avatarUrl={alert.player.avatarUrl}
            size="md"
          />
        )}
        <p className="text-xs text-foreground/90 font-medium leading-relaxed flex-1">
          {alert.text}
        </p>
      </div>

      <div className="border-t border-border/20 pt-2 text-[10px] font-mono text-muted-foreground/60">
        Telemetria automatizada do CS2 Stats
      </div>
    </div>
  );
}

// ─── Card: Curiosidade da Semana ──────────────────────────────────────────────
function CuriosidadeCard({ curiosity }: { curiosity: WeeklyCuriosity }) {
  return (
    <div className="flex flex-col justify-between gap-3 p-4 bg-surface-panel border border-border/60 rounded-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="size-3.5 text-primary shrink-0" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-foreground truncate">
            Curiosidade da Temporada
          </span>
        </div>
        <TacticalBadge label="DADO CURIOSO" variant="neutral" size="xs" />
      </div>

      <div className="flex items-start gap-3 min-h-[44px]">
        {curiosity.player && (
          <PlayerAvatar
            nickname={curiosity.player.nickname}
            avatarUrl={curiosity.player.avatarUrl}
            size="md"
          />
        )}
        <p className="text-xs text-foreground/90 font-medium leading-relaxed flex-1">
          {curiosity.text}
        </p>
      </div>

      {curiosity.metric && (
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">
            Métrica registrada
          </span>
          <span className="font-mono text-xs font-bold text-primary">
            {curiosity.metric}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function RadarDaTemporada({
  jogadorDaSemana,
  weeklyCuriosity,
  smartAlerts,
}: RadarDaTemporadaProps) {
  const primaryAlert = smartAlerts[0] ?? null;

  const hasContent = jogadorDaSemana || weeklyCuriosity || primaryAlert;
  if (!hasContent) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {jogadorDaSemana && <DestaqueDaSemana info={jogadorDaSemana} />}
      {weeklyCuriosity && <CuriosidadeCard curiosity={weeklyCuriosity} />}
      {primaryAlert && <SmartAlertCard alert={primaryAlert} />}
    </div>
  );
}
