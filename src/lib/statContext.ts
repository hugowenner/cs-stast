// Frases de contexto por faixa de valor — complementam a métrica, nunca a substituem.
// Regras simples de mapeamento, sem lógica de negócio: ver docs combinados com o produto.

export function winrateContext(value: number): string {
  if (value >= 55) return "🔥 Tá achando o caminho das vitórias";
  if (value >= 45) return "⚔️ Na briga, mas falta fechar alguns rounds";
  return "🔧 Hora de ajustar algumas peças";
}

export function ratingContext(value: number): string {
  if (value >= 1.2) return "🔥 Impacto de protagonista";
  if (value >= 1.0) return "😎 Consistente no servidor";
  if (value >= 0.85) return "⚙️ Dá pra buscar mais impacto";
  return "🔍 Momento de revisar decisões";
}

export function hsContext(value: number): string {
  if (value >= 55) return "🎯 Mão calibrada";
  if (value >= 45) return "🎯 Boa precisão";
  return "🔧 Treino de mira sempre ajuda";
}

export function adrContext(value: number): string {
  if (value >= 90) return "💥 Pressão o jogo inteiro";
  if (value >= 75) return "⚔️ Causando impacto";
  return "📈 Dá pra aparecer mais nos rounds";
}

export function kastContext(value: number): string {
  if (value >= 75) return "🧠 Sempre participando";
  if (value >= 65) return "🤝 Ajuda o time";
  return "🔄 Buscar mais presença nos rounds";
}
