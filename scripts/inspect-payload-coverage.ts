import 'dotenv/config';
import { prisma } from '../src/server/db';
import * as fs from 'fs';

async function main() {
  const data = JSON.parse(fs.readFileSync('./audit-matches-report.json', 'utf8'));

  const withPayload = data.filter((m: any) => m.hasPayload);
  const confirmed = data.filter((m: any) => m.classification === 'CONFIRMED_BY_SOURCE');
  const divergent = data.filter((m: any) => m.classification === 'DIVERGENT');
  const internal = data.filter((m: any) => m.classification === 'CONSISTENT_INTERNAL_ONLY');
  const inconclusive = data.filter((m: any) => m.classification === 'INCONCLUSIVE');

  console.log('=== ESTATÍSTICAS DETALHADAS DE PAYLOAD ===');
  console.log(`Total partidas com Payload: ${withPayload.length}`);
  console.log(`Confirmadas por fonte (data payload == playedAt): ${confirmed.length}`);

  // Verificar se há alguma com payload cuja data difere
  const payloadMismatch = withPayload.filter((m: any) => m.payloadDateMatch === false);
  console.log(`Partidas com Payload cuja data NÃO bate com playedAt: ${payloadMismatch.length}`);

  // Verificar se há alguma nota de discrepância de data (ex: arredondamento de segundos)
  const notesCount = withPayload.filter((m: any) => m.dateDiscrepancyNotes.length > 0);
  console.log(`Partidas com notas de pequenas variações: ${notesCount.length}`);
  if (notesCount.length > 0) {
    console.log('Exemplos de notas:');
    notesCount.slice(0, 5).forEach((m: any) => console.log(` - Match ${m.matchId}: ${m.dateDiscrepancyNotes.join('; ')}`));
  }

  // Verificar se as partidas sem payload pertencem a quais temporadas
  const noPayload = data.filter((m: any) => !m.hasPayload);
  const noPayloadBySeason: Record<string, number> = {};
  for (const m of noPayload) {
    noPayloadBySeason[m.seasonName] = (noPayloadBySeason[m.seasonName] || 0) + 1;
  }
  console.log('\nPartidas sem Payload por temporada:', noPayloadBySeason);

  // Verificar partidas com payload por temporada
  const withPayloadBySeason: Record<string, number> = {};
  for (const m of withPayload) {
    withPayloadBySeason[m.seasonName] = (withPayloadBySeason[m.seasonName] || 0) + 1;
  }
  console.log('Partidas com Payload por temporada:', withPayloadBySeason);

  await prisma.$disconnect();
}

main();
