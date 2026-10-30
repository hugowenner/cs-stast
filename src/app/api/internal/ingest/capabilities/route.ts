import { ingestAuthorized, ingestEnabled } from "@/server/ingest/auth";
import { getIngestQueue, NORMALIZER_VERSION } from "@/server/ingest/queue";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!ingestAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ingestEnabled()) return Response.json({ error: "Durable ingestion disabled" }, { status: 503 });
  try {
    await getIngestQueue().metrics();
    return Response.json({ protocolVersion: 2, normalizerVersion: NORMALIZER_VERSION,
      durableReceipts: true, finalConfirmationRequired: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Durable schema unavailable" }, { status: 503 }); }
}
