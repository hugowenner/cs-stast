import dotenv from 'dotenv';
import { writeFileSync } from 'node:fs';
dotenv.config({quiet:true});
const u=new URL(process.env.DATABASE_URL!);
if(!['localhost','127.0.0.1'].includes(u.hostname)||!u.pathname.startsWith('/cs2_stats_dev_'))throw Error('Local DEV read-only required');
u.searchParams.set('options','-c default_transaction_read_only=on -c statement_timeout=5000');
process.env.DATABASE_URL=u.href;
async function main(){
 const {getRaioXBundle}=await import('../src/server/services/raio-x.service');
 const {prisma}=await import('../src/server/db');
 const results=[];
 try{
  for(const season of ['cmuow54kq223v01rxwlfgd6o9','all','all']){
   const start=performance.now();const b=await getRaioXBundle(season);
   results.push({season,ms:Math.round(performance.now()-start),rssMiB:Math.round(process.memoryUsage().rss/1048576),heapMiB:Math.round(process.memoryUsage().heapUsed/1048576),maxRssMiB:Math.round(process.resourceUsage().maxRSS/1024),modules:Object.fromEntries(Object.entries(b).map(([k,v])=>[k,{hasTelemetry:'hasTelemetry'in v?v.hasTelemetry:undefined,totalEligibleRounds:'totalEligibleRounds'in v?v.totalEligibleRounds:undefined,totalRoundsAnalyzed:'totalRoundsAnalyzed'in v?v.totalRoundsAnalyzed:undefined,totalTeamFlashes:'totalTeamFlashes'in v?v.totalTeamFlashes:undefined,totalEcoKills:'totalEcoKills'in v?v.totalEcoKills:undefined,totalKillsAnalyzed:'totalKillsAnalyzed'in v?v.totalKillsAnalyzed:undefined,totalTrackedTrades:'totalTrackedTrades'in v?v.totalTrackedTrades:undefined,totalDecisiveRoundsAnalyzed:'totalDecisiveRoundsAnalyzed'in v?v.totalDecisiveRoundsAnalyzed:undefined,totalEligibleDuos:'totalEligibleDuos'in v?v.totalEligibleDuos:undefined}]))});
  }
  writeFileSync('scratch/predeploy-audit-20261030/local-runtime.json',JSON.stringify({at:new Date().toISOString(),readOnly:true,results},null,2));console.log(JSON.stringify(results,null,2));
 }finally{await prisma.$disconnect()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
