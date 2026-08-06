import { enrichMatchWithDemo } from "@/server/services/enrichment/demo-enrichment.service";
import * as matchPayloadRepo from "@/server/repositories/matchPayload.repository";

export async function processPayload(id: string): Promise<{ success: boolean; error?: string }> {
  // 1. Tenta bloquear o payload para processamento
  const locked = await matchPayloadRepo.lockPayloadForProcessing(id);
  if (!locked) {
    return { success: false, error: "Payload já está sendo processado ou não está pendente." };
  }

  const payloadRecord = await matchPayloadRepo.findPayloadById(id);
  if (!payloadRecord) {
    await matchPayloadRepo.markPayloadFailed(id, "Payload não localizado no banco de dados.");
    return { success: false, error: "Payload não localizado." };
  }

  try {
    // 2. Processa o enriquecimento da demo usando o serviço de enriquecimento isolado
    const result = await enrichMatchWithDemo(
      payloadRecord.payload,
      payloadRecord.sourceMatchId,
      payloadRecord.createdAt
    );

    if (!result.success) {
      throw new Error(result.error ?? "Erro desconhecido durante enriquecimento");
    }

    // 3. Marca o payload como processado com sucesso
    await matchPayloadRepo.markPayloadProcessed(id);

    return { success: true };
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // 4. Registra o erro no log físico da tabela MatchPayload
    await matchPayloadRepo.markPayloadFailed(id, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Busca o próximo payload pendente e o processa.
 */
export async function processNextPendingPayload(): Promise<{ processed: boolean; success?: boolean; error?: string }> {
  const pending = await matchPayloadRepo.findNextPendingPayload();
  if (!pending) {
    return { processed: false };
  }

  const result = await processPayload(pending.id);
  return { processed: true, ...result };
}
