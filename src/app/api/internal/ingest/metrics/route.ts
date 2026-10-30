import { getIngestQueue } from "@/server/ingest/queue";
import { ingestAuthorized, ingestEnabled } from "@/server/ingest/auth";
import { handleRouteError } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!ingestAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ingestEnabled()) return Response.json({ error: "Durable ingestion is not enabled" }, { status: 503 });
  try { return Response.json({ queue: await getIngestQueue().metrics() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return handleRouteError(error); }
}
