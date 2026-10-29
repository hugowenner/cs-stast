# GLOSSÁRIO TÁTICO DE CS2 & DIRETRIZES DE USO

Esta referência estabelece o significado técnico estrito dos termos de CS2. Ela orienta o uso correto do vocabulário quando necessário, SEM obrigar a inclusão de jargão desnecessário.

---

### 1. TR e CT (Lados Táticos)
- **Definição:** Terroristas (TR, atacantes cujo objetivo é plantar a C4 ou eliminar os defensores) e Contra-Terroristas (CT, defensores cujo objetivo é impedir o plant, desarmar a C4 ou eliminar os atacantes).
- **Dados necessários para avaliar:** Rounds disputados e vencidos separadamente em cada metade (lado TR vs lado CT) na súmula.
- **O que NÃO pode ser inferido de estatísticas agregadas:** Não inferir deficiência crônica em um lado se a amostragem de rounds jogados naquele lado for baixa ou se o mapa for historicamente assimétrico no meta geral.
- **Exemplo de uso adequado:** "Na Inferno, o grupo disputou mais rounds como CT, mas as súmulas agregadas não discriminam o aproveitamento em cada metade para avaliar se houve assimetria de lado."

---

### 2. Entry Kill / First Kill (Primeira Eliminação do Round)
- **Definição:** A primeira eliminação que abre o placar de baixas do round, independentemente do lado (TR ou CT) ou de quem a conquistou.
- **Dados necessários para avaliar:** Registro com timestamp da primeira eliminação ocorrida em cada round.
- **O que NÃO pode ser inferido de estatísticas agregadas:** Obter alto volume de first kills NÃO comprova que o jogador atua como "entry fragger" de função fixa (pode ter conseguido first kills em confrontos passivos na defesa CT ou duelos fortuitos).
- **Exemplo de uso adequado:** "PERNA PELUDA somou alto volume de first kills na temporada, mas os dados não diferenciam aberturas ativas como TR de primeiros combates defensivos como CT."

---

### 3. Opening Duel e Opening Winrate (Duelos e Conversão de Abertura)
- **Definição:**
  - *Opening Duel:* O primeiro confronto 1v1 que resulta em morte no round.
  - *Opening Winrate (%):* Taxa de sucesso nesses primeiros confrontos ($\frac{\text{First Kills}}{\text{First Kills} + \text{First Deaths}} \times 100$).
- **Dados necessários para avaliar:** Registro completo e pareado de First Kills (vitórias na abertura) E First Deaths (mortes sofridas na abertura) em cada round.
- **O que NÃO pode ser inferido de estatísticas agregadas:** Se a plataforma registra apenas First Kills e não coleta First Deaths, a taxa percentual de conversão de aberturas é **matematicamente incalculável**. Ter muitas first kills brutas não significa ter taxa de vitória positiva em aberturas.
- **Exemplo de uso adequado:** "O aproveitamento em aberturas permanece indisponível na súmula, pois as mortes de abertura (first deaths) não foram registradas."

---

### 4. Trade Kill / Refrag e Morte Trocada
- **Definição:**
  - *Trade Kill (Refrag):* Eliminação sobre o oponente realizada em até 3 a 5 segundos após a morte de um companheiro de equipe próximo.
  - *Morte Trocada:* A morte sofrida por um aliado cujo algoz foi eliminado em seguida por outro colega, anulando a desvantagem numérica.
- **Dados necessários para avaliar:** Log de eventos com carimbos de tempo em milissegundos e proximidade espacial entre os jogadores no servidor.
- **O que NÃO pode ser inferido de estatísticas agregadas:** K/D equilibrado ou alto KAST não prova que o time é eficiente em refrags. Morte trocada NÃO é a mesma coisa que trade kill (uma é sofrida e compensada; a outra é a baixa aplicada). Se a telemetria estiver zerada na súmula, não inferir lentidão de resposta do grupo.
- **Exemplo de uso adequado:** "Como as súmulas não registram eventos de refrag com timestamp, não há como medir a velocidade com que o grupo responde às baixas sofridas."

---

### 5. Retake e Pós-Plant
- **Definição:**
  - *Retake:* Situação em que os defensores CT tentam retomar um bombsite onde a C4 já foi plantada para realizar o desarme.
  - *Pós-Plant:* Posicionamento defensivo e gerenciamento de ângulos dos TRs após a C4 ser plantada para impedir o desarme.
- **Dados necessários para avaliar:** Evento de plant da C4, tempo decorrido, número de jogadores vivos de cada time no momento do plant e desfecho (defuse ou explosão).
- **O que NÃO pode ser inferido de estatísticas agregadas:** Winrate de mapa ou saldo negativo de rounds não revelam se as derrotas ocorreram em retakes mal sucedidos ou em pós-plants perdidos.
- **Exemplo de uso adequado:** "A Mirage teve aproveitamento de 33,3%, mas as súmulas não registram dados de pós-plant ou retake para isolar qual dessas fases pesou nos resultados."

---

### 6. Execução e Default
- **Definição:**
  - *Default:* Estrutura tática inicial em que os TRs se espalham pelo mapa para colher informação, gastar utilitárias adversárias e conter avanços agressivos dos CTs antes de tomar uma decisão.
  - *Execução:* Entrada coordenada e sincronizada em um bombsite específico com uso de smokes, flashes e molotovs planejadas.
- **Dados necessários para avaliar:** Posicionamento contínuo dos 5 jogadores ao longo do tempo (coordenadas x,y da demo) e registro de lançamento de granadas.
- **O que NÃO pode ser inferido de estatísticas agregadas:** Poucos rounds TR ou derrotas elásticas não provam falta de default ou execuções mal coordenadas.
- **Exemplo de uso adequado:** "Sem os registros de movimentação e utilitárias da demo, não é possível diagnosticar se os rounds TR pecaram na leitura de mapa em default ou na execução final."

