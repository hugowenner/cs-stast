// Modo Narrador CS — textos narrativos para os cards do CS2 Stats Hub.
// Somente constantes. Sem lógica, sem dependências externas.

export const recordNarratives: Record<string, { headline: string; quote: string }> = {
  "Recorde de Rating": {
    headline: "O lobby percebeu tarde demais",
    quote: "Quando entenderam quem estava jogando, o placar já tinha contado a história.",
  },
  "Maior K/D em Jogo": {
    headline: "Precisão cirúrgica",
    quote: "Poucas oportunidades dadas. Muitas respostas encontradas.",
  },
  "Maior ADR em Jogo": {
    headline: "O dano falou sozinho",
    quote: "O impacto apareceu antes mesmo do placar final.",
  },
  "Recorde de Kills": {
    headline: "Dono do placar",
    quote: "Quando alguém precisava aparecer, apareceu.",
  },
  "Maior HS% em Jogo": {
    headline: "Primeira bala sem conversa",
    quote: "A mira estava trabalhando bem acima do esperado.",
  },
  "Maior Sequência de Vitórias": {
    headline: "Modo campeonato ativado",
    quote: "Sequência que o grupo inteiro tentou parar — e não conseguiu.",
  },
  "Pico de Rating do Hub": {
    headline: "O número que o Hub registrou",
    quote: "O servidor descobriu um problema nesse dia.",
  },
  "Maior Impacto em Jogo": {
    headline: "Os outros 9 eram figurantes",
    quote: "Partida em que os números deixaram de ser estatística.",
  },
  "Mais MultiKills na Temporada": {
    headline: "Limpou round atrás de round",
    quote: "Sem pedir licença. Sem pedir desculpa.",
  },
  "Maior Dano em Jogo": {
    headline: "Jogou como se cada round valesse muito",
    quote: "O time adversário ainda está tentando entender de onde vinha.",
  },
  "Maior Clutch na Temporada": {
    headline: "Sangue frio registrado",
    quote: "Enquanto todo mundo calculava o problema, ele resolveu.",
  },
  "Maior Consistência na Temporada": {
    headline: "Máquina de estabilidade",
    quote: "Sem muita novela. Só entregando resultado.",
  },
};

export const performanceNarratives = {
  positive: [
    { headline: "O servidor percebeu", tagline: "Os números confirmam o que o lobby já sabia." },
    { headline: "Momento de confiança", tagline: "Fase em que tudo parece mais fácil — aproveita." },
    { headline: "Gráfico subindo", tagline: "A evolução não é coincidência." },
    { headline: "Desempenho de referência", tagline: "Esses dados vão aparecer no histórico." },
    { headline: "Tudo encaixando", tagline: "Mira, posicionamento e timing — tudo junto." },
  ],
  negative: [
    { headline: "A mira pediu folga", tagline: "Fase que o banco registra e o jogador prefere esquecer." },
    { headline: "Os números abriram investigação", tagline: "Alguém precisa ter uma conversa séria com a mira." },
    { headline: "Fase de recalibrar", tagline: "Acontece com todo mundo — mas o banco não esquece." },
    { headline: "O adversário agradece", tagline: "Esse período vai servir de aprendizado." },
    { headline: "Mouse pediu explicações", tagline: "Números que o próprio jogador prefere não ver." },
  ],
};

export const mapNarratives = {
  dominant: [
    { headline: "Território particular", tagline: "Esse mapa já parece sala de treino." },
    { headline: "Casa própria", tagline: "Quando cai aqui, o coração acelera — do lado certo." },
    { headline: "Solo proibido", tagline: "Adversários que caem aqui costumam arrepender." },
    { headline: "Conforto total", tagline: "O timing nesse mapa é de outro nível." },
    { headline: "Aqui é território", tagline: "O placar faz sentido quando você olha o mapa." },
  ],
  struggle: [
    { headline: "Área complicada", tagline: "Talvez seja hora de rever a estratégia." },
    { headline: "Mapa inimigo", tagline: "Esse mapa não está no cardápio favorito." },
    { headline: "Solo de sofrimento", tagline: "Os dados mostram. O feeling confirma." },
    { headline: "Aqui os rounds somem", tagline: "Winrate que explica muita coisa." },
    { headline: "Problema por resolver", tagline: "Vai precisar de mais uma sessão de treino." },
  ],
};

