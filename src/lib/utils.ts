import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mapeamento canônico explícito dos mapas oficiais do CS2 e CS:GO.
 * Garante padronização rigorosa de casing, siglas e variações com/sem prefixos engine (de_, cs_).
 */
const CANONICAL_MAP_NAMES: Record<string, string> = {
  // Mapas Ativos e Reservas do CS2
  mirage: "Mirage",
  inferno: "Inferno",
  dust2: "Dust2",
  "dust 2": "Dust2",
  dust_2: "Dust2",
  nuke: "Nuke",
  overpass: "Overpass",
  ancient: "Ancient",
  anubis: "Anubis",
  vertigo: "Vertigo",
  train: "Train",
  cache: "Cache",
  cobblestone: "Cobblestone",
  cbble: "Cobblestone",
  tuscan: "Tuscan",
  office: "Office",
  italy: "Italy",
  // Mapas Comunitários Recentes / Armory
  thera: "Thera",
  mills: "Mills",
  edin: "Edin",
  basalt: "Basalt",
  palais: "Palais",
  whistle: "Whistle",
  agency: "Agency",
  militia: "Militia",
  assault: "Assault",
  canals: "Canals",
};

/**
 * Padroniza os nomes dos mapas apresentados ao usuário no CS2 Stats.
 *
 * Exemplos:
 * - 'cache', 'Cache', 'de_cache' -> 'Cache'
 * - 'inferno', 'de_inferno' -> 'Inferno'
 * - 'dust2', 'Dust2', 'de_dust2', 'dust 2', 'Dust 2' -> 'Dust2'
 * - 'overpass', 'de_overpass' -> 'Overpass'
 * - null, undefined, '', '   ', '—', '-' -> 'Mapa não informado'
 * - Nomes desconhecidos (ex: workshop, mapas novos) mantêm-se identificáveis sem prefixos de engine.
 */
export function cleanMapName(name?: string | null): string {
  if (!name || typeof name !== "string") {
    return "Mapa não informado";
  }

  const trimmed = name.trim();
  if (
    trimmed === "" ||
    trimmed === "—" ||
    trimmed === "-" ||
    trimmed.toLowerCase() === "desconhecido"
  ) {
    return "Mapa não informado";
  }

  // Normaliza chave de busca removendo prefixos de engine (de_, cs_)
  const strippedPrefix = trimmed.replace(/^(de|cs)_/i, "").trim();
  const lowerKey = strippedPrefix.toLowerCase();

  // 1. Busca direta no dicionário canônico
  if (CANONICAL_MAP_NAMES[lowerKey]) {
    return CANONICAL_MAP_NAMES[lowerKey];
  }

  // 2. Busca alternativa normalizando traços e underscores como espaços (ex: "dust-2" -> "dust 2")
  const normalizedSpaces = lowerKey.replace(/[_-]+/g, " ").trim();
  if (CANONICAL_MAP_NAMES[normalizedSpaces]) {
    return CANONICAL_MAP_NAMES[normalizedSpaces];
  }

  // 3. Fallback seguro para nomes desconhecidos (continua identificável sem ser descartado)
  if (strippedPrefix.length === 0) {
    return "Mapa não informado";
  }

  // Capitaliza as palavras mantendo a integridade do nome original
  return strippedPrefix
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