---

### 7. Controle de Mapa
- **Definição:** Domínio físico e visual de setores neutros e cruciais do mapa (ex.: meio na Mirage, banana na Inferno, meio/rua na Ancient) para negar espaço e mobilidade ao adversário.
- **Dados necessários para avaliar:** Zonas de presença de jogadores, linhas de visão e consumo de utilitárias de contenção ao longo dos primeiros 45 segundos do round.
- **O que NÃO pode ser inferido de estatísticas agregadas:** Winrate baixo em um mapa NÃO permite deduzir que a equipe perdeu o controle do meio ou cedeu espaço estratégico.
- **Exemplo de uso adequado:** "O número de derrotas na Ancient mostra dificuldade no mapa, mas não identifica se o grupo teve ou não controle das áreas centrais."

---

### 8. Vantagem Numérica
- **Definição:** Situação no decorrer do round em que um time tem superioridade no número de jogadores vivos (ex.: 5v4, 4v2, 3v1).
- **Dados necessários para avaliar:** Linha do tempo sequencial de mortes em cada round para calcular a taxa de conversão de rounds disputados em superioridade numérica.
- **O que NÃO pode ser inferido de estatísticas agregadas:** O placar final ou o saldo de rounds não indica se a equipe desperdiçou vantagens numéricas ou se foi dominada desde o início dos rounds.
- **Exemplo de uso adequado:** "Para avaliar se o grupo converteu rounds com vantagem de homens vivos, é necessária a auditoria da demo round a round."

---

### 9. Eco, Force e Compra Completa (Economia)
- **Definição:**
  - *Eco:* Rodada em que a equipe quase não investe créditos para garantir compra completa no round subsequente.
  - *Force (Compra Forçada):* Investimento do dinheiro disponível em armamentos intermediários (submetralhadoras, pistolas fortes, colete) mesmo sem economia para compra ideal.
  - *Compra Completa (Full Buy):* Investimento máximo com rifles principais (AK-47, M4, AWP), colete e kit utilitário completo.
- **Dados necessários para avaliar:** Dinheiro inicial de cada jogador e custo total do equipamento adquirido no início de cada round.
- **O que NÃO pode ser inferido de estatísticas agregadas:** Sequências de derrotas não provam que houve 'force buys' precipitados sem o registro econômico round a round.
- **Exemplo de uso adequado:** "As súmulas não guardam o histórico econômico dos rounds para avaliar se as compras forçadas afetaram as sequências de pontos."

---

### 10. Rotação
- **Definição:** Deslocamento tático planejado ou reativo de jogadores entre setores ou bombsites em resposta a informações sonoras, visuais ou perdas de companheiros.
- **Dados necessários para avaliar:** Posições instantâneas dos jogadores no radar e linhas de tempo de movimentação.
- **O que NÃO pode ser inferido de estatísticas agregadas:** Perder rounds defensivos não permite dizer que a rotação dos defensores foi lenta, atrasada ou precipitada.
- **Exemplo de uso adequado:** "O resultado das partidas aponta derrotas na defesa, mas os dados não registram o timing das rotações para justificar os pontos cedidos."

---

### 11. Clutch
- **Definição:** Situação em que o último jogador sobrevivente de uma equipe precisa vencer o round enfrentando um ou mais oponentes vivos (1v1, 1v2, 1vX).
- **Dados necessários para avaliar:** Registro de isolamento do jogador sobrevivente, quantidade de adversários restantes, tempo restante e desfecho da rodada.
- **O que NÃO pode ser inferido de estatísticas agregadas:** Se a contagem de clutches da súmula estiver zerada, isso reflete **ausência de telemetria/parser de 1vX na plataforma**, e NUNCA que os jogadores foram incapazes de vencer situações sob pressão.
- **Exemplo de uso adequado:** "A estatística de clutches está zerada nas súmulas deste período por falta de telemetria da plataforma; não há base para julgar o rendimento em 1vX."

---

### 12. Métricas Quantitativas do Sistema
- **Rating 2.0:** Indicador composto de desempenho individual por round (dano, aberturas, sobrevivência, KAST). É uma média aritmética e **não mede regularidade** round a round.
- **ADR (Average Damage per Round):** Dano médio causado a cada round. Mede poder de fogo e desgaste imposto ao adversário, mas não reflete se o dano gerou eliminações ou foi curado/ineficaz.
- **K/D:** Razão matemática simples ($\frac{\text{Kills}}{\text{Deaths}}$). Não considera assistências, trocas nem o contexto econômico em que as eliminações ocorreram.
- **KAST (%):** Percentual de rounds em que o jogador obteve pelo menos uma Eliminação (*Kill*), Assistência (*Assist*), Sobreviveu (*Survived*) ou teve sua Morte Trocada (*Traded*). Mede presença ativa, mas não impacto de desempate.
- **HS% (Headshot Percentage):** Percentual de eliminações cujo golpe de misericórdia foi um tiro na cabeça. Mede letalidade do disparo final, não a precisão de todos os tiros disparados.
- **ELO GC:** Pontuação de nível no matchmaking competitivo da Gamers Club. Mede patamar competitivo geral do jogador na plataforma.
- **Season Score 3.5:** Pontuação ponderada oficial da temporada calculada sobre o Rating 2.0, aplicando **amortecimento bayesiano** em direção à média 1.00 com base no volume de partidas jogadas. Valoriza amostras robustas frente a médias infladas por poucos jogos.
- **Exemplo de uso adequado:** "PERNA PELUDA lidera o ranking oficial com Season Score 3.5 ajustado de 1.14 (baseado em Rating 2.0 médio de 1.17 em 68 partidas)."
