# CS2 Stats — análise dos dados de outubro de 2026

O momento recente é pior que o bloco anterior, apesar de uma pequena recuperação nas últimas dez partidas. A temporada tem 54 vitórias e 59 derrotas, mas saldo de +29 rounds: vocês conseguem acumular rounds sem convertê-los em vitórias na mesma proporção. A primeira prioridade é revisar derrotas por margem curta, começando por Anubis e Inferno, para identificar decisões concretas que possam ser trabalhadas. A súmula não identifica a causa dessas derrotas.

## 1. Escopo, atualização e qualidade

Captura consistente: **29/10/2026, 16:30:16 (America/Sao_Paulo)**, obtida em uma única transação PostgreSQL REPEATABLE READ READ ONLY; transaction_read_only confirmado como on. Destino autorizado e validado no script: localhost:5432/cs2_stats_dev_snapshot_20260920. O servidor retorna endereço interno Docker 172.19.0.2:5432. Temporada ativa: Outubro/2026, ID cmuow54kq223v01rxwlfgd6o9, de 01/10 a 31/10 no fuso local. A equivalência com produção foi aceita conforme informado. Nenhum acesso à produção, sincronização, migration, reprocessamento ou chamada externa de IA foi realizado. Apenas arquivos locais de análise foram criados.

Última partida registrada: **29/10/2026 às 03:01**, Ancient, GC 28184116, ID cmvszufu202dh01mc3z2dfrnf. Há logs de importação SUCCESS até 29/10 às 18:25:06, posteriores ao relógio da captura (16:30:16). Isso é uma inconsistência cronológica entre metadados e relógio consultado; não prova dados futuros nem autoriza afirmar atualização até 18:25. O corte de conteúdo esportivo é a última partida acima. O nome do banco, contendo 20260920, também não representa seu corte atual. Existem 285 payloads de parser no banco inteiro, versão 0.41.4/schema 1.0.0, com atualização máxima em 27/10 às 14:21; essa contagem global não representa cobertura da temporada.

| Universo — partidas únicas | N |
| --- | --- |
| Total da temporada | 182 |
| Sem monitorados ativos | 12 |
| Um monitorado | 56 |
| Dois a quatro, mesmo time | 74 |
| Cinco, mesmo time | 39 |
| Monitorados em lados opostos | 1 |
| Desconhecidos/não classificáveis | 0 |
| Coletivas elegíveis: 74 + 39 | 113 |

Reconciliação: 12 + 56 + 74 + 39 + 1 = 182. Há 13 monitorados, todos atualmente ativos e vinculados; 12 têm partidas em outubro, aln não tem. Foram extraídas 490 linhas jogador-partida de monitorados, que não são 490 partidas. O critério coletivo reproduz o Radar do projeto: pelo menos dois ativos no mesmo time e nenhum no adversário, dentro da seleção de partidas monitoradas. O confronto interno não recebe vitória coletiva. A classificação usa a lista ativa atual; não existe histórico completo de ativação para reconstruir cada elenco monitorado à época.

Em duas partidas, trackedPlayersCount persistido é 4, mas há cinco monitorados atuais na súmula: cmv03safr00y801lguyrzb0dv e cmv024fx000bt01lg67wzi2ke. A contagem é congelada na ingestão; Zeny foi cadastrado durante a temporada, o que é compatível com a diferença, sem provar sua causa. Ambas continuam elegíveis pelo limiar de dois; a distribuição 4/5 deste relatório usa os participantes ativos atuais, como o Radar. Não houve correção no banco. Mapas e tamanhos de formação fecham em 113; V/E/D fecham em 54/0/59.

**Definições.** Aproveitamento coletivo = vitórias/partidas, conforme Radar. Empates permanecem no denominador; como não há empates, considerar meio ponto por empate daria os mesmos resultados. Rating é a aproximação local de Rating 2.0, não a fórmula proprietária HLTV. Rounds individuais = scoreTeamA + scoreTeamB, conforme ingestão; podem superestimar exposição se houve saída/substituição. ADR e KAST abaixo são ponderados por esses rounds, K/D = soma de kills/soma de mortes e HS% = soma de headshots/soma de kills. Rating médio é simples por partida, preservando o cálculo do sistema. Dispersão = desvio-padrão populacional entre partidas; não mede incerteza da média.

