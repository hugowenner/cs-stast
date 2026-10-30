# Estabilização — Fases 1 e 2 implementadas em DEV

Data: 30/10/2026. Implementação e validação local; nenhuma publicação, commit, push, alteração de VPS, sincronização adicional ou reprocessamento dos 480 payloads históricos. A Fase 0 não foi repetida.

## Resultado e limites da entrega

O POST confirma armazenamento durável, nunca conclusão presumida. Um consumidor separado, executado explicitamente, normaliza jobs persistidos. O worker guarda recibo/hash, consulta o resultado final e arquiva a demo somente após COMPLETED. Quedas, resposta perdida e leases abandonados possuem recuperação testada.

As migrations PostgreSQL e SQLite estão prontas, mas **não foram aplicadas ao DEV real nem ao estado real do worker**. A ativação permanece pendente de autorização para essas escritas. A conferência final somente leitura manteve 750 Match, 7.649 PlayerMatchStats, 480 match_payloads e ausência de normalization_jobs no DEV real.

O pipeline durável preserva Match, PlayerMatchStats, jogadores já existentes, vínculos tracked_players, rivalidades, conquistas oficiais e SeasonSnapshot. A normalização gera projeção JSONB versionada e substitui as projeções relacionais de demo — PlayerMatchup, PlayerClutch, PlayerEntryDuel, PlayerTradeEvent e Event — na mesma transação. O serviço GC atual cria a partida com events vazio; essas tabelas são projeções de demo neste fluxo. Não altera fórmulas oficiais. Se a partida GC ainda não existir, o payload permanece preservado e o job aguarda por retries limitados, com erro explícito; não cria partida com data/temporada presumidas.

## Máquina de estados

| Camada | Estados e transições |
|---|---|
| Fila Hub | PENDING → PROCESSING → COMPLETED; PROCESSING → RETRY → PROCESSING; PROCESSING → FAILED; revisão antiga → SUPERSEDED |
| Recibo público | PENDING/RETRY = ACCEPTED; PROCESSING = NORMALIZING; terminais COMPLETED, FAILED, SUPERSEDED |
| match_payloads, compatibilidade | STORED durante aceitação/retry; PROCESSED somente no commit final; FAILED no erro terminal |
| sync_jobs Hub | PENDING/FAILED → SENT_TO_WORKER; payload aceito → PROCESSING; commit final → COMPLETED; erro terminal → FAILED |
| SQLite worker | PENDING → DOWNLOADING → DOWNLOADED → PARSING → UPLOADING → ACCEPTED/NORMALIZING → ARCHIVING → COMPLETED; erro recuperável → RETRY; definitivo/limite → FAILED |

JSON local válido permite começar diretamente em UPLOADING. Recibo persistido permite retomar diretamente a confirmação. ARCHIVING tem confirmação persistida e checksum antes do rename, permitindo reinício após movimentação do arquivo.

FAILED retryable pode ser reenviado explicitamente com os mesmos bytes: reutiliza recibo/revisão, preserva histórico e libera mais cinco tentativas no Hub. FAILED permanente não volta silenciosamente à fila. SUPERSEDED não é sucesso para o worker. COMPLETED local legado não é reaberto nem reinterpretado automaticamente como confirmação do protocolo novo.

## Fluxo completo

```mermaid
sequenceDiagram
    participant W as Worker / SQLite
    participant H as Hub HTTP
    participant P as PostgreSQL
    participant N as Consumidor normalizador
    W->>H: GET capabilities autenticado
    W->>W: Claim com lease; reutilizar JSON válido
    W->>H: GET status por origem + GC ID + SHA256
    W->>H: POST bytes JSON, se ainda não recebidos
    H->>P: Transação: payload + revisão + job
    H-->>W: 202 ACCEPTED + receiptId + payloadHash
    W->>W: Persistir recibo; preservar demo
    N->>P: Claim SKIP LOCKED + token + lease
    N->>P: Transação serializável: projeções + estados finais
    W->>H: GET status/receiptId
    H-->>W: COMPLETED ou FAILED
    W->>W: Somente COMPLETED: ARCHIVING → COMPLETED
```

Não há processamento crítico disparado sem await pelo POST. O consumidor é processo separado. Ele considera exclusivamente normalization_jobs: não varre PENDING/STORED antigos nem importa automaticamente os 480 payloads.

## Contrato HTTP v2

Autenticação de todos os endpoints: `Authorization: Bearer TOKEN`. Preserva precedência existente: SYNC_SERVICE_TOKEN, WORKER_INGEST_TOKEN, ADMIN_SYNC_TOKEN. Token ausente/inválido: 401. Feature flag DURABLE_INGEST_ENABLED diferente de 1: 503. Respostas do ingest/status/capabilities usam no-store.

