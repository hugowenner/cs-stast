/**
 * Sanitiza o nickname de um jogador, removendo símbolos de nível GC (ex: ⑰, ⑪),
 * badges (ex: ✓, ✔) e estrelas (ex: ★, ☆) adicionados pela extensão da Gamers Club.
 */
export function sanitizeNickname(nickname: string): string {
  if (!nickname) return nickname;

  // Expressão regular para remover:
  // 1. Números circulados (Unicode range \u2460-\u24ff e \u3251-\u325f)
  // 2. Símbolos comuns: ✓, ✔, ★, ☆, ✗, ✘
  const sanitized = nickname.replace(/[\u2460-\u24ff\u3251-\u325f✓✔★☆✗✘]/g, "");

  // Remove espaços extras nas extremidades
  return sanitized.trim();
}
