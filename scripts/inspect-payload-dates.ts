import 'dotenv/config';
import { prisma } from '../src/server/db';

async function main() {
  const payloads = await prisma.matchPayload.findMany();
  console.log(`Total payloads: ${payloads.length}`);

  let nullDateCount = 0;
  let nonNullDateCount = 0;
  const nonNullSamples: any[] = [];

  for (const p of payloads) {
    const payload = p.payload as any;
    const dateVal = payload?.match?.date || payload?.date || payload?.data;
    if (dateVal) {
      nonNullDateCount++;
      if (nonNullSamples.length < 5) {
        nonNullSamples.push({ id: p.id, sourceMatchId: p.sourceMatchId, dateVal });
      }
    } else {
      nullDateCount++;
    }
  }

  console.log(`Payloads com date nulo/ausente: ${nullDateCount}`);
  console.log(`Payloads com date preenchido: ${nonNullDateCount}`);
  if (nonNullSamples.length > 0) {
    console.log('Exemplos de dates preenchidos:', nonNullSamples);
  }

  // Verificar se há algum outro campo no payload com formato de data ou timestamp
  const sample = payloads[0].payload as any;
  console.log('Chaves de payload.round_facts ou rounds:', sample?.rounds ? Object.keys(sample.rounds[0] || {}) : 'sem rounds');

  await prisma.$disconnect();
}

main();
