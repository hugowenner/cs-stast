export type RNG = () => number;

/**
 * Cria um gerador de números aleatórios determinístico usando Mulberry32.
 * Mesma seed = mesmo resultado.
 */
export function mulberry32(seed: number): RNG {
  return function(): number {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Gera uma seed aleatória numérica única.
 */
export function generateSeed(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return String((timestamp * 1000 + random) % 4294967296);
}

/**
 * Converte string ou número para número de seed válido entre 0 e 4294967295.
 */
export function parseSeed(seedStr: string): number {
  let hash = 0;
  
  if (seedStr.length === 0) return hash;
  
  if (/^\d+$/.test(seedStr)) {
    const num = parseInt(seedStr, 10);
    return Math.abs(num) % 4294967296;
  }
  
  for (let i = 0; i < seedStr.length; i++) {
    const char = seedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converte para inteiro de 32 bits
  }
  
  return Math.abs(hash);
}

/**
 * Gera número inteiro aleatório entre min e max usando o RNG determinístico.
 */
export function randomInt(rng: RNG, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