| Método e endpoint | Contrato |
|---|---|
| GET /api/internal/ingest/capabilities | protocolVersion=2, normalizerVersion=durable-1, durableReceipts=true, finalConfirmationRequired=true; 503 se schema indisponível |
| POST /api/internal/ingest/match | X-Match-Source: gamersclub; X-Match-Source-Id: ID GC numérico; corpo parser JSON v1, até 50 MiB, UTF-8 válido; exige schema_version, parser_version, match.id, players não vazio, rounds e kills arrays; preserva campos adicionais |
| GET /api/internal/ingest/status/UUID | Consulta autenticada do recibo; 200 com estado, 404 inexistente; UUID inválido retorna 400 |
| GET /api/internal/ingest/status?source=gamersclub&sourceMatchId=ID&payloadHash=SHA256 | Recupera recibo depois de timeout/resposta perdida, sem precisar de outro POST; 404 significa recibo não encontrado para essa identidade exata |
| GET /api/internal/ingest/metrics | Agrupa quantidade, tentativas, início mais antigo, duração média e leases expirados por estado; não retorna payload bruto |
| GET /api/internal/jobs/pending | Claim de até dez downloads em uma única instrução SKIP LOCKED; preserva campos antigos e adiciona leaseUntil; SENT_TO_WORKER abandonado volta a ser elegível após 30 minutos |

POST retorna 202 para ACCEPTED/NORMALIZING e 200 para recibo já terminal, inclusive FAILED. O status HTTP não determina sucesso estatístico. Outros erros: 400 JSON/UTF-8 inválido, 413 limite, 422 contrato/origem inválida; erro de persistência não produz confirmação de recebimento. Location aponta ao status; Retry-After=3.

Exemplo de recibo, com valores ilustrativos:

```json
{
  "protocolVersion": 2,
  "accepted": true,
  "receiptId": "dca211c9-6a82-42ab-9310-69d245740426",
  "payloadId": "identificador-legado",
  "payloadHash": "sha256-dos-bytes-exatos",
  "source": "gamersclub",
  "sourceMatchId": "28120889",
  "state": "ACCEPTED",
  "status": "accepted",
  "normalizerVersion": "durable-1",
  "attempts": 0,
  "error": null,
  "statusUrl": "/api/internal/ingest/status/dca211c9-6a82-42ab-9310-69d245740426"
}
```

O campo state é autoritativo. O alias legado status assume processed quando COMPLETED. Erros possuem mensagem limitada, stage, retryable, código quando disponível e horário. O ID interno do parser não substitui o GC ID informado no cabeçalho.

## Concorrência, atomicidade e idempotência

- Recebimento: advisory lock por origem/GC ID, revisão única por payload/hash e job único por revisão/versão do normalizador. O ACK ocorre depois do COMMIT.
- SHA256 representa os bytes exatos, não equivalência semântica entre JSONs formatados diferentemente. O worker serializa de forma determinística e reaproveita esses bytes entre retries.
- Revisões preservam o JSON anterior antes de substituir a visão de compatibilidade. Reenvio de revisão antiga conhecida não reverte o payload mais recente.
- Claim Hub usa FOR UPDATE SKIP LOCKED, lease de 120 segundos, UUID de posse e histórico por tentativa. Lease expirado permite recuperação; dono antigo não conclui nem registra falha sobre nova posse.
- Escritas relacionais e COMPLETED ficam numa única transação serializável, limitada a 60 segundos. AsyncLocalStorage faz repositories e transações internas participarem desse mesmo commit. Falha tardia desfaz inclusive jogador novo, exclusões, inserções e projeção JSONB.
- Falhas técnicas usam backoff exponencial com jitter, máximo 300 segundos e cinco tentativas por orçamento no Hub. Contrato inválido/constraints classificadas permanentes não entram em retry automático.
- Última tentativa interrompida vira FAILED, fecha o histórico e reconcilia as visões legadas sob o mesmo lock de partida. Falha dessa reconciliação é logada e tentada novamente; o recibo durável permanece autoritativo.
- SQLite: claim atômico, lease padrão 300 segundos, renovação em conexão separada, transições condicionadas ao token e lease válido. Recuperação manual também faz update condicional, sem tomar posse de job ativo.
- Parser e health check possuem deadlines de 900/30 segundos e encerram apenas o subprocesso/grupo criado pela própria tentativa. Download tem deadline por tentativa de 600 segundos, limites 10–600 MiB e arquivo .part exclusivo; bytes incompletos são preservados para diagnóstico.
- Download/upload usam retries limitados e jitter. Falha de upload não manda demo a processed; JSON válido não é parseado de novo. Colisão/checksum divergente no arquivamento preserva ambos os arquivos.

