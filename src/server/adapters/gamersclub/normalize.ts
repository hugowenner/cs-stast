import type { SyncMatchInput } from "@/server/dtos/sync.dto";
import type {
  GamersClubMatchPayload,
  GamersClubPlayerMatchEntry,
} from "@/server/adapters/gamersclub/types";

/**
 * Converte o payload bruto de `{url-da-partida}/1` da Gamers Club para o contrato
 * interno `SyncMatchInput`. Fronteira única entre o formato da GC e o resto do
 * sistema — nenhum Service conhece nomes de campo da GC além deste arquivo. Se a GC
 * mudar o formato do payload, só este arquivo (e seus testes, ver normalize.test.ts)
 * deveria precisar mudar.
 *
 * Validado contra uma resposta real capturada em 2026-07-20 (partida 27483022, ver
 * fixtures/match-real-27483022.json). Achado principal: a API da GC devolve todo
 * campo numérico como STRING (`"nb_kill": "16"`, não `16`) — daí `toNumber()` em vez
 * de passar os valores direto.
 *
 * Não populado por esta fonte (ver docs/COMPANION.md):
 * - `killsDetail` (kill-by-kill) — não está no payload, então rivalidades por kill e
 *   detecção de Ace/multi-kill não funcionam via esta fonte ainda.
 * - clutches por tier (1v1..1v5) — só existe `clutch_won` agregado.
 */
export function normalizeGamersClubMatch(raw: GamersClubMatchPayload): SyncMatchInput {
  const jogos = raw.jogos ?? {};

  const players = [
    ...normalizeTeam(jogos.players?.team_a, "A"),
    ...normalizeTeam(jogos.players?.team_b, "B"),
  ];

  return {
    matchId: String(raw.id ?? raw.matchId ?? ""),
    map: normalizeMapName(jogos.map_name ?? jogos.map ?? "Desconhecido"),
    playedAt: parseDate(raw.data ?? raw.date),
    scoreTeamA: toNumber(jogos.score_a),
    scoreTeamB: toNumber(jogos.score_b),
    durationSeconds: 0,
    players,
  };
}

function normalizeTeam(
  entries: GamersClubPlayerMatchEntry[] | undefined,
  team: "A" | "B",
): SyncMatchInput["players"] {
  if (!Array.isArray(entries)) return [];

  return entries.map((entry) => {
    const player = entry.player ?? {};
    const steamId = player.plSteamID64 ?? player.plSteamID;
    const gamersClubId = player.id !== undefined ? String(player.id) : undefined;

    return {
      steamId: steamId ? String(steamId) : `gc_${gamersClubId ?? "unknown"}`,
      gamersClubId,
      nickname: player.nick ?? player.nickname ?? "Desconhecido",
      avatarUrl: toAbsoluteUrl(player.avatar),
      levelGc: player.level !== undefined ? toNumber(player.level) : undefined,
      team,
      kills: toNumber(entry.nb_kill ?? entry.kills),
      deaths: toNumber(entry.death ?? entry.deaths),
      assists: toNumber(entry.assist ?? entry.assists),
      headshots: toNumber(entry.hit_headshots ?? entry.headshots),
      adr: toNumber(entry.adr),
      kast: toNumber(entry.pkast ?? entry.kast),
      entryKills: toNumber(entry.firstkill),
      entryDeaths: 0,
      tradeKills: toNumber(entry.trade),
    };
  });
}

/**
 * A API da GC devolve números como string (`"16"`, `"114.06"`) — aceita number ou
 * string e nunca lança; qualquer coisa não numérica vira 0 em vez de quebrar a partida
 * inteira por causa de um campo excêntrico.
 */
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

/**
 * `player.avatar` na GC é um path relativo (`players/avatar/757573/757573`), não uma
 * URL — nosso schema exige URL completa (`z.string().url()`). Sem uma confirmação de
 * qual CDN/extensão usar (ver avatarHtml no payload real, que sugere
 * static.gamersclub.com.br + "_medium.jpg", mas isso não é garantido), a opção segura
 * é omitir em vez de adivinhar um link possivelmente errado. Só passa adiante se já
 * vier absoluta.
 */
function toAbsoluteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.startsWith("http://") || value.startsWith("https://") ? value : undefined;
}

/**
 * A GC manda o nome técnico do mapa (`"de_overpass"`), não o nome de exibição
 * (`"Overpass"`) usado pelo catálogo semeado em `prisma/seed.ts`. Sem esse alias, cada
 * partida real cria uma linha de `Map` nova e duplicada ("de_overpass" ao lado de
 * "Overpass"), fragmentando winrate/ranking por mapa. Nomes fora da lista passam
 * direto (não lança) — cobre mapas novos que ainda não estejam no catálogo.
 */
const MAP_NAME_ALIASES: Record<string, string> = {
  de_dust2: "Dust2",
  de_mirage: "Mirage",
  de_inferno: "Inferno",
  de_nuke: "Nuke",
  de_overpass: "Overpass",
  de_vertigo: "Vertigo",
  de_ancient: "Ancient",
  de_anubis: "Anubis",
  de_train: "Train",
};

function normalizeMapName(rawName: string): string {
  return MAP_NAME_ALIASES[rawName.toLowerCase()] ?? rawName;
}

/**
 * A GC manda `"data": "20/07/2026 19:22"` (DD/MM/YYYY HH:mm, sem timezone) — formato
 * que `new Date()` nativo não entende de forma confiável (ambíguo com MM/DD). Parseia
 * esse formato explicitamente antes de cair no parser nativo (que ainda cobre o
 * formato ISO usado pelos fixtures de demo).
 */
function parseDate(value: string | undefined): Date {
  if (!value) return new Date();

  const brFormat = value.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})/);
  if (brFormat) {
    const [, day, month, year, hour, minute] = brFormat;
    const parsed = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)),
    );
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
