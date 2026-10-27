import 'dotenv/config';
import { prisma } from '../src/server/db';
import * as fs from 'fs';
import * as path from 'path';

interface AuditResult {
  matchId: string;
  gamersClubMatchId: string | null;
  playedAtUTC: string;
  playedAtBRT: string;
  seasonId: string;
  seasonName: string;
  seasonStartUTC: string;
  seasonEndUTC: string;
  sessionId: string | null;
  sessionDate: string | null;
  hasPayload: boolean;
  payloadDateRaw: string | null;
  payloadParsedUTC: string | null;
  payloadDateMatch: boolean | null;
  dateDiscrepancyNotes: string[];
  expectedSeasonId: string | null;
  expectedSeasonName: string | null;
  seasonMatch: boolean;
  classification: 'CONFIRMED_BY_SOURCE' | 'CONSISTENT_INTERNAL_ONLY' | 'DIVERGENT' | 'INCONCLUSIVE';
  flags: string[];
}

// Converte Date UTC para string legível em America/Sao_Paulo (UTC-3 fixo no BR)
function toBRTString(d: Date): string {
  const brt = new Date(d.getTime() - 3 * 3600 * 1000);
  return brt.toISOString().replace('T', ' ').substring(0, 19) + ' BRT';
}

function getBRTMonthYear(d: Date): { year: number; month: number } {
  const brt = new Date(d.getTime() - 3 * 3600 * 1000);
  return {
    year: brt.getUTCFullYear(),
    month: brt.getUTCMonth() + 1 // 1-12
  };
}

// Parse de data no padrão Gamers Club (DD/MM/YYYY HH:mm ou DD/MM/YYYY HH:mm:ss)
// O sistema assume America/Sao_Paulo (UTC-3)
function parseGCDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  // Formato: DD/MM/YYYY HH:mm[:ss]
  const ddmmyyyyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const hours = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
    const minutes = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const seconds = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;

    // Criar em UTC com offset +3h (pois o horário informado é BRT UTC-3)
    const utcMillis = Date.UTC(year, month, day, hours + 3, minutes, seconds);
    return new Date(utcMillis);
  }

  // Formato ISO
  if (trimmed.includes('T') || trimmed.includes('-')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

// Extrai string de data original de um payload GC
function extractDateFromPayload(payload: any): { raw: string | null; key: string | null } {
  if (!payload || typeof payload !== 'object') return { raw: null, key: null };

  if (typeof payload.data === 'string' && payload.data.trim()) {
    return { raw: payload.data.trim(), key: 'payload.data' };
  }
  if (typeof payload.date === 'string' && payload.date.trim()) {
    return { raw: payload.date.trim(), key: 'payload.date' };
  }
  if (payload.match && typeof payload.match.date === 'string' && payload.match.date.trim()) {
    return { raw: payload.match.date.trim(), key: 'payload.match.date' };
  }
  if (payload.match && typeof payload.match.data === 'string' && payload.match.data.trim()) {
    return { raw: payload.match.data.trim(), key: 'payload.match.data' };
  }
  if (typeof payload.created_at === 'string' && payload.created_at.trim()) {
    return { raw: payload.created_at.trim(), key: 'payload.created_at' };
  }
  if (typeof payload.match_date === 'string' && payload.match_date.trim()) {
    return { raw: payload.match_date.trim(), key: 'payload.match_date' };
  }

  return { raw: null, key: null };
}

const MONTH_NAMES_PT: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro'
};

