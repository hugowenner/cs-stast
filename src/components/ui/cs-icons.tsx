/**
 * CS2 Stats Hub — Icon Library
 * Traço uniforme: stroke 1.5, viewBox 0 0 16 16, arredondado.
 * Sem emojis. Cada ícone representa um conceito do CS2.
 */

import { cn } from "@/lib/utils";

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const base = (size: number, strokeWidth: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
});

// MVP — coroa simples
export function IconMVP({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M2 11 L4 5 L8 9 L12 5 L14 11 Z" />
      <line x1="2" y1="11" x2="14" y2="11" />
      <line x1="2" y1="13" x2="14" y2="13" />
    </svg>
  );
}

// ACE — cinco estrelas em cruz
export function IconACE({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="3.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ENTRY — seta bold entrando por uma porta
export function IconEntry({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M6 3 L13 8 L6 13" />
      <line x1="3" y1="8" x2="13" y2="8" />
      <line x1="3" y1="3" x2="3" y2="13" />
    </svg>
  );
}

// CLUTCH — escudo dividido (tensão)
export function IconClutch({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M8 2 L13 4.5 L13 9 C13 12 8 14 8 14 C8 14 3 12 3 9 L3 4.5 Z" />
      <line x1="8" y1="2" x2="8" y2="14" />
    </svg>
  );
}

// IMPACT — raio / lightning
export function IconImpact({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M9.5 2 L5 8.5 L8 8.5 L6.5 14 L12 7 L9 7 Z" />
    </svg>
  );
}

// SUPPORT — duas mãos / aperto
export function IconSupport({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M3 6 C3 5 4 4 5 5 L8 8" />
      <path d="M13 6 C13 5 12 4 11 5 L8 8" />
      <path d="M5 5 L5 10 C5 11.5 6.5 13 8 13 C9.5 13 11 11.5 11 10 L11 5" />
    </svg>
  );
}

// IGL — bússola / mapa
export function IconIGL({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="2" x2="8" y2="14" strokeWidth={0.8} />
      <line x1="2" y1="8" x2="14" y2="8" strokeWidth={0.8} />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <path d="M8 2 L9.5 5 L8 4 L6.5 5 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// LURKER — sombra / olho lateral
export function IconLurker({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M1 8 C3 4 6 2 8 2 C10 2 13 4 15 8" />
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// SNIPER — mira telescópica
export function IconSniper({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <circle cx="8" cy="8" r="5.5" />
      <line x1="8" y1="2.5" x2="8" y2="5.5" />
      <line x1="8" y1="10.5" x2="8" y2="13.5" />
      <line x1="2.5" y1="8" x2="5.5" y2="8" />
      <line x1="10.5" y1="8" x2="13.5" y2="8" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// TRADE — duas setas em ciclo
export function IconTrade({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M3 5 L13 5" />
      <path d="M10 3 L13 5 L10 7" />
      <path d="M13 11 L3 11" />
      <path d="M6 9 L3 11 L6 13" />
    </svg>
  );
}

// RATING — barra vertical com tendência
export function IconRating({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <rect x="2" y="9" width="3" height="5" rx="0.5" />
      <rect x="6.5" y="6" width="3" height="8" rx="0.5" />
      <rect x="11" y="3" width="3" height="11" rx="0.5" />
      <path d="M3.5 8 L8 5 L12.5 2.5" strokeWidth={1.2} />
    </svg>
  );
}

// ADR — explosão / onda de dano
export function IconADR({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 2 L8 4" />
      <path d="M8 12 L8 14" />
      <path d="M2 8 L4 8" />
      <path d="M12 8 L14 8" />
      <path d="M3.9 3.9 L5.3 5.3" />
      <path d="M10.7 10.7 L12.1 12.1" />
      <path d="M12.1 3.9 L10.7 5.3" />
      <path d="M5.3 10.7 L3.9 12.1" />
    </svg>
  );
}

// HEADSHOT — alvo na cabeça / crosshair alto
export function IconHeadshot({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <circle cx="8" cy="5" r="3" />
      <line x1="8" y1="1.5" x2="8" y2="3.5" />
      <line x1="4" y1="5" x2="6" y2="5" />
      <line x1="10" y1="5" x2="12" y2="5" />
      <circle cx="8" cy="5" r="1" fill="currentColor" stroke="none" />
      <path d="M6 8 L6 14 L10 14 L10 8" strokeWidth={1.2} />
    </svg>
  );
}

// FORM — linha de tendência suave
export function IconForm({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M2 12 L5 9 L7 11 L10 6 L14 4" />
      <circle cx="14" cy="4" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// HOT — chama minimalista
export function IconHot({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M8 14 C4 14 3 11 5 8.5 C5.5 7.5 5 6 4 5 C6 5.5 6.5 7 6.5 7 C7 5.5 7.5 3 6 2 C9 3 11 6 9.5 9 C10.5 8.5 11 7.5 11 6.5 C12.5 8 13 10 12 12 C11 13.5 9.5 14 8 14 Z" />
    </svg>
  );
}

// COLD — floco de neve
export function IconCold({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="3.9" y1="3.9" x2="12.1" y2="12.1" />
      <line x1="12.1" y1="3.9" x2="3.9" y2="12.1" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 4K — quatro pontos em quadrado
export function Icon4K({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <circle cx="4.5" cy="4.5" r="1.8" />
      <circle cx="11.5" cy="4.5" r="1.8" />
      <circle cx="4.5" cy="11.5" r="1.8" />
      <circle cx="11.5" cy="11.5" r="1.8" />
      <line x1="4.5" y1="4.5" x2="11.5" y2="4.5" strokeWidth={0.8} />
      <line x1="4.5" y1="4.5" x2="4.5" y2="11.5" strokeWidth={0.8} />
      <line x1="11.5" y1="4.5" x2="11.5" y2="11.5" strokeWidth={0.8} />
      <line x1="4.5" y1="11.5" x2="11.5" y2="11.5" strokeWidth={0.8} />
    </svg>
  );
}

// 3K — três pontos em triângulo
export function Icon3K({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <circle cx="8" cy="3.5" r="1.8" />
      <circle cx="4" cy="11" r="1.8" />
      <circle cx="12" cy="11" r="1.8" />
      <line x1="8" y1="3.5" x2="4" y2="11" strokeWidth={0.8} />
      <line x1="8" y1="3.5" x2="12" y2="11" strokeWidth={0.8} />
      <line x1="4" y1="11" x2="12" y2="11" strokeWidth={0.8} />
    </svg>
  );
}

// CONSISTENT — linha reta estável
export function IconConsistent({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M2 8 L14 8" />
      <path d="M2 5 L14 5" strokeWidth={0.7} className="opacity-40" />
      <path d="M2 11 L14 11" strokeWidth={0.7} className="opacity-40" />
      <circle cx="4" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// PLAYOFF — troféu simplificado
export function IconPlayoff({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M5 2 L11 2 L11 8 C11 11 9.5 13 8 13 C6.5 13 5 11 5 8 Z" />
      <line x1="8" y1="13" x2="8" y2="14.5" />
      <line x1="5" y1="14.5" x2="11" y2="14.5" />
      <path d="M5 4 L3 4 C3 7 4 9 5 9" />
      <path d="M11 4 L13 4 C13 7 12 9 11 9" />
    </svg>
  );
}

// LEVEL UP — seta para cima com degraus
export function IconLevelUp({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M8 2 L8 11" />
      <path d="M5 5 L8 2 L11 5" />
      <path d="M4 11 L8 11 L8 13 L12 13" />
    </svg>
  );
}

// Mapa: Mirage — linhas geométricas de arquitetura árabe
export function IconMapMirage({ size = 16, strokeWidth = 1, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M1 13 L4 5 L8 3 L12 5 L15 13" />
      <path d="M4 13 L4 8 L8 6 L12 8 L12 13" />
      <path d="M6 13 L6 10 L10 10 L10 13" />
    </svg>
  );
}

// Mapa: Nuke — silo industrial / cilindros
export function IconMapNuke({ size = 16, strokeWidth = 1, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <rect x="3" y="5" width="4" height="9" rx="2" />
      <rect x="9" y="3" width="4" height="11" rx="2" />
      <line x1="5" y1="5" x2="5" y2="2" />
      <line x1="11" y1="3" x2="11" y2="1" />
    </svg>
  );
}

// Ícone genérico de mapa (fallback)
export function IconMap({ size = 16, strokeWidth = 1.5, className }: IconProps) {
  return (
    <svg {...base(size, strokeWidth, className)}>
      <path d="M1 3 L5 1 L11 3.5 L15 1.5 L15 13 L11 14.5 L5 12 L1 13 Z" />
      <line x1="5" y1="1" x2="5" y2="12" strokeWidth={0.8} />
      <line x1="11" y1="3.5" x2="11" y2="14.5" strokeWidth={0.8} />
    </svg>
  );
}