A fórmula é Impact = 2,13×KPR + 0,42×APR − 0,41; Rating = 0,0073×KAST + 0,3591×KPR − 0,5329×DPR + 0,2372×Impact + 0,0032×ADR + 0,1587, arredondado a duas casas. As 490 linhas foram conferidas contra a fórmula, sem divergências acima de 0,011. O Rating zero de Crals em cmuyta3aq00tt01pfp8eiu1ir é compatível com 3/15, ADR 22,76 e KAST 24; foi mantido, não tratado como ausência.

Rating ajustado R̂ = 1 + N/(N+10)×(R−1). Score oficial = R̂ + 0,15×[(W+5)/(N+10)−0,5], com empate valendo 0,5 em W; elegibilidade N≥10 no universo selecionado pelo sistema. São métricas diferentes do Rating bruto usado aqui. eloBefore/eloAfter são calculados pelo serviço ELO local a partir de resultados/Rating; não devem ser chamados de ELO GC. gcRating vem de rating_points, observado entre −40 e +40, não é o ELO absoluto nem Rating 2.0. Não há base para analisar uma trajetória de ELO GC absoluto.

## 2. Momento coletivo

| Recorte | Intervalo das partidas (BRT) | N | V–E–D | Aproveit. | Rounds G:P | Saldo |
| --- | --- | --- | --- | --- | --- | --- |
| Temporada | 01/10/2026, 19:35:00 a 29/10/2026, 03:01:00 | 113 | 54–0–59 | 47,8% | 1255:1226 | 29 |
| Últimas 10 | 27/10/2026, 22:31:00 a 29/10/2026, 03:01:00 | 10 | 4–0–6 | 40,0% | 113:116 | -3 |
| 10 anteriores | 25/10/2026, 18:32:00 a 27/10/2026, 21:59:00 | 10 | 3–0–7 | 30,0% | 117:119 | -2 |
| Últimas 20 | 25/10/2026, 18:32:00 a 29/10/2026, 03:01:00 | 20 | 7–0–13 | 35,0% | 230:235 | -5 |
| 20 anteriores | 20/10/2026, 19:59:00 a 24/10/2026, 16:54:00 | 20 | 12–0–8 | 60,0% | 231:203 | 28 |

Últimas dez versus dez anteriores: **+10 pontos percentuais**, mas saldo −3 versus −2: uma vitória a mais não veio acompanhada de domínio maior em rounds. Últimas vinte versus vinte anteriores: **−25 p.p.**, saldo −5 versus +28. As dez estão contidas nas últimas vinte; esses recortes não são evidências independentes. Um bloco de dez é pequeno e não estabelece uma trajetória sustentada.

| Janela móvel até a captura | Partidas efetivamente observadas | N | V–E–D | Aproveit. | Rounds G:P | Saldo |
| --- | --- | --- | --- | --- | --- | --- |
| 22/10 16:30 a 29/10 16:30 | 22/10/2026, 17:56:00 a 29/10/2026, 03:01:00 | 30 | 12–0–18 | 40,0% | 335:337 | -2 |
| 15/10 16:30 a 22/10 16:30 | 15/10/2026, 19:34:00 a 21/10/2026, 21:40:00 | 28 | 16–0–12 | 57,1% | 325:287 | 38 |

Queda semanal de **17,1 p.p.**, com volume semelhante (30 versus 28), mas mapas, adversários e formações não foram controlados. São janelas de sete dias corridos de 168 horas, não semanas do calendário; sobrepõem-se aos blocos por partidas.

| Margem final absoluta | Vitórias | Derrotas | Total |
| --- | --- | --- | --- |
| 1–2 rounds | 2 | 16 | 18 |
| 3–5 rounds | 26 | 25 | 51 |
| 6+ rounds | 26 | 18 | 44 |

Somente 18/113 jogos (15,9%) acabaram a até dois rounds; portanto, a maioria dos jogos não foi apertada. Porém, nesse subconjunto o resultado foi 2V–16D; com cinco monitorados, 0V–9D. Nos últimos vinte: 0V–5D por até dois rounds, 4V–6D por 3–5 e 3V–2D por 6+. As vitórias largas compensam parte das derrotas no saldo: na temporada, o grupo ganhou 50,6% dos rounds; nas últimas vinte, 49,5%, mas venceu apenas 35% dos jogos. Isso descreve a distribuição, sem estabelecer erro de fechamento, azar ou causa psicológica.

