import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/server/db";
import { processPayload } from "@/server/services/normalizer.service";

// Basic schema check to validate presence of key attributes.
// Other keys (rounds, players, etc.) are allowed via .passthrough().
const ingestRequestSchema = z.object({
  schema_version: z.string(),
  parser_version: z.string(),
  match: z.object({
    id: z.string(),
  }),
}).passthrough();

export async function POST(request: Request) {
  try {
    // 1. Bearer Token Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token de autenticação inválido ou ausente." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const workerToken = process.env.SYNC_SERVICE_TOKEN || process.env.WORKER_INGEST_TOKEN || process.env.ADMIN_SYNC_TOKEN;

    if (!workerToken || token !== workerToken) {
      return NextResponse.json(
        { error: "Token de autenticação inválido ou incorreto." },
        { status: 401 }
      );
    }

    // 2. Context Headers Validation
    const source = request.headers.get("x-match-source");
    const sourceMatchId = request.headers.get("x-match-source-id");

    if (!source || !sourceMatchId) {
      return NextResponse.json(
        { error: "Cabeçalhos X-Match-Source e X-Match-Source-Id são obrigatórios." },
        { status: 422 }
      );
    }

    // 3. Body Size Limit Validation (50 MB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Payload excede o limite máximo de 50MB." },
        { status: 413 }
      );
    }

    // Read body text to enforce limit even if Content-Length is missing or spoofed
    const bodyText = await request.text();
    if (bodyText.length > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Payload excede o limite máximo de 50MB." },
        { status: 413 }
      );
    }

    // Calculate SHA-256 hash of the received JSON string
    const payloadHash = crypto.createHash("sha256").update(bodyText).digest("hex");

    // 4. Parse JSON & Validate Contract Schema
    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch (parseErr) {
      return NextResponse.json(
        { error: "O corpo da requisição deve ser um JSON válido." },
        { status: 400 }
      );
    }

    const validationResult = ingestRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Erro de validação do Zod: ${validationResult.error.message}` },
        { status: 422 }
      );
    }

    const { schema_version, parser_version } = validationResult.data;

    // Major version compatibility check
    if (!schema_version.startsWith("1.")) {
      return NextResponse.json(
        { error: `Versão de schema '${schema_version}' incompatível. Esperado: major 1.` },
        { status: 422 }
      );
    }

    // 5. Database Idempotency Validation (PostgreSQL)
    const existing = await prisma.matchPayload.findUnique({
      where: {
        source_sourceMatchId: {
          source,
          sourceMatchId,
        },
      },
    });

    if (existing) {
      if (existing.payloadHash === payloadHash) {
        return NextResponse.json(
          { accepted: true, payloadId: existing.id, status: "already-processed" },
          { status: 200 }
        );
      } else {
        // Hash é diferente: atualiza o payload e reprocessa em background
        const updated = await prisma.matchPayload.update({
          where: { id: existing.id },
          data: {
            parserVersion: parser_version,
            schemaVersion: schema_version,
            payload: body,
            payloadHash,
            status: "PENDING",
          },
        });

        // Atualiza o job de sync correspondente
        await prisma.syncJob.updateMany({
          where: {
            sourceMatchId,
            source,
            status: { not: "COMPLETED" },
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        processPayload(updated.id).catch((err) => {
          console.error(`[Background Normalizer] Erro ao reprocessar payload ${updated.id}:`, err);
        });

        return NextResponse.json(
          { accepted: true, payloadId: updated.id, status: "reprocessing" },
          { status: 202 }
        );
      }
    }

    // 6. Save Payload inside MatchPayload Table
    const created = await prisma.matchPayload.create({
      data: {
        source,
        sourceMatchId,
        schemaVersion: schema_version,
        parserVersion: parser_version,
        payload: body,
        payloadHash,
      },
    });

    // 6.5. Update the corresponding SyncJob to COMPLETED in the Hub database
    await prisma.syncJob.updateMany({
      where: {
        sourceMatchId,
        source,
        status: { not: "COMPLETED" },
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // 7. Trigger background normalization asynchronously (fire-and-forget)
    processPayload(created.id).catch((err) => {
      console.error(`[Background Normalizer] Erro ao processar payload ${created.id}:`, err);
    });

    return NextResponse.json(
      { accepted: true, payloadId: created.id, status: "stored" },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Erro interno no endpoint de ingestão:", error);
    return NextResponse.json(
      { error: `Erro interno no servidor: ${error.message || error}` },
      { status: 500 }
    );
  }
}
