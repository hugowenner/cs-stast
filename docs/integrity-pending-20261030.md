# Pendências de integridade — classificação somente leitura

Referência: DEV validado em 30/10/2026. Nenhum registro corrigido, remapeado ou normalizado durante esta investigação.

## 29 partidas fora da temporada

Todas estão associadas a default-season (Julho/2026), embora playedAt esteja em Junho/2026. A temporada Junho/2026 existe. Os 29 IDs coincidem exatamente com TARGET_JUNE_MATCH_IDS em scripts/audit-june-season.ts e com o plano scripts/reassign-june-matches.ts. Portanto, é uma pendência histórica já inventariada, não um efeito novo do snapshot.

Causa próxima comprovada: associação de temporada incompatível com a data armazenada. Causa histórica provável: atribuição legada à temporada ativa/default sem resolver a data; src/server/admin/backfill-match-seasons.ts demonstra esse padrão para seasonId nulo. Não há evidência de execução que permita atribuir cada gravação a esse script. Não foram encontrados payloads GC brutos correspondentes nos Import preservados, portanto a data original GC não foi revalidada. Gravidade P1: pode alterar elegibilidade, quantidade de partidas e classificação individual, mesmo nos casos solo. Não alterar fórmulas nem reatribuir automaticamente.

| GC ID | playedAt armazenado | Monitorados | Temporada atual | Temporada pela cronologia | Gravidade |
|---|---|---:|---|---|---|
| 27104868 | 2026-06-03 22:00:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27111711 | 2026-06-04 15:00:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27114069 | 2026-06-04 17:52:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27114947 | 2026-06-04 18:58:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27115674 | 2026-06-04 19:50:00 | 2 | Julho/2026 | Junho/2026 | P1 |
| 27121466 | 2026-06-05 12:45:00 | 2 | Julho/2026 | Junho/2026 | P1 |
| 27122288 | 2026-06-05 15:10:00 | 2 | Julho/2026 | Junho/2026 | P1 |
| 27127337 | 2026-06-05 23:06:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27130378 | 2026-06-06 10:11:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27135615 | 2026-06-06 22:19:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27192693 | 2026-06-13 23:52:00 | 2 | Julho/2026 | Junho/2026 | P1 |
| 27194658 | 2026-06-14 10:34:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27196248 | 2026-06-14 14:56:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27196941 | 2026-06-14 15:52:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27201608 | 2026-06-14 21:11:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27217094 | 2026-06-16 20:38:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27248347 | 2026-06-20 23:57:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27259343 | 2026-06-21 22:41:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27265819 | 2026-06-22 20:46:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27275579 | 2026-06-23 21:13:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27303280 | 2026-06-27 10:49:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27305929 | 2026-06-27 16:25:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27307475 | 2026-06-27 18:41:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27313067 | 2026-06-28 10:46:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27315628 | 2026-06-28 16:07:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27316735 | 2026-06-28 17:22:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27326212 | 2026-06-29 18:31:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27327060 | 2026-06-29 19:47:00 | 1 | Julho/2026 | Junho/2026 | P1 |
| 27333875 | 2026-06-30 19:43:00 | 1 | Julho/2026 | Junho/2026 | P1 |

## 61 divergências de rounds

Nos 61 casos Match.roundsJson contém o literal JSON null, enquanto match_payloads.payload.rounds preserva um array e o payload está PROCESSED. Isso demonstra divergência de projeção; não demonstra perda do upload nem necessidade de baixar uma demo novamente. Não é possível provar, com os registros disponíveis, se os rounds nunca foram persistidos ou se houve sobrescrita posterior. Não há versão histórica do normalizador registrada; parserVersion sozinho não identifica o escritor.

P1: partida comunitária com rounds competitivos no bruto, com impacto potencial na conversão pós-FK e no 5v4. P2: partida individual com dados disponíveis mas projeção ausente; a regra atual já restringe parte do consumo premium. P3: bruto sem rounds competitivos elegíveis, portanto não fabricar amostra para fazer números coincidirem. Todos permanecem intactos.

