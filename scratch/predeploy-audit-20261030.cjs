const fs=require('node:fs'), cp=require('node:child_process'), path=require('node:path'), crypto=require('node:crypto');
const dotenv=require('dotenv'); const {Client}=require('pg');
dotenv.config({quiet:true});
const cfg=dotenv.parse(fs.readFileSync('.env.vps-sync'));
const dir='scratch/predeploy-audit-20261030';fs.mkdirSync(dir,{recursive:true});
function ssh(script){return cp.execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8','-p',cfg.VPS_SSH_PORT,cfg.VPS_SSH_USER+'@'+cfg.VPS_SSH_HOST,'sh -s'],{input:script.replaceAll('\r','')+'\n',encoding:'utf8',maxBuffer:8e6,windowsHide:true});}
function remote(sql){const out=ssh(`docker exec -i cs2-stats-postgres sh -c 'psql -X -qAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'AUDIT_SQL'\nBEGIN READ ONLY; SET LOCAL statement_timeout='4s'; SET LOCAL lock_timeout='500ms';\n${sql}\nROLLBACK;\nAUDIT_SQL`);return out.trim().split('\n').filter(Boolean).map(JSON.parse);}
const schema=`SELECT jsonb_build_object(
 'version',version(),'database',current_database(),'db_bytes',pg_database_size(current_database()),
 'columns',(SELECT jsonb_agg(to_jsonb(t) ORDER BY table_name,ordinal_position) FROM (SELECT table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public') t),
 'indexes',(SELECT jsonb_agg(to_jsonb(t) ORDER BY tablename,indexname) FROM (SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public') t),
 'constraints',(SELECT jsonb_agg(to_jsonb(t) ORDER BY table_name,name) FROM (SELECT c.relname table_name,con.conname name,con.contype type,con.convalidated validated,pg_get_constraintdef(con.oid) definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') t),
 'tables',(SELECT jsonb_agg(to_jsonb(t) ORDER BY name) FROM (SELECT c.relname name,c.reltuples::bigint estimated_rows,pg_total_relation_size(c.oid) total_bytes,pg_relation_size(c.oid) heap_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r') t),
 'migrations',(SELECT jsonb_agg(to_jsonb(t) ORDER BY migration_name) FROM (SELECT migration_name,checksum,finished_at,rolled_back_at,applied_steps_count FROM _prisma_migrations) t));`;
const counts=`SELECT jsonb_build_object(
 'counts',jsonb_build_object('Match',(SELECT count(*) FROM "Match"),'PlayerMatchStats',(SELECT count(*) FROM "PlayerMatchStats"),'Player',(SELECT count(*) FROM "Player"),'tracked_players',(SELECT count(*) FROM tracked_players),'match_payloads',(SELECT count(*) FROM match_payloads),'PlayerMatchup',(SELECT count(*) FROM "PlayerMatchup"),'PlayerClutch',(SELECT count(*) FROM "PlayerClutch"),'PlayerEntryDuel',(SELECT count(*) FROM "PlayerEntryDuel"),'PlayerTradeEvent',(SELECT count(*) FROM "PlayerTradeEvent"),'SeasonSnapshot',(SELECT count(*) FROM "SeasonSnapshot")),
 'payload_status',(SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*) n FROM match_payloads GROUP BY status) t),
 'parser_versions',(SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT "parserVersion","schemaVersion",count(*) n FROM match_payloads GROUP BY 1,2) t),
 'jobs',(SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*) n FROM sync_jobs GROUP BY status) t),
 'seasons',(SELECT jsonb_agg(to_jsonb(t) ORDER BY start_date) FROM (SELECT s.id,s.name,s.status,s."startDate" start_date,s."endDate" end_date,count(m.id) matches,count(m.id) FILTER(WHERE m."trackedPlayersCount">=2) community,count(m.id) FILTER(WHERE m."demoUrl" IS NOT NULL) urls,count(m.id) FILTER(WHERE m."playedAt"<s."startDate" OR m."playedAt">s."endDate") outside FROM "Season" s LEFT JOIN "Match" m ON m."seasonId"=s.id GROUP BY s.id) t),
 'snapshots',(SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT s."seasonId",jsonb_typeof(s.dashboard) kind,ARRAY(SELECT jsonb_object_keys(s.dashboard)) keys,CASE WHEN jsonb_typeof(s.dashboard->'dashboard')='object' THEN ARRAY(SELECT jsonb_object_keys(s.dashboard->'dashboard')) END nested_keys FROM "SeasonSnapshot" s) t));`;
const sample=`WITH picked AS MATERIALIZED (SELECT id FROM (SELECT p.id,row_number() OVER(PARTITION BY m."seasonId" ORDER BY p."createdAt" DESC) rn FROM match_payloads p JOIN "Match" m ON m."gamersClubMatchId"=p."sourceMatchId" WHERE p.source='gamersclub') t WHERE rn=1 LIMIT 4)
SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT m."seasonId",p.status,p."parserVersion",pg_column_size(p.payload) stored_bytes,
 ARRAY(SELECT jsonb_object_keys(p.payload)) payload_keys,jsonb_typeof(m."roundsJson") relational_rounds_type,
 CASE WHEN jsonb_typeof(m."roundsJson")='array' THEN jsonb_array_length(m."roundsJson") END relational_rounds,
 jsonb_array_length(p.payload->'rounds') raw_rounds,
 (SELECT jsonb_agg(key) FROM jsonb_object_keys((p.payload->'rounds')->0) key) round_keys,
 (SELECT jsonb_agg(key) FROM jsonb_object_keys((p.payload->'kills')->0) key) kill_keys,
 (SELECT jsonb_agg(key) FROM jsonb_object_keys(((p.payload->'kills')->0)->'analytics') key) analytics_keys,
 (SELECT count(*) FROM jsonb_array_elements(p.payload->'rounds') r WHERE r->>'reason'='bomb_defused') defused,
 (SELECT count(*) FROM jsonb_array_elements(p.payload->'rounds') r WHERE r ? 'mvp_steamid') rounds_with_mvp_key,
 (SELECT count(*) FROM jsonb_array_elements(p.payload->'rounds') r WHERE nullif(r->>'mvp_steamid','') IS NOT NULL) rounds_with_mvp_value
 FROM picked k JOIN match_payloads p ON p.id=k.id JOIN "Match" m ON m."gamersClubMatchId"=p."sourceMatchId") t;`;
async function main(){
 const prod={at:new Date().toISOString(),schema:remote(schema)[0],data:remote(counts)[0],bounded_samples:remote(sample)[0]};
 fs.writeFileSync(path.join(dir,'production-metadata.json'),JSON.stringify(prod,null,2));
 const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();await client.query('BEGIN READ ONLY');await client.query("SET LOCAL statement_timeout='4s'");
 const dev={at:new Date().toISOString(),schema:(await client.query(schema)).rows[0].jsonb_build_object,data:(await client.query(counts)).rows[0].jsonb_build_object,bounded_samples:(await client.query(sample)).rows[0].jsonb_agg};
 await client.query('ROLLBACK');await client.end();fs.writeFileSync(path.join(dir,'dev-metadata.json'),JSON.stringify(dev,null,2));
 const manifest=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',maxBuffer:5e6}).split('\0').filter(Boolean).map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
 fs.writeFileSync(path.join(dir,'workspace-manifest.json'),JSON.stringify({at:new Date().toISOString(),head:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:manifest},null,2));
 console.log(JSON.stringify({production:{version:prod.schema.version,counts:prod.data.counts,status:prod.data.payload_status,db_bytes:prod.schema.db_bytes},dev:{version:dev.schema.version,counts:dev.data.counts,status:dev.data.payload_status},columns_equal:JSON.stringify(prod.schema.columns)===JSON.stringify(dev.schema.columns),indexes_equal:JSON.stringify(prod.schema.indexes)===JSON.stringify(dev.schema.indexes),constraints_equal:JSON.stringify(prod.schema.constraints)===JSON.stringify(dev.schema.constraints),manifest_files:manifest.length},null,2));
}
module.exports={remote,ssh};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