Há um 13–0 coletivo em Dust2, cmvr7yjks008l01pbx6vyj4dm, sem sequência de rounds utilizável. Foi mantido no universo oficial; não é possível determinar só pela súmula se foi resultado administrativo. Excluí-lo exploratoriamente muda a temporada para 53/112 vitórias (47,3%), saldo +16; últimas vinte para 6/19 (31,6%), saldo −18. A leitura de momento pior não depende desse resultado.

## 3. Mapas e formações

| Mapa | N | V–E–D | Aproveit. | Rounds G:P | Saldo | Nos últimos 20 coletivos | Restante anterior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inferno | 28 | 16–0–12 | 57,1% | 315:266 | 49 | 2/6 (33,3%) | 14/22 (63,6%) |
| Ancient | 21 | 9–0–12 | 42,9% | 227:238 | -11 | 2/5 (40,0%) | 7/16 (43,8%) |
| Anubis | 18 | 7–0–11 | 38,9% | 207:220 | -13 | 0/3 (0,0%) | 7/15 (46,7%) |
| Cache | 15 | 9–0–6 | 60,0% | 170:149 | 21 | 1/3 (33,3%) | 8/12 (66,7%) |
| Overpass | 11 | 5–0–6 | 45,5% | 125:131 | -6 | 1/2 (50,0%) | 4/9 (44,4%) |
| Mirage | 9 | 3–0–6 | 33,3% | 92:101 | -9 | Sem jogos | 3/9 (33,3%) |
| Dust2 | 7 | 3–0–4 | 42,9% | 76:76 | 0 | 1/1 (100,0%) | 2/6 (33,3%) |
| Nuke | 4 | 2–0–2 | 50,0% | 43:45 | -2 | Sem jogos | 2/4 (50,0%) |

As linhas somam 113 jogos, 54 vitórias e 59 derrotas, com 1.255:1.226 rounds. Cache é o nome de apresentação de de_cache, sem fusão com outro registro. Inferno reúne maior volume e saldo (+49), um ponto forte observado da temporada; seus 2/6 recentes contrastam com 14/22 anteriores, mas seis jogos ainda são pouco. Cache tem 60%, porém apenas quinze partidas. Anubis combina volume relevante (18), 7V–11D e saldo −13; é uma boa prioridade de revisão, sem declarar que é o pior mapa. Mirage tem 3/9, mas não participou dos últimos vinte: não explica a queda desse bloco. Comparações recentes usam apenas jogos do mapa dentro das últimas vinte coletivas, não as últimas vinte de cada mapa.

Não há eleição de melhor mapa nem teste de significância. Como ilustração exploratória da incerteza, intervalos de Wilson de 95% para a fração de vitórias: Inferno ≈39–74%, Cache ≈36–80%, Anubis ≈20–61%. São amplos e sobrepostos; pressupõem observações Bernoulli independentes, aproximação limitada pela repetição de jogadores e sessões.

| Monitorados no mesmo time | N | V–E–D | Aproveit. | Rounds G:P | Saldo |
| --- | --- | --- | --- | --- | --- |
| 2 | 19 | 10–0–9 | 52,6% | 221:194 | 27 |
| 3 | 26 | 10–0–16 | 38,5% | 259:295 | -36 |
| 4 | 29 | 16–0–13 | 55,2% | 333:310 | 23 |
| 5 | 39 | 18–0–21 | 46,2% | 442:427 | 15 |

Quatro monitorados apresentam maior percentual que cinco (55,2% versus 46,2%), mas isso não demonstra que completar o time piora resultados. Não há ajuste por dificuldade dos adversários, mapa ou período. Os três monitorados têm 38,5% e saldo −36; é um recorte para investigar, não uma recomendação de evitar trios.

| Formação exata de monitorados (companheiros não monitorados podem variar) | N | V–D | Rounds |
| --- | --- | --- | --- |
| Bago Direito + Flp + PERNA PELUDA + TG. + TRAVIS SCOUTTT | 7 | 2–5 | 77:86 |
| Flp + PERNA PELUDA | 6 | 2–4 | 68:70 |
| Flp + PERNA PELUDA + TRAVIS SCOUTTT | 5 | 3–2 | 60:50 |
| Flp + PERNA PELUDA + TG. + TRAVIS SCOUTTT | 5 | 3–2 | 62:55 |

