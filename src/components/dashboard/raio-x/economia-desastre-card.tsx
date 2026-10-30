"use client";

import { ShoppingCart, Info } from "lucide-react";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { RaioXCardFrame } from "./raio-x-card-frame";
import type { EconomiaDesastreStats } from "@/lib/raio-x-types";

interface EconomiaDesastreCardProps {
  stats: EconomiaDesastreStats;
}

export function EconomiaDesastreCard({ stats }: EconomiaDesastreCardProps) {
  const {
    hasTelemetry,
    fullBuyWinrate,
    forceBuyWinrate,
    fullEcoWinrate,
    estimatedEquipmentLostValue,
    telemetryUnavailableReason,
  } = stats;

  return (
    <RaioXCardFrame
      moduleNumber="#03"
      title="Economia do Desastre"
      description="Desempenho em forçados, eficiência econômica e conversão quando o saldo financeiro está comprometido."
      icon={ShoppingCart}
      iconClass="bg-status-warning/10 text-status-warning border-status-warning/20"
      categoryBadge={<TacticalBadge label="ECONOMIA" variant="neutral" size="xs" />}
      statusBadge={
        hasTelemetry ? (
          <TacticalBadge label="OPERACIONAL" variant="good" size="xs" />
        ) : (
          <TacticalBadge label="EM NORMALIZAÇÃO" variant="warning" size="xs" />
        )
      }
      headerAction={
        <span className="text-[9px] font-mono text-status-warning uppercase font-bold px-1.5 py-0.5 bg-status-warning/10 rounded-xs border border-status-warning/20">
          {hasTelemetry ? "Ativo" : "Fila Durável"}
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center gap-1">
            <Info className="size-2.5" />
            Classificação oficial de compra econômica por round
          </span>
          <span>Requer normalização do CS2 Sync Worker</span>
        </div>
      }
    >
      {!hasTelemetry ? (
        <div className="flex flex-col gap-3 my-auto">
          {/* Card de Status da Normalização */}
          <div className="p-3 bg-surface-deck border border-dashed border-status-warning/30 rounded-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-status-warning/80 shrink-0" />
              <span className="text-xs font-mono font-bold text-foreground uppercase tracking-tight">
                Aguardando Projeção Normalizada de Economia
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground/75 leading-relaxed">
              {telemetryUnavailableReason ??
                "A extração de cash_spent, equipment_value e classificação de compras forçadas já está armazenada nos payloads do banco DEV e aguarda persistência relacional do CS2 Sync Worker."}
            </p>
          </div>

          {/* Grid de Tipos de Compra Planejados */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                Eco Rounds
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                Pistolas / Zero gasto
              </span>
              <span className="text-[8px] font-mono text-muted-foreground/30 mt-0.5 block">
                Preservação de cash
              </span>
            </div>
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                Force Buy
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                Investimento de risco
              </span>
              <span className="text-[8px] font-mono text-muted-foreground/30 mt-0.5 block">
                Winrate de risco
              </span>
            </div>
            <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs text-center">
              <span className="text-[8px] font-mono uppercase text-muted-foreground/60 block">
                Full Buy
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground/40 mt-0.5 block">
                Rifles + Kits + Utilitários
              </span>
              <span className="text-[8px] font-mono text-muted-foreground/30 mt-0.5 block">
                Conversão esperada
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-surface-deck border border-border/40 rounded-xs">
              <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block">
                Full Buy
              </span>
              <span className="font-mono text-xl font-black text-status-good tabular-nums block mt-1">
                {fullBuyWinrate}%
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                winrate esperado
              </span>
            </div>

            <div className="p-3 bg-surface-deck border border-border/40 rounded-xs">
              <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block">
                Force Buy
              </span>
              <span className="font-mono text-xl font-black text-status-warning tabular-nums block mt-1">
                {forceBuyWinrate}%
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                eficiência do risco
              </span>
            </div>

            <div className="p-3 bg-surface-deck border border-border/40 rounded-xs">
              <span className="text-[9px] font-mono text-muted-foreground/60 uppercase block">
                Eco / Pobre
              </span>
              <span className="font-mono text-xl font-black text-muted-foreground tabular-nums block mt-1">
                {fullEcoWinrate !== null ? `${fullEcoWinrate}%` : "—"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                conversão milagrosa
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-surface-deck/40 border border-border/30 rounded-xs flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground/70">Equipamento Perdido em Forçados:</span>
            <span className="font-bold text-status-danger tabular-nums">
              {estimatedEquipmentLostValue !== null ? `$${estimatedEquipmentLostValue.toLocaleString()}` : "—"}
            </span>
          </div>
        </div>
      )}
    </RaioXCardFrame>
  );
}