## Migrations e ativação pendente

PostgreSQL: prisma/migrations/20261030150000_durable_ingest/migration.sql cria quatro tabelas vazias: ingest_payload_revisions, normalization_jobs, normalization_attempts e demo_match_projections, com FKs RESTRICT, índices e unicidades. BEGIN/COMMIT evita aplicação parcial. Não modifica dados GC/JSONB existentes, não insere jobs históricos e não contém DROP/TRUNCATE.

**Impedimento de rollout identificado:** o DEV restaurado possui nove entradas no ledger de migrations até 20260729181626. Há migration anterior no repositório, 20260901120000_add_missing_models, cujas estruturas já existem no snapshot sem entrada correspondente no ledger. Não executar prisma migrate deploy indiscriminadamente: é necessário revisar/reconciliar esse baseline antes da aplicação aditiva. Essa reconciliação também requer autorização para o banco real.

SQLite: app/state_migration.py adiciona colunas de recibo, hash, confirmação, lease, retry e contexto; primeiro confere integridade/FKs e faz backup SQLite consistente. Não reabre jobs antigos. O comando explícito `python main.py --migrate-local-state` foi exercitado apenas em banco temporário. Deve ser usado com o worker parado e autorização para o estado local real. DATABASE_URL SQLite relativo passa a resolver a partir da pasta do worker, evitando abrir outro banco ao executar de diretório diferente.

Depois de autorização/revisão do baseline e migrations, a ativação exige Hub e worker atualizados, feature flag e consumidor supervisionado. Para desenvolvimento: `npm run normalizer -- --run`; para a imagem: `node normalizer.cjs --run`. Nenhum desses comandos foi executado contra DEV real/produção. O teste do consumidor usou banco descartável.

O bundle gerado por `npm run normalizer:build` permite execução Node sem tsx no runtime. Dockerfile inclui esse bundle. docker-compose.normalizer.yml é override opcional, profile durable-ingest, uma instância, limite inicial 384 MiB/0,5 CPU, grace period de 75 segundos. A imagem deve ser a mesma versão revisada do Hub; esse orçamento ainda exige teste de carga antes de produção. A imagem Docker não foi construída/executada nesta entrega; seu empacotamento precisa de validação em staging. Nenhum container desse serviço foi iniciado. .dockerignore também passa a excluir .env.* do contexto.

Worker antigo continua tratando 202 como sucesso; portanto não deve operar contra o contrato novo. Worker novo exige capabilities v2 e recusa iniciar contra Hub antigo. O rollout precisa ser coordenado. Rollback seguro começa por parar o worker/consumidor e desabilitar a flag, preservando tabelas, revisões e backups; não usar DROP como rollback e não retornar o worker antigo a uploads ainda aguardando confirmação.

`python main.py --recover-job ID` reabre somente um job local não COMPLETED, sem lease ativo e com JSON válido da mesma partida. Não inicia parser/download e não faz varredura histórica. Jobs antigos PARSING/DOWNLOADING sem lease permanecem em quarentena até ação específica. Códigos de erro, etapa, GC ID, recibo, hash e tentativa dão contexto aos logs; métricas de fila são consultáveis pelo endpoint autenticado.

## Validação executada

| Verificação | Resultado |
|---|---|
| npm test, execução final por validate-build.cjs --test | 270 aprovados em banco descartável com fixtures de temporadas; 22 opt-in ignorados nessa execução |
| Pipeline PostgreSQL opt-in | 14 aprovados em banco descartável; estão entre os 22 opt-in acima |
| Worker unittest | 16 aprovados, SQLite/diretórios temporários, HTTP externo bloqueado |
| npm run build | Aprovado, Next 16.2.10; DATABASE_URL apontou a schema vazio descartável com migration nova |
| TypeScript | Build validou tipos; npm run typecheck também executado na revisão final |
| ESLint do núcleo, rotas, consumer e serviços alterados | Aprovado; não representa limpeza global de arquivos legados/UI |

Total: **300 testes distintos aprovados**. Oito testes de integração legados/snapshot permaneceram opt-in e não foram executados; não se repetiu a sincronização da Fase 0. Os testes destrutivos antigos de match-ingest agora exigem opt-in e nome de banco local cs2_stats_test_. Três expectativas antes dependentes do conteúdo do DEV foram substituídas por fixtures de dados ausentes/parciais e métricas conhecidas, sem alterar fórmulas. Um teste de página ultrapassou 5 segundos enquanto quatro verificações pesadas rodavam juntas; a suíte completa repetida passou. O cast de enum encontrado no teste integrado foi corrigido e a suíte integrada repetida passou.

