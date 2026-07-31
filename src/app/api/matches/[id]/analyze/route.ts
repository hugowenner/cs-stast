import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { handleRouteError } from "@/server/http";
import { requestWorkerSync, isWorkerConfigured } from "@/lib/sync-worker-client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Optional body: { downloadUrl?: string } overrides the stored demoUrl.
    // Useful when demoUrl in DB is just the GC match ID rather than a real URL,
    // or when the caller wants to point to a specific CDN link.
    let bodyDownloadUrl: string | undefined;
    try {
      const body = await request.json();
      if (typeof body?.downloadUrl === "string" && body.downloadUrl.trim()) {
        bodyDownloadUrl = body.downloadUrl.trim();
      }
    } catch {
      // empty or non-JSON body is fine — downloadUrl remains undefined
    }

    const match = await prisma.match.findUnique({
      where: { id },
      select: { id: true, gamersClubMatchId: true, demoUrl: true },
    });

    if (!match) {
      return NextResponse.json({ error: "Partida não encontrada." }, { status: 404 });
    }

    if (!match.gamersClubMatchId) {
      return NextResponse.json(
        { error: "Esta partida não possui ID da Gamers Club." },
        { status: 422 },
      );
    }

    // Resolve effective downloadUrl:
    // 1. Explicit body.downloadUrl (caller override)
    // 2. Stored demoUrl that looks like a filename → prepend GC CDN base
    // 3. "manual" → Worker looks for the file in storage/demos/incoming/
    const GC_DEMO_CDN = "https://demos.gamersclub.com.br/";
    const storedDemo = match.demoUrl;
    const isDemoFilename = storedDemo && storedDemo.endsWith(".dem");
    const downloadUrl =
      bodyDownloadUrl ??
      (isDemoFilename ? `${GC_DEMO_CDN}${storedDemo}` : "manual");

    if (!isWorkerConfigured()) {
      return NextResponse.json(
        { error: "Sync Worker não está configurado (SYNC_WORKER_URL ausente)." },
        { status: 503 },
      );
    }

    // Idempotency: skip if a job is already in progress for this match
    const existingJob = await prisma.syncJob.findFirst({
      where: {
        sourceMatchId: match.gamersClubMatchId,
        status: { in: ["PENDING", "SENT_TO_WORKER", "PROCESSING"] },
      },
    });

    if (existingJob) {
      return NextResponse.json(
        { jobId: existingJob.id, status: existingJob.status, queued: false },
        { status: 200 },
      );
    }

    // Create the job in PostgreSQL before calling the Worker
    const job = await prisma.syncJob.create({
      data: {
        sourceMatchId: match.gamersClubMatchId,
        source: "gamersclub",
        downloadUrl,
        status: "PENDING",
      },
    });

    try {
      await requestWorkerSync({
        sourceMatchId: match.gamersClubMatchId,
        downloadUrl,
      });

      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "SENT_TO_WORKER", sentAt: new Date() },
      });

      return NextResponse.json({ jobId: job.id, status: "SENT_TO_WORKER", queued: true }, { status: 202 });
    } catch (workerError) {
      const message = workerError instanceof Error ? workerError.message : String(workerError);
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: message },
      });
      return NextResponse.json(
        { error: `Worker não aceitou o job: ${message}` },
        { status: 502 },
      );
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
