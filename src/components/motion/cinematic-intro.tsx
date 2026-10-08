"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Activity } from "lucide-react";

const STORAGE_KEY = "cs2_cinematic_intro_seen_v1";
const VIDEO_SRC = "/arma/video_gun.mp4";

export function CinematicIntro({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();
  
  // Inicia ativo por padrão no SSR/Primeiro Paint para cobrir a tela desde 0ms
  const [isIntroActive, setIsIntroActive] = useState<boolean>(true);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const completeIntro = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignora erro se o elemento já estiver pausado ou desmontado
      }
    }
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // Fallback caso cookies/storage estejam restritos
      }
    }
    setIsIntroActive(false);
  }, []);

  // 1. Verificação de sessão (client-side) e atalho de teclado ESC
  useEffect(() => {
    if (prefersReduced) {
      completeIntro();
      return;
    }

    // Se o usuário já assistiu na sessão atual, encerra imediatamente sem piscar a tela
    if (typeof window !== "undefined") {
      try {
        const seen = sessionStorage.getItem(STORAGE_KEY);
        if (seen === "true") {
          setIsIntroActive(false);
          return;
        }
      } catch {
        // fallback
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        completeIntro();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Timeout de segurança: caso o vídeo demore ou falhe ao disparar onEnded
    timeoutRef.current = setTimeout(() => {
      completeIntro();
    }, 25000); // 25 segundos de teto máximo

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [prefersReduced, completeIntro]);

  // 2. Garantir reprodução automática com autoplay resiliente
  useEffect(() => {
    if (!isIntroActive || prefersReduced) return;

    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current
        .play()
        .then(() => {
          console.log("[CinematicIntro] Vídeo iniciado com sucesso.");
        })
        .catch((err) => {
          console.warn("[CinematicIntro] Autoplay bloqueado ou falhou:", err);
          // Se o autoplay falhar completamente, finaliza suavemente sem travar o usuário
          completeIntro();
        });
    }
  }, [isIntroActive, prefersReduced, completeIntro]);

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setIsVideoLoaded(true);
      console.log(`[CinematicIntro] Duração do vídeo detectada: ${duration.toFixed(2)}s`);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoEnded = () => {
    console.log("[CinematicIntro] Vídeo finalizado (onEnded). Transicionando para a interface.");
    completeIntro();
  };

  const handleVideoError = () => {
    console.error("[CinematicIntro] Erro ao carregar ou reproduzir video_gun.mp4.");
    completeIntro();
  };

  const progressPercent = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  return (
    <>
      <AnimatePresence mode="wait">
        {isIntroActive && (
          <motion.div
            key="cinematic-video-intro-overlay"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              filter: "blur(8px)",
              transition: { duration: 0.6, ease: "easeInOut" },
            }}
            className="fixed inset-0 z-[9999] h-screen h-[100dvh] w-screen w-[100dvw] overflow-hidden bg-[#070709] text-foreground select-none flex flex-col justify-between"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }}
          >
            {/* ── Texturas Táticas de Fundo ── */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/[0.05] via-transparent to-black/95 pointer-events-none" />
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />

            {/* ── Top Bar: Identidade + Botão Pular com Safe Area e Touch Target Adequado ── */}
            <div className="relative z-20 flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-4 border-b border-border/20 bg-surface-deck/40 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="size-6 sm:size-7 rounded-xs bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="font-mono text-[9px] sm:text-[10px] font-black text-primary">CS2</span>
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider sm:tracking-widest text-foreground uppercase truncate">
                    CS2 STATS <span className="text-muted-foreground/60">//</span> INTRO
                  </span>
                  <span className="font-mono text-[8px] sm:text-[9px] text-muted-foreground/70 tracking-wider uppercase truncate">
                    INTELLIGENCE ENGINE
                  </span>
                </div>
              </div>

              {/* Botão Pular com área de toque mínima de 44px para mobile */}
              <button
                onClick={completeIntro}
                className="group flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] min-w-[44px] px-3.5 py-2 sm:min-h-0 sm:py-1.5 sm:px-3 rounded-xs bg-surface-panel/90 active:bg-primary/20 hover:bg-surface-elevated border border-border/50 hover:border-primary/40 text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-wider uppercase transition-all cursor-pointer shadow-sm touch-manipulation"
                title="Pular abertura cinematográfica (ESC)"
                aria-label="Pular abertura"
              >
                <span className="font-semibold text-foreground group-hover:text-primary">Pular</span>
                <span className="hidden sm:inline-flex text-[9px] px-1.5 py-0.5 rounded-xs bg-surface-deck border border-border/40 text-muted-foreground group-hover:text-primary">
                  ESC
                </span>
              </button>
            </div>

            {/* ── Centro: Reprodutor de Vídeo Responsivo (Contain, sem distorção nem scroll) ── */}
            <div className="relative z-10 flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 md:p-6 max-w-5xl mx-auto">
              <div className="relative w-full max-h-full aspect-[16/9] rounded-sm overflow-hidden flex items-center justify-center bg-black/80 shadow-2xl border border-border/20">
                <video
                  ref={videoRef}
                  src={VIDEO_SRC}
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onLoadedMetadata={handleMetadataLoaded}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  onError={handleVideoError}
                  className="w-full h-full object-contain max-h-full max-w-full drop-shadow-[0_12px_40px_rgba(0,0,0,0.9)]"
                />

                {/* Framing Tático Sutil nos 4 cantos */}
                <div className="absolute inset-0 border border-border/30 rounded-sm pointer-events-none z-30" />
                <div className="absolute top-1.5 left-1.5 size-2 sm:size-2.5 border-t-2 border-l-2 border-primary/60 pointer-events-none z-30" />
                <div className="absolute top-1.5 right-1.5 size-2 sm:size-2.5 border-t-2 border-r-2 border-primary/60 pointer-events-none z-30" />
                <div className="absolute bottom-1.5 left-1.5 size-2 sm:size-2.5 border-b-2 border-l-2 border-primary/60 pointer-events-none z-30" />
                <div className="absolute bottom-1.5 right-1.5 size-2 sm:size-2.5 border-b-2 border-r-2 border-primary/60 pointer-events-none z-30" />
              </div>
            </div>

            {/* ── Bottom Bar: Telemetria & Progresso em Tempo Real (Compacto em landscape/mobile) ── */}
            <div className="relative z-20 px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-t border-border/20 bg-surface-deck/50 backdrop-blur-md flex flex-col gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="size-6 sm:size-7 rounded-xs bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                    <Activity className="size-3.5 sm:size-4 text-primary animate-pulse" />
                  </div>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] sm:text-[10px] font-bold text-primary tracking-wider sm:tracking-widest uppercase truncate">
                        RECONSTRUÇÃO TÁTICA
                      </span>
                      {videoDuration > 0 && (
                        <span className="font-mono text-[8px] sm:text-[9px] text-muted-foreground/60 tabular-nums">
                          {currentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <span className="hidden xs:inline text-[11px] sm:text-xs font-bold text-foreground uppercase tracking-tight truncate mt-0.5">
                      PROCESSAMENTO DE TELEMETRIA
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 font-mono text-[9px] sm:text-[10px] text-muted-foreground/70">
                  <span className="size-1.5 rounded-full bg-primary animate-ping" />
                  <span className="hidden sm:inline">PROCESSANDO</span>
                  <span className="sm:hidden">ATIVO</span>
                </div>
              </div>

              {/* Barra Contínua de Progresso do Vídeo */}
              <div className="h-1 bg-surface-panel rounded-none overflow-hidden max-w-5xl mx-auto w-full relative">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full bg-primary transition-[width] duration-150 ease-linear shadow-[0_0_8px_rgba(235,94,40,0.8)]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interface Principal do CS2 Stats — coberta pelo overlay z-[9999] até o término */}
      <div
        className="min-h-screen w-full"
        aria-hidden={isIntroActive}
      >
        {children}
      </div>
    </>
  );
}
