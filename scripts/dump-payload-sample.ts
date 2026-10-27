import 'dotenv/config';
import { prisma } from '../src/server/db';

async function main() {
  const p = await prisma.matchPayload.findFirst();
  const payload = p?.payload as any;
  console.log('payload.match:', JSON.stringify(payload.match, null, 2));

  await prisma.$disconnect();
}

main();
