import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getCoachProvider } from "../providers/factory";
import { AIConfig } from "@/server/config/ai";
import type { CoachReportDTO } from "@/server/dtos/coachReport.dto";

// Função para canonizar o DTO e garantir que chaves ordenadas gerem a mesma string
function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return "{" + parts.join(",") + "}";
}

export function calculateCacheKey(dto: any): string {
  const canonical = stableStringify(dto);
  const dataToHash = `${canonical}|${AIConfig.provider}|${AIConfig.model}|${AIConfig.promptVersion}`;
  return crypto.createHash("sha256").update(dataToHash).digest("hex");
}

const CACHE_DIR = path.join(process.cwd(), "tmp", "coach-cache");

interface CacheEntry {
  expiresAt: number;
  report: CoachReportDTO;
}

function getFromCache(hash: string): CoachReportDTO | null {
  const filePath = path.join(CACHE_DIR, `${hash}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      // Expirou, apaga o arquivo
      fs.unlinkSync(filePath);
      return null;
    }
    return entry.report;
  } catch (err) {
    console.error("Falha ao ler cache do Coach IA:", err);
    return null;
  }
}

function saveToCache(hash: string, report: CoachReportDTO) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const filePath = path.join(CACHE_DIR, `${hash}.json`);
    const entry: CacheEntry = {
      expiresAt: Date.now() + AIConfig.cacheTtlMs,
      report,
    };
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), "utf-8");
  } catch (err) {
    console.error("Falha ao salvar cache do Coach IA:", err);
  }
}

// Ponteiro "última análise gerada por entidade" (player:id, match:id, session:id, compare:a:b).
// Separado do cache por hash de conteúdo: permite saber se JÁ existe uma análise para essa
// entidade mesmo depois que novas partidas mudam o hash (o que ela vira: desatualizada).
const POINTER_DIR = path.join(CACHE_DIR, "last");

interface PointerEntry {
  hash: string;
  generatedAt: string;
}

function getPointer(entityKey: string): PointerEntry | null {
  const filePath = path.join(POINTER_DIR, `${entityKey}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("Falha ao ler ponteiro do Coach IA:", err);
    return null;
  }
}

function savePointer(entityKey: string, hash: string, generatedAt: string) {
  try {
    fs.mkdirSync(POINTER_DIR, { recursive: true });
    const filePath = path.join(POINTER_DIR, `${entityKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ hash, generatedAt } satisfies PointerEntry, null, 2), "utf-8");
  } catch (err) {
    console.error("Falha ao salvar ponteiro do Coach IA:", err);
  }
}

export interface CoachReportStatus {
  status: "fresh" | "stale" | "none";
  report: CoachReportDTO | null;
  generatedAt: string | null;
}

/**
 * Verifica se já existe uma análise para a entidade, SEM chamar a IA.
 * "fresh" = existe e reflete os dados atuais. "stale" = existe mas os dados mudaram
 * desde a geração (ex.: novas partidas sincronizadas). "none" = nunca foi gerada.
 */
export function peekCoachReport(dto: any, entityKey: string): CoachReportStatus {
  const currentHash = calculateCacheKey(dto);
  const pointer = getPointer(entityKey);
  if (!pointer) return { status: "none", report: null, generatedAt: null };

  if (pointer.hash === currentHash) {
    const cached = getFromCache(currentHash);
    if (cached) return { status: "fresh", report: cached, generatedAt: pointer.generatedAt };
    return { status: "none", report: null, generatedAt: null };
  }

  const staleReport = getFromCache(pointer.hash);
  return staleReport
    ? { status: "stale", report: staleReport, generatedAt: pointer.generatedAt }
    : { status: "none", report: null, generatedAt: null };
}

export async function getCoachReport(
  dto: any,
  promptBuilder: (data: any) => string,
  entityKey: string
): Promise<CoachReportDTO> {
  const hash = calculateCacheKey(dto);

  // 1. Tentar ler do cache
  const cached = getFromCache(hash);
  if (cached) {
    console.log(`[Coach Cache Hit] Hash: ${hash}`);
    savePointer(entityKey, hash, cached.generatedAt);
    return {
      ...cached,
      processingTimeMs: 0, // Indica hit do cache
    };
  }

  console.log(`[Coach Cache Miss] Hash: ${hash}. Gerando prompt...`);

  // 2. Compilar o prompt
  const prompt = promptBuilder(dto);

  // 3. Invocar o modelo de IA
  const provider = getCoachProvider();
  const report = await provider.generate(prompt);

  // 4. Salvar no cache e atualizar o ponteiro da entidade
  saveToCache(hash, report);
  savePointer(entityKey, hash, report.generatedAt);

  return report;
}
