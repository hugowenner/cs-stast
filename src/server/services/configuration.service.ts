import * as configRepo from "@/server/repositories/configuration.repository";
import { DEFAULT_K_FACTOR } from "@/server/domain/elo";
import type { Prisma } from "@/generated/prisma";

const ELO_K_FACTOR_KEY = "ELO_K_FACTOR";

export async function getEloKFactor(): Promise<number> {
  const row = await configRepo.getConfigValue(ELO_K_FACTOR_KEY);
  if (row && typeof row.value === "number") return row.value;
  return DEFAULT_K_FACTOR;
}

export function listConfig() {
  return configRepo.listConfigValues();
}

export function setConfig(key: string, value: Prisma.InputJsonValue) {
  return configRepo.setConfigValue(key, value);
}
