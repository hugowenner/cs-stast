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

export async function getCoachReport(
  dto: any,
  promptBuilder: (data: any) => string
): Promise<CoachReportDTO> {
  const hash = calculateCacheKey(dto);

  // 1. Tentar ler do cache
  const cached = getFromCache(hash);
  if (cached) {
    console.log(`[Coach Cache Hit] Hash: ${hash}`);
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

  // 4. Salvar no cache
  saveToCache(hash, report);

  return report;
}
