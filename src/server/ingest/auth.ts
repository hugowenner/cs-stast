import { timingSafeEqualStrings } from "@/lib/sync-auth";

export function ingestAuthorized(request: Request) {
  const token = process.env.SYNC_SERVICE_TOKEN || process.env.WORKER_INGEST_TOKEN || process.env.ADMIN_SYNC_TOKEN;
  const auth = request.headers.get("authorization");
  return Boolean(token && auth?.startsWith("Bearer ") && timingSafeEqualStrings(auth.slice(7).trim(), token));
}
export const ingestEnabled = () => process.env.DURABLE_INGEST_ENABLED === "1";
