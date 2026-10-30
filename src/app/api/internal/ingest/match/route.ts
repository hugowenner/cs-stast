import { z } from "zod";
import { getIngestQueue, type IngestBody } from "@/server/ingest/queue";
import { ingestAuthorized, ingestEnabled } from "@/server/ingest/auth";
import { handleRouteError, HttpError } from "@/server/http";

const envelope = z.object({ schema_version: z.string().regex(/^1\./), parser_version: z.string().min(1),
  match: z.object({ id: z.string().min(1) }).passthrough(),
  players: z.array(z.unknown()).min(1), rounds: z.array(z.unknown()), kills: z.array(z.unknown()),
}).passthrough();
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!ingestAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ingestEnabled()) return Response.json({ error: "Durable ingestion is not enabled" }, { status: 503 });
  try {
    const source = request.headers.get("x-match-source");
    const matchId = request.headers.get("x-match-source-id");
    if (source !== "gamersclub" || !matchId || !/^\d{1,30}$/.test(matchId)) throw new HttpError(422, "Invalid match source headers");
    const max = 50 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > max) throw new HttpError(413, "Payload exceeds 50 MiB");
    const chunks: Uint8Array[] = []; let length = 0;
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, "Missing JSON body");
    try {
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        length += value.byteLength;
        if (length > max) { await reader.cancel(); throw new HttpError(413, "Payload exceeds 50 MiB"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = Buffer.concat(chunks);
    let body: unknown;
    try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new HttpError(400, "Invalid UTF-8 JSON"); }
    if (!envelope.safeParse(body).success) throw new HttpError(422, "Invalid v1 parser envelope");
    const result = await getIngestQueue().accept(source, matchId, body as IngestBody, bytes);
    return Response.json(result, { status: ["COMPLETED", "FAILED", "SUPERSEDED"].includes(result.state) ? 200 : 202,
      headers: { "Cache-Control": "no-store", "Location": result.statusUrl, "Retry-After": "3" } });
  } catch (error) { return handleRouteError(error); }
}
