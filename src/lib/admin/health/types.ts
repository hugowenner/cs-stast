export type HealthStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "DOWN"
  | "UNKNOWN"
  | "NOT_CONFIGURED";

export interface ServiceHealth {
  status: HealthStatus;
  latencyMs?: number;
  detail?: string;
}

export interface SyncStats {
  totalImports: number;
  successImports: number;
  failedImports: number;
  successRate: number;
  latestSync: Date | null;
  todayAttempts: number;
  todaySuccess: number;
  todayFailed: number;
}

export interface DatabaseHealth extends ServiceHealth {
  sizeLabel: string;
  version?: string;
}

export interface IntegrationHealth extends ServiceHealth {
  configured: boolean;
  reason?: string;
}
