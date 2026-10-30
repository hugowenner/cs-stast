"use client";

import { useState } from "react";
import { Entregamos5v4Card } from "./entregamos-5v4-card";
import { TerrorDosAmigosCard } from "./terror-dos-amigos-card";
import { EconomiaDesastreCard } from "./economia-desastre-card";
import { MelhorDuplaCard } from "./melhor-dupla-card";
import { MatadorEcoCard } from "./matador-eco-card";
import { PlantouGanhouCard } from "./plantou-ganhou-card";
import { EspecialistaArmasCard } from "./especialista-armas-card";
import { ReiRoundsDecisivosCard } from "./rei-rounds-decisivos-card";
import { ParceirosCard } from "./parceiros-card";
import type { RaioXBundle } from "@/lib/raio-x-types";
import { RAIO_X_CARDS_CATALOG } from "@/lib/raio-x-types";
import { Layers, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RaioXSectionProps {
  bundle: RaioXBundle;
  seasonName?: string;
}

type RaioXFilter = "todos" | "combate" | "sinergia" | "tatica";

export function RaioXSection({ bundle, seasonName }: RaioXSectionProps) {
  const [filter, setFilter] = useState<RaioXFilter>("todos");

  const activeCardsCount = RAIO_X_CARDS_CATALOG.filter((c) => c.status === "active").length;
  const totalCardsCount = RAIO_X_CARDS_CATALOG.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtros Táticos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-panel border border-border/60 rounded-sm p-2 sm:p-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter("todos")}
            className={cn(
              "px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-micro shrink-0 flex items-center gap-1.5 cursor-pointer",
              filter === "todos"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground bg-surface-deck border border-border/30 hover:border-border/60",
            )}
          >
            <span>Todos os Módulos</span>
            <span className="text-[10px] opacity-80">(9)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("combate")}
            className={cn(
              "px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-micro shrink-0 flex items-center gap-1.5 cursor-pointer",
              filter === "combate"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground bg-surface-deck border border-border/30 hover:border-border/60",
            )}
          >
            <span>Combate</span>
            <span className="text-[10px] opacity-80">(4)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("sinergia")}
            className={cn(
              "px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-micro shrink-0 flex items-center gap-1.5 cursor-pointer",
              filter === "sinergia"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground bg-surface-deck border border-border/30 hover:border-border/60",
            )}
          >
            <span>Sinergia & Parceria</span>
            <span className="text-[10px] opacity-80">(2)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("tatica")}
            className={cn(
              "px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xs transition-micro shrink-0 flex items-center gap-1.5 cursor-pointer",
              filter === "tatica"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground bg-surface-deck border border-border/30 hover:border-border/60",
            )}
          >
            <span>Tática & Economia</span>
            <span className="text-[10px] opacity-80">(3)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/70 shrink-0 px-2 sm:px-0">
          <span className="flex items-center gap-1 text-status-good font-bold">
            <CheckCircle2 className="size-3" />
            <span>{activeCardsCount} Operacionais</span>
          </span>
          {totalCardsCount > activeCardsCount && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-status-warning font-bold">
                <Clock className="size-3" />
                <span>{totalCardsCount - activeCardsCount} Em Normalização</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Grid Principal dos 9 Módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* #01 — Entregamos o 5v4? (Combate) */}
        {(filter === "todos" || filter === "combate") && (
          <Entregamos5v4Card stats={bundle.entregamos5v4} seasonName={seasonName} />
        )}

        {/* #02 — Terror dos Amigos (Tática & Economia) */}
        {(filter === "todos" || filter === "tatica") && (
          <TerrorDosAmigosCard stats={bundle.terrorDosAmigos} />
        )}

        {/* #03 — Economia do Desastre (Tática & Economia) */}
        {(filter === "todos" || filter === "tatica") && (
          <EconomiaDesastreCard stats={bundle.economiaDesastre} />
        )}

        {/* #04 — Melhor Dupla da Zinda (Sinergia & Parceria) */}
        {(filter === "todos" || filter === "sinergia") && (
          <MelhorDuplaCard stats={bundle.melhorDupla} />
        )}

        {/* #05 — Matador de Eco (Combate) */}
        {(filter === "todos" || filter === "combate") && (
          <MatadorEcoCard stats={bundle.matadorEco} />
        )}

        {/* #06 — Plantou, Ganhou? (Tática & Economia) */}
        {(filter === "todos" || filter === "tatica") && (
          <PlantouGanhouCard stats={bundle.plantouGanhou} />
        )}

        {/* #07 — Especialista em Armas (Combate) */}
        {(filter === "todos" || filter === "combate") && (
          <EspecialistaArmasCard stats={bundle.especialistaArmas} />
        )}

        {/* #08 — Rei dos Rounds Decisivos (Combate) */}
        {(filter === "todos" || filter === "combate") && (
          <ReiRoundsDecisivosCard stats={bundle.reiRoundsDecisivos} />
        )}

        {/* #09 — Parceiros de Vitória e Derrota (Sinergia & Parceria) */}
        {(filter === "todos" || filter === "sinergia") && (
          <ParceirosCard rankings={bundle.parceiros} />
        )}
      </div>

      {/* Indicador de Rodapé */}
      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/50 px-1 pt-1">
        <span className="flex items-center gap-1.5">
          <Layers className="size-3 text-primary/70" />
          <span>
            {activeCardsCount} de {totalCardsCount} módulos operacionais no Raio-X com telemetria direta de demos
          </span>
        </span>
        <span className="hidden sm:inline">
          Diferenciação estrita entre zero observado e telemetria em normalização da fila durável
        </span>
      </div>
    </div>
  );
}