export const duoNarratives = [
  { headline: "Parceiros de crime", tagline: "Quando esses dois entram juntos, o servidor percebe." },
  { headline: "Combinação explosiva", tagline: "Dupla que os adversários tentam separar — e não conseguem." },
  { headline: "Sinergia comprovada", tagline: "Os números mostram o que o lobby já sabia." },
  { headline: "Timing sincronizado", tagline: "Parece combinado, mas é só muita partida juntos." },
  { headline: "Parceria ativa", tagline: "Essa dupla faz o server sentir." },
];

export const rivalryNarratives = [
  { headline: "História mal resolvida", tagline: "Alguns confrontos deixam de ser estatística." },
  { headline: "Conta pendente", tagline: "Esse duelo já virou assunto fixo no lobby." },
  { headline: "Rivalidade registrada", tagline: "O banco guardou cada round desse confronto." },
  { headline: "Nunca é só um jogo", tagline: "Quando esses dois se encontram, algo acontece." },
  { headline: "Duelo gelado", tagline: "Tensão que o placar não explica completamente." },
];

export const coachNarratives = {
  title: "TACTICAL AI",
  subtitle: "Análise tática baseada em dados — o coach não passa pano.",
  summaryTitle: "ANALYSIS COMPLETE",
  summarySubtitle: "Relatório baseado nas partidas registradas da temporada.",
  progressMessages: [
    "Conferindo se a mira estava online...",
    "Procurando onde os rounds escaparam...",
    "Preparando aquele feedback difícil...",
    "Investigando quem carregou e quem pegou carona...",
    "Calculando o quanto custou entrar no smoke...",
    "Vendo em qual mapa o sofrimento foi maior...",
    "Analisando com quem você joga melhor...",
    "Cruzando a tendência recente com o histórico...",
    "Revisando os últimos confrontos diretos...",
    "Verificando se a mira tava fria ou no modo deus...",
    "Separando elogio de puxão de orelha...",
    "Investigando os rounds que definiram tudo...",
    "Montando o relatório tático...",
    "Verificando se a fase tá boa ou se precisa de treino...",
    "Pesando cada round como se valesse o título...",
    "Medindo consistência da temporada...",
    "Passando pelos padrões que aparecem toda partida...",
    "Traduzindo número em feedback real...",
  ],
};

// Taglines sob métricas — "o dado nunca muda, só a forma de contar a história"
export const statTaglines: Record<string, (value: string | number) => string> = {
  rating:    () => "Hoje o servidor teve um protagonista.",
  winrate82: () => "Os adversários já entram fazendo conta.",
  adr110:    () => "Todo round alguém saiu machucado.",
  clutch19:  () => "Quando sobra só um, começa o problema.",
  hs60:      () => "Primeira bala, melhor lugar.",
  kd15:      () => "Mais kills do que mortes. O lobby notou.",
  streak5:   () => "Cinco seguidas. Alguém precisava parar.",
};

// Taglines contextual por valor de rating
export function getRatingTagline(rating: number): string {
  if (rating >= 1.4) return "Hoje o servidor teve um protagonista.";
  if (rating >= 1.2) return "Números que o lobby não ignora.";
  if (rating >= 1.0) return "Consistente. O banco registrou.";
  if (rating >= 0.85) return "A mira está pedindo férias.";
  return "O adversário agradece pela partida.";
}

// Taglines contextual por winrate
export function getWinrateTagline(wr: number): string {
  if (wr >= 80) return "Os adversários já entram fazendo conta.";
  if (wr >= 65) return "Mais vitórias do que derrota. O padrão tá lá.";
  if (wr >= 50) return "Equilibrado. Uma decisão muda tudo.";
  return "O placar pediu uma revisão de estratégia.";
}

// Taglines contextual por ADR
export function getADRTagline(adr: number): string {
  if (adr >= 100) return "Todo round alguém saiu machucado.";
  if (adr >= 80)  return "Dano consistente. O time sentiu.";
  if (adr >= 60)  return "Contribuição presente. Pode melhorar.";
  return "O dano sumiu em algum lugar.";
}

export const trendNarratives = {
  hotStreak: {
    headline: "Modo deus confirmado",
    tagline: "Tentaram parar — não conseguiram.",
  },
  coldStreak: {
    headline: "Fase de reconstrução",
    tagline: "O banco registrou. O mouse provavelmente já sabe.",
  },
  mapBest: {
    headline: "Território dominado",
    tagline: "Aqui a história é sempre a mesma.",
  },
  mapWorst: {
    headline: "Onde a bala passa longe",
    tagline: "Os dados pedem uma revisão estratégica.",
  },
};
