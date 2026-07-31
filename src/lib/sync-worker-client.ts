const WORKER_URL = process.env.SYNC_WORKER_URL;

export interface SyncRequest {
  sourceMatchId: string;
  downloadUrl: string;
  source?: string;
}

export interface SyncResponse {
  status: string;
  source: string;
  sourceMatchId: string;
}

export async function requestWorkerSync(req: SyncRequest): Promise<SyncResponse> {
  if (!WORKER_URL) {
    throw new Error("SYNC_WORKER_URL não configurada. Adicione ao .env.");
  }

  const res = await fetch(`${WORKER_URL}/api/sync/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: req.source ?? "gamersclub",
      sourceMatchId: req.sourceMatchId,
      downloadUrl: req.downloadUrl,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Worker respondeu ${res.status}: ${text}`);
  }

  return res.json() as Promise<SyncResponse>;
}

export function isWorkerConfigured(): boolean {
  return Boolean(WORKER_URL);
}
