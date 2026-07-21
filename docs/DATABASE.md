# Modelo de Dados

PostgreSQL, acessado via Prisma. IDs `cuid()`. Este documento descreve o modelo conceitual — o `schema.prisma` definitivo é criado na Etapa 5 e é a fonte de verdade em caso de divergência.

## Entidades

### Player

Identidade real de um jogador (independe de conta na aplicação).

- `id`, `steamId` (único), `nickname`, `avatarUrl`, `gamersClubId` (único, nullable), `createdAt`

### User

Conta da aplicação. Reservada para Fase 2 (auth). Opcionalmente ligada a um `Player`.

- `id`, `email` (único), `playerId` (FK → Player, nullable), `createdAt`

### Session

Agregado raiz de uma "noite de jogo" (ex: "Mix de Quinta").

- `id`, `name`, `date`, `createdAt`
- 1:N com `Match`

### Map

Catálogo de mapas.

- `id`, `name` (único), `imageUrl`

### Match

Uma partida individual, pertence a uma `Session`.

- `id`, `sessionId` (FK), `mapId` (FK), `gamersClubMatchId` (único, nullable), `playedAt`, `scoreTeamA`, `scoreTeamB`, `durationSeconds`
- 1:N com `PlayerMatchStats`, `Event`

### PlayerMatchStats

Estatísticas de um jogador em uma partida — a tabela mais granular e mais importante do sistema; toda estatística agregada é derivada daqui.

- `id`, `matchId` (FK), `playerId` (FK), `team`
- `kills`, `deaths`, `assists`, `headshots`
- `adr`, `rating`, `kast`, `impact`
- `entryKills`, `entryDeaths`, `tradeKills`
- `clutch1v1`, `clutch1v2`, `clutch1v3`, `clutch1v4`, `clutch1v5` (tentativas e vitórias)
- `eloBefore`, `eloAfter`
- Constraint única: (`matchId`, `playerId`)

### Achievement

Catálogo de conquistas (regra fixa no código/seed, não editável via UI no MVP).

- `id`, `code` (único, ex: `ACE`, `1000_KILLS`), `name`, `description`, `iconUrl`, `tier`

### PlayerAchievement

Registro de conquista obtida.

- `id`, `playerId` (FK), `achievementId` (FK), `matchId` (FK, nullable — algumas conquistas são cumulativas, sem match único), `earnedAt`
- Constraint única: (`playerId`, `achievementId`, `matchId`) para conquistas repetíveis por partida; conquistas cumulativas usam `matchId = null` e são únicas por jogador

### Rivalry

Registro par-a-par agregado entre dois jogadores (head-to-head, não por time — por confrontos diretos: kills de um contra o outro).

- `id`, `playerAId` (FK), `playerBId` (FK) — ordenado (`playerAId < playerBId`) para evitar duplicidade
- `killsAOnB`, `killsBOnA`, `matchesTogether`, `matchesAgainst`, `updatedAt`

### Event

Evento de uma partida. `type = KILL` carrega `victimId` e é a fonte de dados do `RivalryEngine` (head-to-head kills por par de jogadores); os demais tipos (`ACE`, `CLUTCH_1V1`..`CLUTCH_1V5`, `MULTI_KILL_3`..`MULTI_KILL_5`) são eventos notáveis que alimentam feed/highlights e disparam o `AchievementEngine`.

- `id`, `matchId` (FK), `playerId` (FK, autor do evento), `victimId` (FK, nullable — só em `KILL`), `type`, `roundNumber`, `metadata` (JSON), `createdAt`

### Import

Log de cada sincronização. Guarda o payload bruto do provedor (ex: JSON original da Gamers Club) junto do resultado — permite reprocessar/recalcular estatísticas, conquistas e ELO sem depender de uma nova sincronização, e absorve mudanças futuras no formato do provedor sem perder histórico.

- `id`, `source` (ex: `gc-companion`), `providerVersion` (versão do formato do payload, default `1`), `rawPayload` (JSON, nullable), `status` (`PENDING`, `RUNNING`, `SUCCESS`, `FAILED`), `startedAt`, `finishedAt`, `matchesImported`, `errorMessage` (nullable)

### Log

Log de auditoria/sistema genérico.

- `id`, `level`, `message`, `context` (JSON), `createdAt`

### Configuration

Chave/valor para parâmetros de sistema (ID do grupo Gamers Club, K-factor do ELO, thresholds de conquistas).

- `key` (PK), `value` (JSON), `updatedAt`

## Diagrama de relacionamento (simplificado)

```
Session 1─N Match N─1 Map
Match 1─N PlayerMatchStats N─1 Player
Match 1─N Event N─1 Player
Player 1─N PlayerAchievement N─1 Achievement
Player N─N Player (via Rivalry)
Player 0/1─1 User
```

## Índices previstos

- `PlayerMatchStats(playerId)`, `PlayerMatchStats(matchId)`
- `Match(sessionId)`, `Match(playedAt)`
- `Rivalry(playerAId, playerBId)` único
- `Event(matchId)`, `Event(playerId)`