async function main() {
  console.log('=== INICIANDO AUDITORIA COMPLETA DE TODAS AS PARTIDAS ===\n');

  // 1. Carregar Seasons
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'asc' }
  });

  console.log(`Carregadas ${seasons.length} temporadas:`);
  for (const s of seasons) {
    console.log(` - [${s.id}] ${s.name}: ${s.startDate.toISOString()} até ${s.endDate.toISOString()} (BRT: ${toBRTString(s.startDate)} até ${toBRTString(s.endDate)})`);
  }
  console.log('');

  // 2. Carregar todos os MatchPayloads
  const payloads = await prisma.matchPayload.findMany({
    select: {
      id: true,
      sourceMatchId: true,
      source: true,
      payload: true,
      createdAt: true
    }
  });

  console.log(`Total de MatchPayloads encontrados: ${payloads.length}`);
  const payloadMap = new Map<string, typeof payloads[0]>();
  for (const p of payloads) {
    if (p.sourceMatchId) {
      payloadMap.set(p.sourceMatchId, p);
    }
  }

  // 3. Carregar todas as 638 Partidas
  const matches = await prisma.match.findMany({
    include: {
      season: {
        select: { id: true, name: true, startDate: true, endDate: true }
      },
      session: {
        select: { id: true, date: true }
      }
    },
    orderBy: { playedAt: 'asc' }
  });

  console.log(`Total de Partidas no banco: ${matches.length}\n`);

  const auditResults: AuditResult[] = [];

  for (const m of matches) {
    const flags: string[] = [];
    const dateDiscrepancyNotes: string[] = [];

    const playedAtUTC = m.playedAt.toISOString();
    const playedAtBRT = toBRTString(m.playedAt);
    const { year: brtYear, month: brtMonth } = getBRTMonthYear(m.playedAt);
    const expectedMonthName = `${MONTH_NAMES_PT[brtMonth]}/${brtYear}`;

    // Procurar a temporada correspondente ao mês civil em BRT
    const matchingSeason = seasons.find(s => {
      // Comparar por nome exato "Mês/Ano" ou por intervalo de data
      if (s.name.toLowerCase().includes(MONTH_NAMES_PT[brtMonth].toLowerCase()) && s.name.includes(`${brtYear}`)) {
        return true;
      }
      return false;
    }) || seasons.find(s => m.playedAt >= s.startDate && m.playedAt <= s.endDate);

    const expectedSeasonId = matchingSeason?.id || null;
    const expectedSeasonName = matchingSeason?.name || expectedMonthName;
    const seasonMatch = m.seasonId === expectedSeasonId;

    // Verificar se a partida está dentro dos limites da temporada vinculada atualmente
    const insideCurrentSeasonLimits = m.playedAt >= m.season.startDate && m.playedAt <= m.season.endDate;
    if (!insideCurrentSeasonLimits) {
      flags.push(`OUTSIDE_SEASON_LIMITS: playedAt ${playedAtUTC} fora de [${m.season.startDate.toISOString()} - ${m.season.endDate.toISOString()}]`);
    }

    if (!seasonMatch) {
      flags.push(`SEASON_MISMATCH: Vinculada a [${m.season.name}], esperada [${expectedSeasonName}]`);
    }

    // Verificar fronteira de final de mês (21h às 23h59 BRT = 00h às 02h59 UTC do dia 1)
    const brtHours = new Date(m.playedAt.getTime() - 3 * 3600 * 1000).getUTCHours();
    const brtDay = new Date(m.playedAt.getTime() - 3 * 3600 * 1000).getUTCDate();
    const isEndOfMonth = brtHours >= 21;

    // Buscar payload
    const gcId = m.gamersClubMatchId;
    const payloadRecord = gcId ? payloadMap.get(gcId) : null;
    let hasPayload = false;
    let payloadDateRaw: string | null = null;
    let payloadParsedUTC: string | null = null;
    let payloadDateMatch: boolean | null = null;

    if (payloadRecord) {
      hasPayload = true;
      const { raw, key } = extractDateFromPayload(payloadRecord.payload);
      payloadDateRaw = raw;

      if (raw) {
        const parsed = parseGCDateString(raw);
        if (parsed) {
          payloadParsedUTC = parsed.toISOString();
          const diffSeconds = Math.abs((parsed.getTime() - m.playedAt.getTime()) / 1000);

          if (diffSeconds === 0) {
            payloadDateMatch = true;
          } else if (diffSeconds <= 60) {
            // Diferença de até 1 minuto (arredondamento de segundos)
            payloadDateMatch = true;
            dateDiscrepancyNotes.push(`Pequena variação de segundos: payload=${raw} (${parsed.toISOString()}) vs match=${playedAtUTC} (diff: ${diffSeconds}s)`);
          } else {
            payloadDateMatch = false;
            dateDiscrepancyNotes.push(`Divergência de data: payload[${key}]="${raw}" (parse=${parsed.toISOString()}) vs match.playedAt=${playedAtUTC} (diff: ${diffSeconds}s)`);
            flags.push(`PAYLOAD_DATE_MISMATCH_DIFF_${diffSeconds}s`);
          }
        } else {
          dateDiscrepancyNotes.push(`Não foi possível realizar o parse da data do payload: "${raw}"`);
          flags.push('PAYLOAD_DATE_PARSE_ERROR');
        }
      } else {
        dateDiscrepancyNotes.push('Payload existe, mas não possui campo de data reconhecível');
        flags.push('PAYLOAD_NO_DATE_FIELD');
      }
    }

    // Análise de Session para partidas sem payload ou com payload
    if (m.session) {
      const sessionDateStr = m.session.date.toISOString().substring(0, 10);
      const matchDateBRTStr = playedAtBRT.substring(0, 10);

      // Sessão de CS2 costuma ser jogada à noite/madrugada, verificar se coincide com dia da partida ou dia anterior/seguinte
      const matchDay = new Date(matchDateBRTStr).getTime();
      const sessionDay = new Date(sessionDateStr).getTime();
      const dayDiff = Math.abs(matchDay - sessionDay) / (24 * 3600 * 1000);

      if (dayDiff > 2) {
        flags.push(`SESSION_DATE_DISTANCE_${dayDiff}d: Session=${sessionDateStr} vs MatchBRT=${matchDateBRTStr}`);
      }
    } else {
      flags.push('NO_SESSION');
    }

    // Classificação
    let classification: AuditResult['classification'] = 'CONSISTENT_INTERNAL_ONLY';

    if (hasPayload && payloadDateMatch === true) {
      if (seasonMatch && insideCurrentSeasonLimits) {
        classification = 'CONFIRMED_BY_SOURCE';
      } else {
        classification = 'DIVERGENT';
      }
    } else if (hasPayload && payloadDateMatch === false) {
      classification = 'DIVERGENT';
    } else if (!hasPayload) {
      if (!seasonMatch || !insideCurrentSeasonLimits) {
        classification = 'DIVERGENT';
      } else {
        // Sem payload, mas sem contradição aparente
        classification = 'CONSISTENT_INTERNAL_ONLY';
      }
    }

    auditResults.push({
      matchId: m.id,
      gamersClubMatchId: m.gamersClubMatchId,
      playedAtUTC,
      playedAtBRT,
      seasonId: m.seasonId,
      seasonName: m.season.name,
      seasonStartUTC: m.season.startDate.toISOString(),
      seasonEndUTC: m.season.endDate.toISOString(),
      sessionId: m.sessionId,
      sessionDate: m.session?.date ? m.session.date.toISOString() : null,
      hasPayload,
      payloadDateRaw,
      payloadParsedUTC,
      payloadDateMatch,
      dateDiscrepancyNotes,
      expectedSeasonId,
      expectedSeasonName,
      seasonMatch,
      classification,
      flags
    });
  }

  // Estatísticas de auditoria
  const total = auditResults.length;
  const confirmed = auditResults.filter(r => r.classification === 'CONFIRMED_BY_SOURCE').length;
  const consistentInternal = auditResults.filter(r => r.classification === 'CONSISTENT_INTERNAL_ONLY').length;
  const divergent = auditResults.filter(r => r.classification === 'DIVERGENT').length;
  const inconclusive = auditResults.filter(r => r.classification === 'INCONCLUSIVE').length;

  console.log('=== RESUMO DA CLASSIFICAÇÃO DAS 638 PARTIDAS ===');
  console.log(`Total de partidas auditadas: ${total}`);
  console.log(`1. Confirmadas por fonte original (Payload): ${confirmed} (${((confirmed/total)*100).toFixed(1)}%)`);
  console.log(`2. Apenas consistentes internamente (sem payload): ${consistentInternal} (${((consistentInternal/total)*100).toFixed(1)}%)`);
  console.log(`3. Divergentes (data ou temporada): ${divergent} (${((divergent/total)*100).toFixed(1)}%)`);
  console.log(`4. Inconclusivas: ${inconclusive} (${((inconclusive/total)*100).toFixed(1)}%)\n`);

  // Análise detalhada dos divergentes
  const divergentList = auditResults.filter(r => r.classification === 'DIVERGENT');
  console.log(`=== DETALHAMENTO DE DIVERGÊNCIAS (${divergentList.length} partidas) ===`);
  for (const d of divergentList) {
    console.log(`- Match: ${d.matchId} (GC: ${d.gamersClubMatchId}) | playedAt: ${d.playedAtUTC} (${d.playedAtBRT})`);
    console.log(`  Atual: [${d.seasonName}] | Esperado: [${d.expectedSeasonName}] | hasPayload: ${d.hasPayload}`);
    if (d.hasPayload) {
      console.log(`  Payload Raw: "${d.payloadDateRaw}" -> Parsed: ${d.payloadParsedUTC} | Match: ${d.payloadDateMatch}`);
    }
    if (d.dateDiscrepancyNotes.length > 0) {
      console.log(`  Notas: ${d.dateDiscrepancyNotes.join('; ')}`);
    }
    console.log(`  Flags: ${d.flags.join(', ')}`);
  }
  console.log('');

  // Contagem por temporada Atual vs Esperada
  console.log('=== CONTAGEM POR TEMPORADA: ATUAL vs PROJETADA ===');
  const currentCounts: Record<string, number> = {};
  const projectedCounts: Record<string, number> = {};

  for (const s of seasons) {
    currentCounts[s.name] = 0;
    projectedCounts[s.name] = 0;
  }

  for (const r of auditResults) {
    currentCounts[r.seasonName] = (currentCounts[r.seasonName] || 0) + 1;
    const expName = r.expectedSeasonName || 'DESCONHECIDA';
    projectedCounts[expName] = (projectedCounts[expName] || 0) + 1;
  }

  console.table(
    seasons.map(s => ({
      Temporada: s.name,
      'Contagem Atual': currentCounts[s.name] || 0,
      'Contagem Projetada': projectedCounts[s.name] || 0,
      Diferenca: (projectedCounts[s.name] || 0) - (currentCounts[s.name] || 0)
    }))
  );

  // Auditoria específica das 30 partidas de Junho/2026
  console.log('=== AUDITORIA ESPECÍFICA DAS PARTIDAS DE JUNHO/2026 ===');
  const juneMatches = auditResults.filter(r => r.seasonName === 'Junho/2026' || r.expectedSeasonName === 'Junho/2026');
  console.log(`Total de partidas envolvidas com Junho/2026: ${juneMatches.length}`);
  for (const j of juneMatches) {
    console.log(`- Match ${j.matchId} (GC: ${j.gamersClubMatchId}) | ${j.playedAtUTC} (${j.playedAtBRT}) | Atual: ${j.seasonName} | Esperado: ${j.expectedSeasonName} | Payload: ${j.hasPayload ? j.payloadDateRaw : 'SEM PAYLOAD'} | Status: ${j.classification}`);
  }

  // Salvar relatório em JSON para análise detalhada posterior se necessário
  const outputPath = path.join(__dirname, '../audit-matches-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2));
  console.log(`\nRelatório completo salvo em: ${outputPath}`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