Nenhuma formação exata alcança dez partidas; a mais frequente tem sete. As demais formações exatas, com menos de cinco partidas cada, somam 90 jogos. A formação Flp + PERNA PELUDA + TG. + TRAVIS SCOUTTT + Tuf Tuf teve 0/3, todos na madrugada de 29/10: não são três noites independentes nem evidência para trocar jogadores.

Duplas/trios inclusivos oferecem mais volume, mas repetem partidas das formações maiores: Flp + PERNA PELUDA, 21V/51; Flp + TG., 18V/43; Flp + PERNA PELUDA + TG., 8V/25; Flp + PERNA PELUDA + TRAVIS SCOUTTT, 10V/24. O resultado do trio Flp/PERNA/TG. merece revisar o contexto, porém não isola efeito de entrosamento. Essas contagens se sobrepõem e não somam 113.

## 4. Desempenho individual

Todas as partidas da temporada de cada monitorado, incluindo solo e o confronto interno. Participação é N/182; rounds de jogadores diferentes se sobrepõem, portanto não devem ser somados como rounds do grupo. ≥1,00 é uma referência descritiva da fórmula; <0,80 é um corte exploratório para localizar partidas de baixo Rating, não um padrão de função ou obrigação individual.

| Jogador | N (% da temporada) | Rounds | Rating médio / mediana | DP | ADR | K/D | KAST% | HS% | ≥1 / <0,8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Flp | 89 (48,9%) | 1938 | 1,07 / 1,01 | 0,33 | 82,4 | 1,00 | 65,9 | 33,5 | 46/89 ; 20/89 |
| TRAVIS SCOUTTT | 71 (39,0%) | 1582 | 1,12 / 1,08 | 0,39 | 82,8 | 1,06 | 66,9 | 39,4 | 41/71 ; 15/71 |
| PERNA PELUDA | 68 (37,4%) | 1558 | 1,17 / 1,18 | 0,32 | 85,1 | 1,11 | 69,9 | 55,9 | 47/68 ; 10/68 |
| TG. | 68 (37,4%) | 1509 | 1,01 / 1,00 | 0,32 | 71,5 | 0,98 | 66,7 | 48,0 | 35/68 ; 17/68 |
| LorD | 46 (25,3%) | 974 | 1,02 / 0,97 | 0,35 | 75,6 | 0,98 | 66,6 | 47,6 | 22/46 ; 12/46 |
| Maop Bonham | 45 (24,7%) | 986 | 0,93 / 0,88 | 0,30 | 68,9 | 0,85 | 64,1 | 37,2 | 17/45 ; 17/45 |
| Tuf Tuf | 34 (18,7%) | 698 | 0,99 / 0,97 | 0,34 | 78,2 | 0,92 | 64,8 | 44,3 | 16/34 ; 10/34 |
| Bago Direito | 32 (17,6%) | 701 | 0,92 / 0,84 | 0,32 | 69,0 | 0,85 | 63,8 | 31,5 | 12/32 ; 14/32 |
| GentulioNargas | 18 (9,9%) | 419 | 0,97 / 0,97 | 0,23 | 64,9 | 0,92 | 69,3 | 51,9 | 6/18 ; 5/18 |
| Crals | 11 (6,0%) | 242 | 0,79 / 0,83 | 0,34 | 59,6 | 0,71 | 61,7 | 50,0 | 4/11 ; 5/11 |
| Zeny | 7 (3,8%) | 150 | 1,07 / 1,02 | 0,31 | 71,7 | 1,04 | 68,7 | 49,1 | 4/7 ; 2/7 |
| hupEE | 1 (0,5%) | 23 | 0,72 / 0,72 | 0,00 | 43,4 | 0,79 | 57,0 | 54,5 | 0/1 ; 1/1 |

aln: zero partidas na temporada; sem avaliação. O DP zero de hupEE decorre de uma única observação e não indica regularidade. GentulioNargas (18) e Crals (11) têm menos volume e não completam dois blocos de dez; Zeny (7) e hupEE (1) estão em amostra inicial.

