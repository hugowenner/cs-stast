import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();
const jobs = await prisma.syncJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
console.log('Total SyncJobs:', jobs.length);
jobs.forEach(j => console.log(j.sourceMatchId, '|', j.status, '|', (j.downloadUrl ?? '').slice(0, 70), '|', j.errorMessage ?? ''));
await prisma.$disconnect();