| GC ID | Temporada | Rounds no bruto | Rounds competitivos | Monitorados | Entries relacionais | Gravidade | Causa comprovada |
|---|---|---:|---:|---:|---:|---|---|
| 27476993 | Julho/2026 | 19 | 18 | 5 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27482555 | Julho/2026 | 25 | 24 | 5 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27483022 | Julho/2026 | 18 | 17 | 5 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27490367 | Julho/2026 | 20 | 19 | 3 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27490947 | Julho/2026 | 24 | 23 | 4 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27497771 | Julho/2026 | 20 | 19 | 3 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27511085 | Julho/2026 | 22 | 21 | 4 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27511420 | Julho/2026 | 24 | 23 | 5 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27514457 | Julho/2026 | 18 | 17 | 2 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27522245 | Julho/2026 | 18 | 17 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27537117 | Julho/2026 | 22 | 21 | 10 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27537778 | Julho/2026 | 23 | 22 | 5 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27538448 | Julho/2026 | 30 | 29 | 5 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27543731 | Julho/2026 | 17 | 16 | 8 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27544295 | Julho/2026 | 24 | 23 | 10 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27549761 | Julho/2026 | 23 | 22 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27555434 | Julho/2026 | 22 | 21 | 4 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27555749 | Julho/2026 | 25 | 24 | 5 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27556269 | Julho/2026 | 20 | 19 | 8 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27556759 | Julho/2026 | 25 | 24 | 5 | 0 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27559986 | Julho/2026 | 22 | 21 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27566323 | Agosto/2026 | 17 | 16 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27566608 | Agosto/2026 | 18 | 17 | 3 | 34 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27567329 | Agosto/2026 | 19 | 18 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27570397 | Agosto/2026 | 25 | 24 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27570835 | Agosto/2026 | 24 | 23 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27573167 | Agosto/2026 | 16 | 15 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27573345 | Agosto/2026 | 25 | 24 | 2 | 45 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27575810 | Agosto/2026 | 25 | 24 | 5 | 50 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27576230 | Agosto/2026 | 20 | 19 | 5 | 40 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27576620 | Agosto/2026 | 21 | 20 | 5 | 42 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27577102 | Agosto/2026 | 25 | 24 | 5 | 50 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27582575 | Agosto/2026 | 20 | 19 | 2 | 40 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27582898 | Agosto/2026 | 23 | 22 | 2 | 46 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27583383 | Agosto/2026 | 23 | 22 | 4 | 46 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27587732 | Agosto/2026 | 31 | 30 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27588513 | Agosto/2026 | 1 | 0 | 1 | 0 | P3 | roundsJson JSON null; bruto PROCESSED preservado |
| 27588569 | Agosto/2026 | 22 | 21 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27589273 | Agosto/2026 | 31 | 30 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27589944 | Agosto/2026 | 25 | 24 | 3 | 50 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27590491 | Agosto/2026 | 22 | 21 | 4 | 44 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27607094 | Agosto/2026 | 23 | 22 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27611857 | Agosto/2026 | 19 | 18 | 3 | 38 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27618762 | Agosto/2026 | 29 | 28 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27620158 | Agosto/2026 | 25 | 24 | 5 | 50 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27620560 | Agosto/2026 | 22 | 21 | 5 | 44 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27627194 | Agosto/2026 | 20 | 19 | 4 | 40 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27627490 | Agosto/2026 | 24 | 23 | 5 | 48 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27627892 | Agosto/2026 | 25 | 24 | 5 | 50 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27639803 | Agosto/2026 | 19 | 18 | 2 | 38 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27645412 | Agosto/2026 | 23 | 22 | 9 | 46 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27651052 | Agosto/2026 | 20 | 19 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27652593 | Agosto/2026 | 22 | 21 | 5 | 44 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27656265 | Agosto/2026 | 19 | 18 | 4 | 37 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27656424 | Agosto/2026 | 23 | 22 | 4 | 46 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27660218 | Agosto/2026 | 21 | 20 | 4 | 40 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27660680 | Agosto/2026 | 19 | 18 | 2 | 38 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27663165 | Agosto/2026 | 23 | 22 | 5 | 46 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27664029 | Agosto/2026 | 19 | 18 | 5 | 38 | P1 | roundsJson JSON null; bruto PROCESSED preservado |
| 27671743 | Agosto/2026 | 21 | 20 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |
| 27684570 | Agosto/2026 | 19 | 18 | 1 | 0 | P2 | roundsJson JSON null; bruto PROCESSED preservado |

## Resumo

Classificação: `{"outside":29,"plannedJuneIdsMatch":true,"outsideCommunity":4,"rounds":61,"bySeverity":{"P1":44,"P2":16,"P3":1},"roundsBySeason":{"Julho/2026":21,"Agosto/2026":40},"roundsWithEntries":26}`.

## Verificação reproduzível

Executar apenas em transação BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY e encerrar com ROLLBACK. Para temporadas, relacionar Match.seasonId a Season e comparar playedAt com startDate/endDate. Para rounds, relacionar origem gamersclub/sourceMatchId ao gamersClubMatchId e comparar Match.roundsJson com payload->rounds usando IS DISTINCT FROM; usar jsonb_typeof para distinguir NULL SQL, JSON null, array vazio e array preenchido. Não usar existência de clutches ou trades como indicador de parsing concluído.

A reparação exige plano separado, dry-run por ID, política de precedência GC/demo, validação das datas originais e autorização para escrita no banco real. Este relatório não autoriza reprocessamento dos 480 payloads nem atualização de snapshots oficiais.