| Jogador com dois blocos completos | 10 anteriores: Rating / ADR | Últimas 10: Rating / ADR | Diferença Rating |
| --- | --- | --- | --- |
| Flp | 0,993 / 79,6 | 1,195 / 81,6 | 0,202 |
| TRAVIS SCOUTTT | 1,141 / 81,4 | 1,117 / 85,1 | -0,024 |
| PERNA PELUDA | 1,053 / 79,5 | 1,061 / 76,2 | 0,008 |
| TG. | 0,972 / 70,5 | 0,924 / 66,1 | -0,048 |
| LorD | 1,073 / 78,5 | 1,153 / 74,8 | 0,080 |
| Maop Bonham | 1,073 / 74,1 | 0,902 / 67,9 | -0,171 |
| Tuf Tuf | 1,197 / 88,9 | 0,948 / 75,3 | -0,249 |
| Bago Direito | 1,000 / 72,3 | 0,903 / 67,4 | -0,097 |

Os blocos são próprios de cada jogador e cobrem datas distintas; não são a mesma comparação coletiva. Os intervalos e IDs de cada partida podem ser reconstruídos em snapshot.json; não se interpreta a soma dos jogadores como uma amostra independente.

**Leituras úteis.** PERNA PELUDA tem o maior Rating médio entre os de maior volume (1,165), mediana 1,18 e 47/68 jogos ≥1: o nível médio vem acompanhado de distribuição relativamente favorável, embora haja 10/68 abaixo de 0,8. Seu Rating recente ficou perto de 1,06 nos dois blocos: abaixo da própria temporada, sem nova queda entre esses blocos. TRAVIS tem média 1,117, mas maior dispersão entre jogadores com 25+ partidas (DP 0,394); média alta não equivale a regularidade. Flp sobe de 0,993 para 1,195, enquanto o coletivo piora: desempenho individual e vitória do grupo não são intercambiáveis.

Tuf Tuf apresenta a maior queda de Rating entre os comparáveis (1,197→0,948), com ADR 88,9→75,3 e KAST 70,0→65,0. Maop cai de 1,073→0,902 e ADR 74,1→67,9; TG. de 0,972→0,924. Bago tem mediana 0,845 e 14/32 abaixo de 0,8: vale localizar padrões de contexto sem inferir a causa. LorD sobe no Rating (1,073→1,153), mas ADR cai de 78,5→74,8 e DP recente continua alto (0,368): a melhora da média não é melhora uniforme. Gentulio tem KAST 69,3% apesar de ADR 64,9; isso não prova função de suporte. Nenhuma dessas métricas permite atribuir IGL, entry ou lurker.

Comparação solo/grupo com algum volume nos dois lados: Flp, 11 solo a 1,164 versus 78 acompanhado a 1,059; TRAVIS, 27 solo a 1,019 versus 44 acompanhado a 1,178. São associações de contexto, não efeitos causais de companhia. Nos demais, solo tem no máximo sete jogos ou está ausente. Aqui acompanhado significa pelo menos dois monitorados no jogo e pode incluir o confronto interno; não é necessariamente o universo coletivo elegível.

**Rating por mapa, com N explícito.** Tabela de consulta; não ordenar os jogadores por células pequenas. Cada célula mostra N / média.

