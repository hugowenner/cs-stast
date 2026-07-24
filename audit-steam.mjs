// Auditoria read-only — usa pg direto, sem Prisma, sem alterar nada
import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Lê a connection string direto do arquivo sem tocar no env do projeto
const envPath = resolve(process.cwd(), '.env.neon');
const raw = readFileSync(envPath, 'utf8').trim();
// Suporta tanto "URL pura" quanto "DATABASE_URL=..."
const connectionString = raw.startsWith('postgresql') || raw.startsWith('postgres')
  ? raw
  : (raw.split('\n').find(l => l.startsWith('DATABASE_URL=')) ?? '').replace(/^DATABASE_URL=/, '').replace(/^["']|["']$/g, '').trim();
if (!connectionString) { console.error('Connection string não encontrada em .env.neon'); process.exit(1); }

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

// ── 1. Todos os jogadores ────────────────────────────────────────────────────
const { rows: players } = await client.query(`
  SELECT
    p.id,
    p.nickname,
    p."gamersClubId",
    p."steamId",
    p."avatarUrl",
    p."steamLastSync",
    p."steamNickname",
    tp.active        AS tp_active,
    tp.gamersclub_id AS tp_gcid
  FROM "Player" p
  LEFT JOIN tracked_players tp ON tp.gamersclub_id = p."gamersClubId"
  ORDER BY p.nickname
`);

// ── 2. Jogadores com partidas ─────────────────────────────────────────────────
const { rows: matchCounts } = await client.query(`
  SELECT "playerId", COUNT(*) AS cnt
  FROM "PlayerMatchStats"
  GROUP BY "playerId"
`);
const matchMap = new Map(matchCounts.map(r => [r.playerId, Number(r.cnt)]));

await client.end();

// ── 3. Filtrar apenas quem tem partidas ──────────────────────────────────────
const relevant = players.filter(p => matchMap.has(p.id));
console.log(`Jogadores com partidas: ${relevant.length}\n`);

// ── 4. Classificar e montar linhas ───────────────────────────────────────────
const rows = relevant.map(p => {
  const isTracked  = p.tp_gcid !== null;
  const isActive   = p.tp_active === true;
  const hasSteamId = !!p.steamId;
  const hasSynced  = !!p.steamLastSync;
  const hasAvatar  = !!p.avatarUrl;
  const matches    = matchMap.get(p.id) ?? 0;

  let cat, reason;

  if (!hasSteamId) {
    cat    = '1. Sem SteamID';
    reason = 'SteamID nunca fornecido';
  } else if (!isTracked) {
    cat    = '2. Não monitorado';
    reason = 'Sem registro em TrackedPlayer';
  } else if (!isActive) {
    cat    = '2. Não monitorado';
    reason = 'TrackedPlayer com active=false';
  } else if (!hasSynced) {
    cat    = '3. Falha na sincronização';
    reason = 'Monitorado mas steamLastSync=null';
  } else if (!hasAvatar) {
    cat    = '4. Perfil privado/inválido';
    reason = 'Sync executado mas sem avatar (perfil privado?)';
  } else {
    cat    = '5. Tudo OK';
    reason = '';
  }

  return {
    nickname:  p.nickname,
    gcid:      p.gamersClubId ?? '—',
    steamId:   p.steamId      ?? '—',
    tracked:   isTracked ? 'Sim' : 'Não',
    active:    isTracked ? String(isActive) : '—',
    syncDate:  p.steamLastSync ? new Date(p.steamLastSync).toISOString().slice(0, 10) : '—',
    avatar:    hasAvatar ? 'Sim' : 'Não',
    matches,
    cat,
    reason,
  };
});

// ── 5. Imprimir tabela ────────────────────────────────────────────────────────
const cols = [
  { key: 'nickname', label: 'Nickname',       w: 20 },
  { key: 'gcid',     label: 'GCID',           w: 10 },
  { key: 'steamId',  label: 'SteamID',        w: 18 },
  { key: 'tracked',  label: 'Tracked?',       w: 9  },
  { key: 'active',   label: 'Active',         w: 7  },
  { key: 'syncDate', label: 'Last Sync',      w: 12 },
  { key: 'avatar',   label: 'Avatar?',        w: 8  },
  { key: 'matches',  label: 'Partidas',       w: 9  },
  { key: 'cat',      label: 'Categoria',      w: 26 },
  { key: 'reason',   label: 'Motivo',         w: 50 },
];

const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
const line = cols.map(c => pad(c.label, c.w)).join(' | ');
const sep  = cols.map(c => '-'.repeat(c.w)).join('-+-');

console.log(line);
console.log(sep);
for (const r of rows) console.log(cols.map(c => pad(r[c.key], c.w)).join(' | '));

// ── 6. Resumo ─────────────────────────────────────────────────────────────────
console.log('\n=== RESUMO POR CATEGORIA ===\n');
const byCat = {};
for (const r of rows) {
  (byCat[r.cat] ??= []).push(r.nickname);
}
for (const [cat, names] of Object.entries(byCat).sort()) {
  console.log(`${cat} (${names.length}): ${names.join(', ')}`);
}
console.log(`\nTotal: ${rows.length} | Com avatar: ${rows.filter(r => r.avatar === 'Sim').length} | Sem avatar: ${rows.filter(r => r.avatar === 'Não').length}`);
