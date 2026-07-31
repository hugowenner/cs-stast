import { prisma } from "@/server/db";
import { requestWorkerSync, isWorkerConfigured } from "@/lib/sync-worker-client";

const BLOCKED_STATUSES = ["PENDING", "SENT_TO_WORKER", "PROCESSING", "COMPLETED"] as const;

/**
 * Tenta criar um SyncJob para a partida e enviá-lo ao Worker.
 * Idempotente: não cria se já existir job pendente/em-progresso/concluído.
 * Permite retry se o único job existente for FAILED.
 *
 * Não lança — falhas do Worker são salvas no job e não devem interromper a ingestão.
 */
export async function maybeEnqueueDemoAnalysis({
  sourceMatchId,
  downloadUrl,
}: {
  sourceMatchId: string;
  downloadUrl: string | null | undefined;
}): Promise<void> {
  console.log("[ENQUEUE] called", { sourceMatchId, downloadUrl, SYNC_WORKER_URL: process.env.SYNC_WORKER_URL });

  if (!downloadUrl || !downloadUrl.includes(".dem")) {
    console.log("[ENQUEUE] skip — demoUrl inválida:", downloadUrl);
    return;
  }

  // Normaliza: se vier só o filename (sem protocolo), monta a URL completa do CDN da GC
  const GC_DEMO_CDN = "https://demos.gamersclub.com.br/";
  if (!downloadUrl.startsWith("http://") && !downloadUrl.startsWith("https://")) {
    downloadUrl = `${GC_DEMO_CDN}${downloadUrl}`;
  }

  if (!isWorkerConfigured()) {
    console.log("[ENQUEUE] skip — SYNC_WORKER_URL não configurada");
    return;
  }

  // Idempotência: bloqueia se já existe job ativo ou concluído
  const existingJob = await prisma.syncJob.findFirst({
    where: {
      sourceMatchId,
      status: { in: [...BLOCKED_STATUSES] },
    },
    select: { id: true, status: true },
  });

  if (existingJob) {
    console.log("[ENQUEUE] skip — job já existe:", existingJob.id, existingJob.status);
    return;
  }

  const job = await prisma.syncJob.create({
    data: { sourceMatchId, source: "gamersclub", downloadUrl, status: "PENDING" },
  });
  console.log("[ENQUEUE] job criado:", job.id, "→", downloadUrl);

  try {
    await requestWorkerSync({ sourceMatchId, downloadUrl });
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "SENT_TO_WORKER", sentAt: new Date() },
    });
    console.log("[ENQUEUE] job enviado ao Worker:", job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message },
    });
    console.error("[ENQUEUE] Worker recusou job:", job.id, message);
  }
}