| Jogador | Inferno | Ancient | Anubis | Cache | Overpass | Mirage | Dust2 | Nuke |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Flp | 21 / 1,07 | 12 / 0,95 | 15 / 1,13 | 11 / 0,99 | 9 / 1,12 | 7 / 0,98 | 6 / 1,28 | 8 / 1,13 |
| TRAVIS SCOUTTT | 21 / 1,14 | 10 / 1,38 | 4 / 0,99 | 6 / 1,25 | 9 / 1,20 | 6 / 0,91 | 12 / 0,88 | 3 / 1,15 |
| PERNA PELUDA | 13 / 1,31 | 16 / 1,12 | 11 / 1,05 | 9 / 1,12 | 8 / 1,32 | 4 / 1,11 | 5 / 1,19 | 2 / 0,82 |
| TG. | 15 / 1,06 | 15 / 0,95 | 16 / 0,99 | 7 / 1,03 | 7 / 0,93 | 4 / 1,12 | 3 / 0,93 | 1 / 1,59 |
| LorD | 15 / 0,99 | 8 / 0,94 | 5 / 0,99 | 5 / 1,24 | 5 / 0,80 | 5 / 1,02 | 2 / 1,42 | 1 / 1,60 |
| Maop Bonham | 11 / 1,00 | 8 / 0,85 | 7 / 0,95 | 7 / 1,01 | 4 / 0,88 | 4 / 0,69 | 2 / 0,77 | 2 / 1,18 |
| Tuf Tuf | 9 / 0,84 | 8 / 1,18 | 4 / 0,93 | 3 / 1,07 | 3 / 0,80 | 2 / 1,24 | 2 / 1,13 | 3 / 0,86 |
| Bago Direito | 8 / 0,95 | 5 / 1,18 | 4 / 0,79 | 5 / 1,12 | 3 / 0,72 | 3 / 0,77 | 3 / 0,56 | 1 / 0,94 |
| GentulioNargas | 3 / 1,03 | 5 / 0,91 | 4 / 0,82 | 1 / 1,27 | 3 / 1,13 | 2 / 0,89 | — | — |
| Crals | 1 / 1,30 | 3 / 0,82 | 1 / 0,00 | 2 / 0,92 | 1 / 0,56 | 1 / 1,00 | 1 / 0,68 | 1 / 0,83 |
| Zeny | 3 / 1,22 | 1 / 0,87 | 1 / 0,72 | — | — | 1 / 1,50 | 1 / 0,73 | — |
| hupEE | 1 / 0,72 | — | — | — | — | — | — | — |

Comparações mais úteis pelo volume: TRAVIS Ancient 1,377/10 versus Dust2 0,877/12; PERNA Inferno 1,313/13 versus Anubis 1,046/11; Flp Ancient 0,952/12 versus Anubis 1,134/15. São pistas para seleção de demos; resultados podem refletir adversários e datas diferentes. Tuf Tuf tem Ancient 1,181/8 versus Inferno 0,843/9, porém ainda com amostras pequenas.

## 5. Cobertura avançada e limites

ADR, KAST, damage e gcRating estão preenchidos nas 490 linhas; ADR/KAST são não zero em todas. Headshots são não zero em 487. A cadeia GC mapeia nb_kill/death/assist, hit_headshots, adr e pkast; valores ausentes ou inválidos podem virar zero no normalizador. A presença não nula não comprova completude do payload original. Por isso HS% é a razão dos contadores mapeados, com a ressalva semântica de hit_headshots; não foi feita validação independente kill a kill.

firstkill está não zero em 414/490 linhas; é possível relatar contagens (Flp 266/89 jogos, TRAVIS 188/71, PERNA 159/68), não taxa de vitória em duelos. entryDeaths é fixado em zero pelo adaptador GC. tradeKills e clutchesWon são zero em todas as linhas; os denominadores de oportunidades também não existem. Eventos, duelos, trades, clutches e matchups detalhados têm zero registros na temporada. Logo, não se conclui ausência de trades/clutches ou deficiência de troca. flashAssists é não zero em 97 linhas, sem exposição ou contexto para diagnosticar uso de utilitárias.

roundsJson está presente nas 113 coletivas, porém três não fecham com o placar: cmvr7yjks008l01pbx6vyj4dm, cmv4aluq3075z01lg4v1dgp6s, cmuq8i8z400n201qx1psxz86h. Restam **110 jogos e 2.437 rounds**. O processamento descarta a entrada inicial 0–0 e exige incremento de exatamente um ponto, flags de vencedor coerentes e placar final reconciliado. CT: **628 ganhos / 593 perdidos (51,4%)**; TR: **588 / 628 (48,4%)**, diferença descritiva de 3,1 p.p. O lado é inferido do winnerTeam do round e da identidade A/B do grupo, não do rótulo A/B fixo. Não é comparação controlada por mapa nem prova de problema no TR.

As contagens aliveA/aliveB são estados finais, não a ordem das mortes. winnerMode registra término por kill/timeout/bomba, mas não fornece oportunidades de pós-plant ou retake. Não há economia, sequência de vantagens numéricas nem inventário/posições utilizáveis para essas análises. Uma bomba desarmada não define sozinha uma tentativa de retake e não permite calcular sua conversão.

