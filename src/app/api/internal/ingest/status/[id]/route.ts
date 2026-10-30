import { getIngestQueue, receipt } from "@/server/ingest/queue";
import { ingestAuthorized, ingestEnabled } from "@/server/ingest/auth";
import { handleRouteError } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!ingestAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ingestEnabled()) return Response.json({ error: "Durable ingestion is not enabled" }, { status: 503 });
  const { id } = await context.params;
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)) return Response.json({ error: "Invalid receipt id" }, { status: 400 });
  try {
    const job = await getIngestQueue().status(id);
    return job ? Response.json(receipt(job), { headers: { "Cache-Control": "no-store", "Retry-After": "3" } })
      : Response.json({ error: "Receipt not found" }, { status: 404 });
  } catch (error) { return handleRouteError(error); }
}
