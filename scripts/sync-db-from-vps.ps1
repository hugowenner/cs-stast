# scripts/sync-db-from-vps.ps1
# Sincroniza o PostgreSQL DEV local (Docker, localhost:5432) com os dados reais
# da VPS via SSH tunnel (localhost:5433).
#
# REGRA DE SEGURANCA:
# - A VPS e acessada ESTRITAMENTE EM MODO SOMENTE LEITURA.
# - O DEV local e o unico destino de modificacoes (limpeza e ingestao).
# - Um backup preventivo do DEV local e gerado antes da sincronizacao.
#
# Pre-requisito (uma unica vez):
#   Copie .env.vps-sync.example -> .env.vps-sync e preencha VPS_PG_PASSWORD.
#   DATABASE_URL no .env local deve apontar para o PostgreSQL DEV Docker.
#   O container cs2-stats-postgres-dev deve estar rodando
#   (docker compose -f docker-compose.dev.yml up -d).
#
# Uso:
#   npm run db:sync-from-vps

$ErrorActionPreference = "Stop"

# --- Configuracao de Caminhos -----------------------------------------------

$ROOT        = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ENV_FILE    = Join-Path $ROOT ".env.vps-sync"
$DOTENV_FILE = Join-Path $ROOT ".env"
$LOCAL_PORT  = 5433

# --- Funcoes Auxiliares -----------------------------------------------------

function Get-RedactedUrl([string]$url) {
    if ([string]::IsNullOrWhiteSpace($url)) { return "" }
    return [regex]::Replace($url, ':[^:@]+@', ':****@')
}

# --- Verificar arquivo de configuracao da VPS -------------------------------

if (-not (Test-Path $ENV_FILE)) {
    Write-Host ""
    Write-Host "  CONFIGURACAO NECESSARIA" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  O arquivo .env.vps-sync nao foi encontrado."
    Write-Host "  Crie-o uma unica vez a partir do template:"
    Write-Host ""
    Write-Host "    copy .env.vps-sync.example .env.vps-sync" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Depois edite .env.vps-sync e preencha VPS_PG_PASSWORD."
    Write-Host ""
    exit 1
}