Exploração adicional da sequência de placares: em 65/110 jogos o grupo chegou, em algum momento, a liderar com pelo menos dez rounds; ganhou 51 e perdeu 14 (78,5% de vitórias nesse subconjunto). É uma definição exploratória, inclui jogos já vencidos e não é um índice oficial de fechamento. Em Anubis cmvsu1g3t00is01mcm09txe16 houve 10–6 antes do 11–13; em Inferno cmvre7juj01o501pb0u9zg8t0 houve 11–10 antes do 11–13. Há exemplos de vantagem perdida, mas não evidência de que a causa seja comunicação, fadiga ou mentalidade.

## 6. Prioridades de investigação e melhoria

| Achado | Evidência e amostra | O que permite concluir | O que não permite concluir | Próxima ação |
| --- | --- | --- | --- | --- |
| 1. Resultados curtos desfavoráveis — observação | 2V–16D por até 2 rounds; últimos 20: 0V–5D | É o subconjunto prioritário para revisão | Que o grupo tenha um defeito único de fechamento | Revisar os três jogos abaixo; registrar placar, lado, economia e primeira vantagem em cada round da fase final; comparar com vitória curta |
| 2. Anubis merece ciclo de revisão — observação; causa em aberto | 7V–11D, 18 jogos, saldo −13; 0/3 recentes | Há volume e resultado desfavorável para justificar foco | Que o mapa seja o pior ou que se deva treinar retake/posição específica | Revisar a sequência 10–6→11–13 e outra derrota; classificar eventos antes de escolher um treino |
| 3. Queda individual contextual — hipótese de padrão recorrente | Tuf 1,197→0,948, Maop 1,073→0,902 em 10×10 | Queda recente em mais de um indicador | Problema de mira, função, empenho ou que eles causaram a queda coletiva | Selecionar uma atuação recente baixa e uma anterior no mesmo mapa; anotar exposição, economia, vantagem e desfecho das mortes; avaliar repetição |
| 4. Inferno como referência de comparação — proposta de revisão/treino | 16V–12D em 28 jogos, +49 rounds; recentes 2/6 | Existe histórico positivo com volume maior que outros mapas | Que Inferno garanta vitória ou que seis jogos provem regressão | Comparar uma vitória e uma derrota com composição próxima; extrair uma decisão reproduzível e registrar sua execução nas sessões seguintes |

**Demos iniciais para conferir, horários BRT:**

| Data/hora | Mapa e placar do grupo | ID completo | GC |
| --- | --- | --- | --- |
| 29/10 00:08 | Anubis 11–13 | cmvsu1g3t00is01mcm09txe16 | 28182055 |
| 27/10 23:51 | Inferno 11–13 | cmvre7juj01o501pb0u9zg8t0 | 28175571 |
| 28/10 00:48 | Overpass 14–16 | cmvrgiikf01xn01pbs2i4ezgz | 28176403 |
| 28/10 23:22 | Inferno 13–10, comparação recente | cmvss940e003u01mcdn2oy1km | 28181537 |
| 07/10 19:43 | Cache 13–11, comparação curta | cmuyqjqib005r01pfi3it481e | 28031611 |

## 7. Plano para as próximas sessões

1. Antes da próxima sessão, revisar Anubis 11–13 e Inferno 11–13. Começar no primeiro placar a partir de dez rounds, incluindo o round anterior. Para cada round, registrar: ID, número/placar, lado, compra dos dois times, primeira morte/vantagem, estado de bomba, decisão observável e desfecho. Se a demo não estiver disponível, manter a causa como desconhecida. Não baixar nem reprocessar demos foi parte desta investigação.

2. Na sessão seguinte, escolher uma única situação repetida que a revisão realmente encontrou. Definir uma decisão verificável para essa situação e, se necessário, ensaiá-la em treino. Não escolher antecipadamente retake, posição ou utilitária. Registrar também quando a situação não ocorreu; separar execução da decisão de resultado do round.

3. Ao fim de cada sessão, gastar poucos minutos para identificar IDs e rounds elegíveis e revisar um caso executado e um não executado. Agrupar sessões pelo encontro real do grupo, anotando início/fim local: Session.date é agrupamento por dia UTC e pode dividir a mesma noite brasileira. Não concluir fadiga a partir da posição do jogo na sessão.

