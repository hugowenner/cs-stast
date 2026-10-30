const fs=require('node:fs'),crypto=require('node:crypto');const{remote,ssh}=require('./predeploy-audit-20261030.cjs');
const dir='scratch/predeploy-audit-20261030';const prod=JSON.parse(fs.readFileSync(dir+'/production-metadata.json'));
const q=x=>'"'+x.replaceAll('"','""')+'"';
const fk=remote(`SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') FROM (SELECT con.conname name,c.relname child,p.relname parent,
 ARRAY(SELECT a.attname FROM unnest(con.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.num ORDER BY k.ord) child_cols,
 ARRAY(SELECT a.attname FROM unnest(con.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=p.oid AND a.attnum=k.num ORDER BY k.ord) parent_cols
 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_class p ON p.oid=con.confrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE con.contype='f' AND n.nspname='public') t;`)[0];
const checks=fk.map(f=>`SELECT '${f.name.replaceAll("'","''")}' name,count(*) violations FROM ${q(f.child)} c WHERE ${f.child_cols.map(x=>`c.${q(x)} IS NOT NULL`).join(' AND ')} AND NOT EXISTS(SELECT 1 FROM ${q(f.parent)} p WHERE ${f.child_cols.map((x,i)=>`p.${q(f.parent_cols[i])}=c.${q(x)}`).join(' AND ')})`);
const integrity=remote(`SELECT jsonb_agg(to_jsonb(t)) FROM (${checks.join(' UNION ALL ')}) t;`)[0];
const allcounts=remote(`SELECT jsonb_object_agg(name,n) FROM (${prod.schema.tables.map(t=>`SELECT '${t.name}' name,count(*) n FROM ${q(t.name)}`).join(' UNION ALL ')}) t;`)[0];
const sample=remote(`WITH picked AS MATERIALIZED(SELECT id FROM match_payloads WHERE source='gamersclub' ORDER BY id LIMIT 3)
 SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT p."parserVersion",
 ARRAY(SELECT jsonb_object_keys((p.payload->'economy')->0)) economy_keys,
 ARRAY(SELECT jsonb_object_keys((p.payload->'blind_events')->0)) blind_keys,
 ARRAY(SELECT jsonb_object_keys((p.payload->'purchases')->0)) purchase_keys,
 ARRAY(SELECT jsonb_object_keys((p.payload->'bomb')->0)) bomb_keys,
 (SELECT jsonb_agg(DISTINCT e->>'side') FROM jsonb_array_elements(p.payload->'economy') e) economy_sides,
 (SELECT jsonb_agg(DISTINCT r->>'type') FROM jsonb_array_elements(p.payload->'rounds') r) round_types,
 (SELECT jsonb_agg(DISTINCT r->>'winner_team') FROM jsonb_array_elements(p.payload->'rounds') r) winners,
 (SELECT count(*) FROM jsonb_array_elements(p.payload->'kills') k WHERE k->'analytics'->>'anti_eco'='true') anti_eco,
 (SELECT count(*) FROM jsonb_array_elements(p.payload->'bomb') b WHERE b->>'event_type'='planted') planted,
 (SELECT count(*) FROM jsonb_array_elements(p.payload->'clutches') c WHERE c->>'won'='true') clutch_wins,
 (SELECT jsonb_agg(DISTINCT jsonb_typeof(c->'won')) FROM jsonb_array_elements(p.payload->'clutches') c) clutch_won_types
 FROM picked s JOIN match_payloads p ON p.id=s.id) t;`)[0];
const runtime=ssh(`cd /opt/cs2stats
docker exec cs2-stats-app node -e 'console.log("prisma",require("./src/generated/prisma").Prisma.prismaVersion.client);const fs=require("fs"),p=JSON.parse(fs.readFileSync(".next/server/app-paths-manifest.json"));console.log("raio_routes",Object.keys(p).filter(x=>x.includes("raio-x")));console.log("ingest_routes",Object.keys(p).filter(x=>x.includes("ingest")));console.log("build_id",fs.readFileSync(".next/BUILD_ID","utf8"))'
docker inspect -f '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}} {{.HostConfig.RestartPolicy.Name}}' cs2-stats-app
uptime
sed -n '1,145p' src/server/services/normalizer.service.ts
`);
const checksums=prod.schema.migrations.map(m=>{const p='prisma/migrations/'+m.migration_name+'/migration.sql';const b=fs.readFileSync(p);return{name:m.migration_name,raw_match:crypto.createHash('sha256').update(b).digest('hex')===m.checksum,lf_match:crypto.createHash('sha256').update(b.toString().replaceAll('\r\n','\n')).digest('hex')===m.checksum}});
fs.writeFileSync(dir+'/production-details.json',JSON.stringify({at:new Date().toISOString(),integrity,allcounts,bounded_samples:sample,runtime,checksums},null,2));
console.log(JSON.stringify({fk_checked:integrity.length,violations:integrity.filter(x=>x.violations),counts:allcounts,samples:sample,runtime,checksums},null,2));
