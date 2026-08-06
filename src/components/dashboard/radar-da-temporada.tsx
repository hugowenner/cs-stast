"use client";

import Link from "next/link";
import { Star, AlertTriangle, Sparkles, Map } from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type {
  JogadorDaSemanaInfo,
  WeeklyCuriosity,
  SmartAlert,
} from "@/server/services/competitive.service";
import { performanceNarratives } from "@/lib/narrator/templates";

interface RadarDaTemporadaProps {
  jogadorDaSemana: JogadorDaSemanaInfo | null;
  weeklyCuriosity: WeeklyCuriosity | null;
  smartAlerts: SmartAlert[];
}

function PriorityBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

// ─── Hero Card: Destaque da Semana ────────────────────────────────────────────
function DestaqueDaSemana({ info }: { info: JogadorDaSemanaInfo }) {
  return (
    <div className="glass-panel border border-accent-gold/20 bg-accent-gold/[0.02] rounded-2xl p-5 flex flex-col gap-3 md:col-span-2 lg:col-span-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-accent-gold shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-gold/80">🔥 Tá impossível parar</p>
        </div>
        <PriorityBadge label="⭐ Destaque" color="border-accent-gold/30 text-accent-gold bg-accent-gold/[0.04]" />
      </div>
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <PlayerAvatar nickname={info.player.nickname} avatarUrl={info.player.avatarUrl} size="lg" />
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/players/${info.player.id}`} className="text-lg font-black text-white hover:text-primary transition-colors block truncate">
            {info.player.nickname}
          </Link>
          <span className="text-[10px] text-status-good font-bold bg-status-good/10 px-2 py-0.5 rounded-full border border-status-good/15 inline-block mt-1">
            {info.evolutionText}
          </span>
        </div>
      </div>
      {/* Tagline narrativa do destaque */}
      <p className="text-[10px] text-muted-foreground/45 italic leading-relaxed">
        {performanceNarratives.positive[0].tagline}
      </p>
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.04]">
        <div className="text-center">
          <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">Rating</p>
          <p className="text-sm font-black text-white mt-0.5 tabular-nums">
            <AnimatedNumber value={info.rating} decimals={2} />
          </p>
        </div>
        <div className="text-center border-x border-white/[0.04]">
          <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">WR</p>
          <p className="text-sm font-black text-white mt-0.5 tabular-nums">
            <AnimatedNumber value={info.winrate} decimals={0} suffix="%" />
          </p>
        </div>
        <div className="text-center">
          <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">Evolução</p>
          <p className="text-sm font-black text-status-good mt-0.5 tabular-nums">
            +<AnimatedNumber value={Math.abs(info.evolution)} decimals={2} />
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Card: Smart Alert ────────────────────────────────────────────────────────
function SmartAlertCard({ alert }: { alert: SmartAlert }) {
  const positive = alert.severity === "positive";
  return (
    <div className={`glass-panel rounded-2xl p-4 flex flex-col gap-3 ${positive ? "border border-accent-cyan/15 bg-accent-cyan/[0.01]" : "border border-status-warning/15 bg-status-warning/[0.01]"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {positive ? <Map className="size-4 text-accent-cyan shrink-0" /> : <AlertTriangle className="size-4 text-status-warning shrink-0" />}
          <p className={`text-[10px] uppercase tracking-widest font-bold ${positive ? "text-accent-cyan/80" : "text-status-warning/80"}`}>
            {positive ? "📡 Sinal Positivo" : "⚠️ Sinal de Alerta"}
          </p>
        </div>
        <PriorityBadge
          label={positive ? "🟢 Bom" : "⚠️ Atenção"}
          color={positive ? "border-accent-cyan/30 text-accent-cyan bg-accent-cyan/[0.04]" : "border-status-warning/30 text-status-warning bg-status-warning/[0.04]"}
        />
      </div>
      <div className="flex items-start gap-3 min-h-[44px]">
        {alert.player && <PlayerAvatar nickname={alert.player.nickname} avatarUrl={alert.player.avatarUrl} size="md" />}
        <p className="text-xs font-semibold text-white/80 leading-relaxed">{alert.text}</p>
      </div>
    </div>
  );
}

// ─── Card: Curiosidade da Semana ──────────────────────────────────────────────
function CuriosidadeCard({ curiosity }: { curiosity: WeeklyCuriosity }) {
  return (
    <div className="glass-panel border border-accent-purple/15 bg-accent-purple/[0.01] rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent-purple shrink-0" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-purple/80">🧠 Estatística que ninguém pediu</p>
        </div>
        <PriorityBadge label="🟡 Tendência" color="border-accent-purple/30 text-accent-purple bg-accent-purple/[0.04]" />
      </div>
      <div className="flex items-start gap-3 min-h-[44px]">
        {curiosity.player && <PlayerAvatar nickname={curiosity.player.nickname} avatarUrl={curiosity.player.avatarUrl} size="md" />}
        <p className="text-xs font-semibold text-white/80 leading-relaxed flex-1">{curiosity.text}</p>
      </div>
      {curiosity.metric && (
        <div className="flex items-center justify-between pt-2 border-t border-accent-purple/10">
          <span className="text-[9px] text-muted-foreground/55 font-semibold uppercase tracking-wider">Métrica</span>
          <span className="text-xs font-black text-accent-purple">{curiosity.metric}</span>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {jogadorDaSemana && <DestaqueDaSemana info={jogadorDaSemana} />}
      {weeklyCuriosity && <CuriosidadeCard curiosity={weeklyCuriosity} />}
      {primaryAlert && <SmartAlertCard alert={primaryAlert} />}
    </div>
  );
}