4. Após duas ou três sessões, avaliar quantas oportunidades observáveis ocorreram e quantas decisões combinadas foram executadas, com exemplos. Se houver poucas oportunidades, continuar coletando antes de concluir melhora. Comparar resultados por mapa e formação como contexto, sem meta percentual arbitrária de vitória. Para medir abertura/trade/clutch depois, seriam necessários eventos confiáveis com timestamps, jogador, oponente, lado e oportunidades; isso é requisito de dados futuro, não mudança implementada.

## 8. Rastreabilidade e verificações

capture.cjs contém todas as consultas SQL principais, sem credenciais: lê DATABASE_URL do ambiente e só aceita o host local e o banco DEV exato. snapshot.json preserva a captura usada; analyze.cjs calcula os recortes; results.json guarda os resultados por mapa/jogador/formação; advanced.cjs e advanced.json validam rounds e detalham jogos curtos. As consultas de inspeção posteriores foram somente leitura e usadas apenas para compreender o formato, sem substituir os números da captura consistente. Não se reutilizaram números de relatórios anteriores.

As tabelas de categorias em results.json incluem resultados técnicos de um lado arbitrário nos universos sem monitorados e confronto interno; esses campos não representam resultado coletivo e não foram usados neste relatório. Apenas as contagens desses universos são relevantes. O resultado coletivo usa exclusivamente os 113 elegíveis. Não há teste de significância, ajuste causal por adversários ou independência entre partidas. Percentuais arredondados podem diferir na última casa.

## Resumo para compartilhar

“Em outubro temos 54V–59D, com +29 rounds. Nas últimas vinte, 7V–13D e −5 rounds: estamos ganhando rounds sem converter o mesmo tanto em partidas. O recorte mais claro para revisar são os jogos por até dois rounds: 2V–16D na temporada. Vamos começar por Anubis 11–13 e Inferno 11–13, identificar situações concretas e combinar uma ação observável para as próximas sessões. Os dados ainda não mostram a causa; não cabe culpar função, comunicação ou jogador.”

## Anexo — intervalos individuais

| Jogador | Último bloco (até 10) | Dez anteriores completos |
| --- | --- | --- |
| LorD | 22/10/2026, 19:44:00 a 27/10/2026, 21:59:00 | 16/10/2026, 22:05:00 a 21/10/2026, 19:15:00 |
| Flp | 27/10/2026, 00:58:00 a 29/10/2026, 01:49:00 | 22/10/2026, 19:44:00 a 26/10/2026, 22:47:00 |
| Crals | 05/10/2026, 19:48:00 a 22/10/2026, 18:48:00 | Volume insuficiente |
| PERNA PELUDA | 27/10/2026, 22:31:00 a 29/10/2026, 03:01:00 | 22/10/2026, 18:48:00 a 27/10/2026, 21:59:00 |
| GentulioNargas | 16/10/2026, 20:14:00 a 27/10/2026, 23:12:00 | Volume insuficiente |
| TG. | 26/10/2026, 22:47:00 a 29/10/2026, 03:01:00 | 20/10/2026, 23:04:00 a 26/10/2026, 22:27:00 |
| Bago Direito | 26/10/2026, 20:47:00 a 28/10/2026, 00:48:00 | 12/10/2026, 11:00:00 a 26/10/2026, 18:40:00 |
| Maop Bonham | 21/10/2026, 20:54:00 a 25/10/2026, 18:32:00 | 17/10/2026, 11:27:00 a 21/10/2026, 19:15:00 |
| Tuf Tuf | 27/10/2026, 20:55:00 a 29/10/2026, 03:01:00 | 21/10/2026, 18:23:00 a 24/10/2026, 16:54:00 |
| TRAVIS SCOUTTT | 26/10/2026, 20:47:00 a 29/10/2026, 01:49:00 | 21/10/2026, 21:40:00 a 26/10/2026, 16:46:00 |
| hupEE | 28/10/2026, 23:22:00 a 28/10/2026, 23:22:00 | Volume insuficiente |
| Zeny | 07/10/2026, 23:24:00 a 26/10/2026, 00:02:00 | Volume insuficiente |

verification.json registra os IDs por bloco, a validação da fórmula do Rating e os 65 jogos da exploração de vantagem. Todos os fechamentos de contagens passaram.
