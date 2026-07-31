import { normalizeParserMatch } from "@/server/adapters/parser/normalize";
import * as matchPayloadRepo from "@/server/repositories/matchPayload.repository";
import * as matchRepo from "@/server/repositories/match.repository";
import { ingestMatchSync } from "@/server/services/match.service";

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
    // 2. Traduz o payload bruto utilizando o adaptador do parser
    const normalizedInput = normalizeParserMatch(
      payloadRecord.payload,
      payloadRecord.sourceMatchId,
      payloadRecord.createdAt
    );

    // 3. Expurga estatísticas relacionais antigas caso a partida já exista (Reprocessamento)
    const existingMatch = await matchRepo.findMatchByGamersClubId(payloadRecord.sourceMatchId);
    if (existingMatch) {
      await matchRepo.deleteMatchByGamersClubId(payloadRecord.sourceMatchId);
    }

    // 4. Insere os dados normalizados via MatchImporter (ingestMatchSync)
    // skipEnqueue=true: quem chamou este normalizador é o próprio Worker — a demo já foi
    // processada, não faz sentido re-enfileirá-la com o demo_name do JSON como "URL".
    await ingestMatchSync(normalizedInput, {
      source: payloadRecord.source,
      rawPayload: payloadRecord.payload,
      skipEnqueue: true,
    });

    // 5. Marca o payload como processado com sucesso
    await matchPayloadRepo.markPayloadProcessed(id);

    return { success: true };
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // 6. Registra o erro no log físico da tabela MatchPayload
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