# Le variaveis do .env.vps-sync (ignora comentarios e linhas vazias)
$config = @{}
Get-Content $ENV_FILE | Where-Object { $_ -match "^\s*[^#].*=.*" } | ForEach-Object {
    $parts = $_ -split "=", 2
    $config[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
}

$VPS_SSH_USER       = if ($config["VPS_SSH_USER"])       { $config["VPS_SSH_USER"] }       else { "root" }
$VPS_SSH_HOST       = if ($config["VPS_SSH_HOST"])       { $config["VPS_SSH_HOST"] }       else { "143.95.161.39" }
$VPS_SSH_PORT       = if ($config["VPS_SSH_PORT"])       { $config["VPS_SSH_PORT"] }       else { "22022" }
$VPS_PG_INTERNAL_IP = if ($config["VPS_PG_INTERNAL_IP"]) { $config["VPS_PG_INTERNAL_IP"] } else { "172.18.0.2" }
$VPS_PG_USER        = if ($config["VPS_PG_USER"])        { $config["VPS_PG_USER"] }        else { "cs2stats" }
$VPS_PG_PASSWORD    = if ($config["VPS_PG_PASSWORD"])    { $config["VPS_PG_PASSWORD"] }    else { "" }
$VPS_PG_DB          = if ($config["VPS_PG_DB"])          { $config["VPS_PG_DB"] }          else { "cs2stats" }

if (-not $VPS_PG_PASSWORD) {
    Write-Host ""
    Write-Host "  ERRO: VPS_PG_PASSWORD nao definida em .env.vps-sync" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# --- Obter e Validar Parametros do DEV Local --------------------------------

$DEV_DATABASE_URL = $env:DATABASE_URL
if (-not $DEV_DATABASE_URL -and (Test-Path $DOTENV_FILE)) {
    Get-Content $DOTENV_FILE | Where-Object { $_ -match "^\s*DATABASE_URL\s*=" } | ForEach-Object {
        $parts = $_ -split "=", 2
        $DEV_DATABASE_URL = $parts[1].Trim().Trim('"').Trim("'")
    }
}
if (-not $DEV_DATABASE_URL) {
    $DEV_DATABASE_URL = "postgresql://cs2stats_dev:dev_only_cs2stats_2026@localhost:5432/cs2_stats_dev_snapshot_20260920"
}

$devUser = "cs2stats_dev"
$devDb   = "cs2_stats_dev_snapshot_20260920"
$devHost = "localhost"
$devPort = "5432"

if ($DEV_DATABASE_URL -match "postgresql?://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(.+)$") {
    $devUser = $matches[1]
    $devHost = $matches[3]
    if ($matches[4]) { $devPort = $matches[4] }
    $devDb = ($matches[5] -split "\?")[0]
}

# --- Banner e Confirmacao Explicita -----------------------------------------

$vpsDisplay = "postgresql://${VPS_PG_USER}:****@${VPS_SSH_HOST}:${VPS_SSH_PORT} (via tunnel localhost:${LOCAL_PORT}/${VPS_PG_DB})"
$devDisplay = Get-RedactedUrl $DEV_DATABASE_URL

Write-Host ""
Write-Host "  CS2 Stats Hub - Sincronizacao de Banco de Dados" -ForegroundColor Cyan
Write-Host "  =================================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ORIGEM  (VPS / PRD - Somente Leitura):" -ForegroundColor White
Write-Host "    $vpsDisplay" -ForegroundColor DarkCyan
Write-Host "  DESTINO (DEV Local - Sobrescrita):" -ForegroundColor White
Write-Host "    $devDisplay" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ATENCAO:" -ForegroundColor Yellow
Write-Host "  - A base PRD da VPS sera consultada exclusivamente em modo SOMENTE LEITURA."
Write-Host "  - O banco DEV local sera limpo e reconstruido com os dados de PRD."
Write-Host "  - Um backup local do DEV sera gerado antes de qualquer alteracao."
Write-Host ""

$confirm = Read-Host "  Deseja realmente sobrescrever a base DEV local com os dados da VPS? [S/N]"
if ($confirm -notin @("S", "s")) {
    Write-Host ""
    Write-Host "  Operacao cancelada pelo usuario." -ForegroundColor DarkGray
    Write-Host ""
    exit 0
}

Write-Host ""

# --- Variaveis de Controle --------------------------------------------------

$sshProcess = $null
$success    = $false

try {

    # -- [1/4] Verificar Container DEV Local ---------------------------------

    Write-Host "  [1/4] Verificando container PostgreSQL DEV local..." -ForegroundColor White

    $containerRunning = & docker ps -q --filter "name=cs2-stats-postgres-dev"
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerRunning)) {
        Write-Host ""
        Write-Host "  [X] ERRO: O container 'cs2-stats-postgres-dev' nao esta rodando." -ForegroundColor Red
        Write-Host "      Inicie o container antes da sincronizacao:" -ForegroundColor Yellow
        Write-Host "        docker compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan
        Write-Host ""
        exit 1
    }

    # -- [2/4] Backup Preventivo do DEV Local --------------------------------

    Write-Host "  [2/4] Gerando backup preventivo do banco DEV local..." -ForegroundColor White

    $backupDir = Join-Path $ROOT "backups"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = Join-Path $backupDir "dev_backup_before_vps_sync_$timestamp.dump"
    $containerDumpPath = "/tmp/backup_dev_$timestamp.dump"

    # Executa pg_dump dentro do proprio container (garante compatibilidade 100% com PG16)
    & docker exec cs2-stats-postgres-dev pg_dump -U $devUser -d $devDb -F c -f $containerDumpPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  [X] ERRO CRITICO: Falha ao executar pg_dump no DEV local (exit $LASTEXITCODE)." -ForegroundColor Red
        Write-Host "      A sincronizacao foi INTERROMPIDA para proteger o banco DEV." -ForegroundColor Yellow
        exit 1
    }

    # Copia o dump do container para a maquina host
    & docker cp "cs2-stats-postgres-dev:${containerDumpPath}" $backupFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  [X] ERRO CRITICO: Falha ao copiar o backup do container para o host (exit $LASTEXITCODE)." -ForegroundColor Red
        & docker exec cs2-stats-postgres-dev rm -f $containerDumpPath
        exit 1
    }

    # Remove o arquivo temporario dentro do container
    & docker exec cs2-stats-postgres-dev rm -f $containerDumpPath

    # Valida se o arquivo gerado existe e tem tamanho > 0
    if (-not (Test-Path $backupFile) -or (Get-Item $backupFile).Length -eq 0) {
        Write-Host ""
        Write-Host "  [X] ERRO CRITICO: Arquivo de backup local nao foi criado ou esta vazio." -ForegroundColor Red
        Write-Host "      A sincronizacao foi INTERROMPIDA para proteger o banco DEV." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "  [OK] Backup DEV salvo com sucesso em: $backupFile" -ForegroundColor Green

    # -- [3/4] Abrir SSH Tunnel e Validar Conectividade ----------------------

    Write-Host "  [3/4] Conectando a VPS via SSH Tunnel (somente leitura)..." -ForegroundColor White

    # Valida se a porta local 5433 ja esta em uso para evitar conflitos
    $portCheck = Get-NetTCPConnection -LocalPort $LOCAL_PORT -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host ""
        Write-Host "  [X] ERRO: A porta local $LOCAL_PORT ja esta ocupada por outro processo." -ForegroundColor Red
        Write-Host "      Encerre instancias anteriores ou tuneis SSH residuais antes de continuar." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

    # Tenta obter o IP do container PostgreSQL dinamicamente na VPS para prevenir falhas por realocacao de IP no Docker
    $dynamicIp = ""
    try {
        $inspectCmd = "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cs2-stats-postgres 2>/dev/null"
        $probeArgs = @(
            "-p", $VPS_SSH_PORT,
            "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=accept-new",
            "-o", "ConnectTimeout=5",
            "${VPS_SSH_USER}@${VPS_SSH_HOST}",
            $inspectCmd
        )
        $dynamicIp = (& ssh @probeArgs 2>$null)
        if ($dynamicIp) { $dynamicIp = $dynamicIp.Trim() }
    } catch {
        $dynamicIp = ""
    }

    if ($dynamicIp -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$') {
        if ($dynamicIp -ne $VPS_PG_INTERNAL_IP) {
            Write-Host "  [i] IP do PostgreSQL na VPS resolvido dinamicamente: $dynamicIp (configurado: $VPS_PG_INTERNAL_IP)" -ForegroundColor Cyan
        } else {
            Write-Host "  [i] IP do PostgreSQL na VPS confirmado: $dynamicIp" -ForegroundColor DarkGray
        }
        $VPS_PG_INTERNAL_IP = $dynamicIp
    } else {
        Write-Host "  [!] Nao foi possivel consultar o IP dinamicamente via SSH. Utilizando IP configurado: $VPS_PG_INTERNAL_IP" -ForegroundColor Yellow
    }

    $tmpDir = Join-Path $ROOT "tmp"
    if (-not (Test-Path $tmpDir)) {
        New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
    }
    $errFile = Join-Path $tmpDir "ssh-tunnel.err"
    if (Test-Path $errFile) { Remove-Item $errFile -Force -ErrorAction SilentlyContinue }

    $sshArgs = @(
        "-N",
        "-L", "${LOCAL_PORT}:${VPS_PG_INTERNAL_IP}:5432",
        "-p", $VPS_SSH_PORT,
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ExitOnForwardFailure=yes",
        "-o", "ServerAliveInterval=15",
        "-o", "ServerAliveCountMax=3",
        "${VPS_SSH_USER}@${VPS_SSH_HOST}"
    )

    $sshProcess = Start-Process -FilePath "ssh" -ArgumentList $sshArgs `
        -NoNewWindow -PassThru -RedirectStandardError $errFile

    # Aguarda o tunnel estabilizar
    Start-Sleep -Seconds 3

    if ($sshProcess.HasExited) {
        $errMsg = if (Test-Path $errFile) { Get-Content $errFile -Raw } else { "" }
        Write-Host ""
        Write-Host "  [X] Falha ao abrir o tunnel SSH com a VPS." -ForegroundColor Red
        if ($errMsg) { Write-Host "      $($errMsg.Trim())" -ForegroundColor DarkGray }
        Write-Host ""
        exit 1
    }

    $tcpTest = Test-NetConnection -ComputerName "localhost" -Port $LOCAL_PORT -WarningAction SilentlyContinue
    if (-not $tcpTest.TcpTestSucceeded) {
        Write-Host ""
        Write-Host "  [X] Tunnel aberto, mas porta $LOCAL_PORT nao responde." -ForegroundColor Red
        Write-Host "      Verifique se o PostgreSQL esta ativo na VPS." -ForegroundColor DarkGray
        Write-Host ""
        exit 1
    }

    Write-Host "  [OK] Conexao com a VPS estabelecida com sucesso." -ForegroundColor Green

    # -- [4/4] Executar Sincronizacao Prisma (PRD -> DEV) -------------------

    Write-Host "  [4/4] Importando dados de PRD para o banco DEV local..." -ForegroundColor White
    Write-Host ""

    $vpsUrl = "postgresql://${VPS_PG_USER}:${VPS_PG_PASSWORD}@localhost:${LOCAL_PORT}/${VPS_PG_DB}"

    # VPS_DATABASE_URL = source via tunnel; DATABASE_URL = target DEV local.
    # Definidas apenas no escopo deste processo.
    $env:VPS_DATABASE_URL = $vpsUrl
    $env:DATABASE_URL     = $DEV_DATABASE_URL

    Push-Location $ROOT
    & npm.cmd run db:sync-pg
    $snapshotExitCode = $LASTEXITCODE
    Pop-Location

    $env:VPS_DATABASE_URL = $null

    if ($snapshotExitCode -ne 0) {
        Write-Host ""
        Write-Host "  [X] Falha na sincronizacao: db:sync-pg retornou codigo $snapshotExitCode." -ForegroundColor Red
        exit 1
    }

    $success = $true

} finally {

    # -- Encerramento e Limpeza ----------------------------------------------

    Write-Host ""
    Write-Host "  Encerrando conexao com a VPS..." -ForegroundColor White

    if ($null -ne $sshProcess -and -not $sshProcess.HasExited) {
        Stop-Process -Id $sshProcess.Id -Force -ErrorAction SilentlyContinue
    }

    $errFile = Join-Path $ROOT "tmp\ssh-tunnel.err"
    if (Test-Path $errFile) { Remove-Item $errFile -Force -ErrorAction SilentlyContinue }

    Write-Host ""
    if ($success) {
        Write-Host "  [V] Banco DEV atualizado com sucesso a partir da VPS!" -ForegroundColor Green
        Write-Host "  [V] Conexao SSH encerrada." -ForegroundColor Green
    } else {
        Write-Host "  [X] Falha durante a atualizacao do banco DEV." -ForegroundColor Red
        Write-Host "  [!] Conexao SSH encerrada." -ForegroundColor Yellow
    }
    Write-Host ""

}

if (-not $success) { exit 1 }
