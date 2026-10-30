import { getIngestQueue, receipt } from "@/server/ingest/queue";
import { ingestAuthorized, ingestEnabled } from "@/server/ingest/auth";
import { handleRouteError } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!ingestAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ingestEnabled()) return Response.json({ error: "Durable ingestion is not enabled" }, { status: 503 });
  const p = new URL(request.url).searchParams;
  const source = p.get("source"), id = p.get("sourceMatchId"), hash = p.get("payloadHash");
  if (source !== "gamersclub" || !id || !/^\d{1,30}$/.test(id) || !hash || !/^[a-f0-9]{64}$/.test(hash)) return Response.json({ error: "Invalid lookup" }, { status: 400 });
  try {
    const job = await getIngestQueue().lookup(source, id, hash);
    return job ? Response.json(receipt(job), { headers: { "Cache-Control": "no-store" } })
      : Response.json({ error: "Receipt not found" }, { status: 404 });
  } catch (error) { return handleRouteError(error); }
}