Evidências nos testes: aceitações simultâneas compartilham recibo; claims concorrentes têm um dono; reenvio COMPLETED não duplica eventos; falha após projeção reverte todas as relações; mesmo FAILED recuperável reentra com histórico preservado; lease vencido rejeita dono antigo; revisão antiga não desfaz a nova; fim do orçamento não produz falso COMPLETED; ausência GC preserva raw e não inventa Match; Match/Player/Tracked/PlayerMatchStats/snapshot oficiais permanecem iguais na fixture; consumidor compilado funciona em processo próprio; uploader Python conversa por HTTP loopback com os handlers reais e PostgreSQL; resposta perdida é recuperada por lookup sem segundo POST; demo só é arquivada depois da confirmação final; parser não repete depois de timeout de upload; SQLite aditivo mantém backup e linhas antigas; download parcial não vira demo completa.

## Arquivos desta implementação

Raiz Hub: C:/Users/ramobh/Documents/cs2-stats.

- Prisma: prisma/schema.prisma e prisma/migrations/20261030150000_durable_ingest/migration.sql.
- Banco/fila: src/server/db.ts; src/server/ingest/{auth.ts,queue.ts,processor.ts,run.ts,build-consumer.mjs,pipeline.integration.test.ts}.
- Rotas: src/app/api/internal/ingest/match/route.ts; ingest/capabilities/route.ts; ingest/metrics/route.ts; ingest/status/route.ts; ingest/status/[id]/route.ts; src/app/api/internal/jobs/pending/route.ts.
- Integração: src/server/services/normalizer.service.ts; src/server/services/enrichment/demo-enrichment.service.ts; src/server/repositories/matchPayload.repository.ts; scripts/run-normalizer.ts.
- Empacotamento: package.json; package-lock.json; Dockerfile; docker-compose.normalizer.yml; .gitignore; inclusão de exclusões .env.* em .dockerignore.
- Testes: src/server/services/match/match-ingest.test.ts; src/server/services/raio-x.test.ts; src/server/services/decisive-players.test.ts.
- Evidências: docs/stabilization-phases-1-2.md; docs/integrity-pending-20261030.md; scratch/stabilization/integrity-readonly.json; integrity-evidence-extra.json; integrity-classified.json; validate-build.cjs.

Raiz worker: C:/Users/ramobh/Documents/CS2 Sync Worker.

- main.py; app/config.py; app/db.py; app/models.py; app/state_migration.py.
- app/repositories/job_repository.py.
- app/services/uploader.py; worker.py; downloader.py; parser_runner.py.
- tests/test_durable_worker.py.

Backup pré-edição do código do worker: C:/Users/ramobh/Documents/CS2 Sync Worker/.stabilization-backup-20261030. Não é backup de dados/demos. O worker não possui repositório Git local. Alterações de UI e demais arquivos já presentes no workspace não foram revertidas nem incluídas nesta fase. Os arquivos de Fase 0 que aparecem no git status pertencem à fase anterior.

## Integridade pendente e próxima etapa

O relatório docs/integrity-pending-20261030.md enumera os **90 casos individualmente**, com causa, evidência e gravidade, sem escrita corretiva:

- 29 partidas de Junho associadas a Julho/default-season: P1; todos os IDs já estavam no inventário histórico de realocação. A origem da escrita é provável, não comprovada; não foram encontrados Imports GC brutos correspondentes para revalidar a data original.
- 61 divergências: roundsJson é JSON null, enquanto payload.rounds existe; 44 P1, 16 P2 e um P3 sem rounds competitivos válidos. São projeções relacionais ausentes, com raw preservado. Não é possível provar se nunca foram escritas ou se foram sobrescritas depois, pois falta versão histórica do normalizador.

Pendências: autorização/reconciliação do baseline de migrations; aplicação aditiva real; upgrade SQLite; ativação coordenada; teste de carga e supervisão/alertas; reparação dirigida das 90 pendências depois de validar precedência das fontes. A nova projeção normalizada ainda não substitui os leitores legados de Match.roundsJson ou agregados oficiais. Portanto, COMPLETED comprova conclusão técnica do normalizador desta versão, não a correção semântica do parser 0.41.4.

Próxima fase: fixtures pequenas e auditáveis do parser para rounds competitivos versus knife/warmup, identidade de equipe versus lado T/CT e swaps, clutch attempts/wins, FK/FD/trade, damage/ADR/KAST, datas e ID de origem. Corrigir o parser com versão nova e comparar raw → normalizado → projeções em banco isolado. Só então preparar dry-run por GC ID, política de precedência GC/demo e autorização de reparo dirigido. Não alterar denominadores ou regras oficiais para fazer números coincidirem; não reconstruir snapshots oficiais automaticamente.
