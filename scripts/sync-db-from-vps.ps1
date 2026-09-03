# scripts/sync-db-from-vps.ps1
# Sincroniza o PostgreSQL DEV local (Docker, localhost:5432) com os dados reais
# da VPS via SSH tunnel (localhost:5433). A VPS e acessada em somente leitura.
# O DEV e truncado e reconstruido com os dados da VPS.
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

# --- Configuracao -----------------------------------------------------------

$ROOT        = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ENV_FILE    = Join-Path $ROOT ".env.vps-sync"
$LOCAL_PORT  = 5433

# --- Verificar arquivo de configuracao --------------------------------------

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

# --- Banner e confirmacao ---------------------------------------------------

Write-Host ""
Write-Host "  CS2 Stats Hub - Atualizar banco DEV" -ForegroundColor Cyan
Write-Host "  ====================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ATENCAO:" -ForegroundColor Yellow
Write-Host "  Isso ira truncar o PostgreSQL DEV em localhost:5432 e"
Write-Host "  reconstrui-lo com os dados da VPS. Operacao destrutiva e irreversivel."
Write-Host "  A VPS sera somente leitura. Pare o servidor DEV antes de continuar."
Write-Host ""
$confirm = Read-Host "  Continuar? [S/N]"
if ($confirm -notin @("S", "s")) {
    Write-Host ""
    Write-Host "  Operacao cancelada." -ForegroundColor DarkGray
    Write-Host ""
    exit 0
}

Write-Host ""

# --- Variavel de controle do tunnel -----------------------------------------

$sshProcess = $null
$success    = $false

try {

    # -- [1/4] Abrir SSH tunnel ----------------------------------------------

    Write-Host "  [1/4] Conectando a VPS..." -ForegroundColor White

    $sshArgs = @(
        "-N",
        "-L", "${LOCAL_PORT}:${VPS_PG_INTERNAL_IP}:5432",
        "-p", $VPS_SSH_PORT,
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ExitOnForwardFailure=yes",
        "${VPS_SSH_USER}@${VPS_SSH_HOST}"
    )

    $sshProcess = Start-Process -FilePath "ssh" -ArgumentList $sshArgs `
        -NoNewWindow -PassThru -RedirectStandardError "$ROOT\tmp\ssh-tunnel.err"

    # Aguarda o tunnel estabilizar
    Start-Sleep -Seconds 3

    if ($sshProcess.HasExited) {
        $errMsg = if (Test-Path "$ROOT\tmp\ssh-tunnel.err") {
            Get-Content "$ROOT\tmp\ssh-tunnel.err" -Raw
        } else { "" }
        Write-Host ""
        Write-Host "  X Falha ao abrir o tunnel SSH." -ForegroundColor Red
        if ($errMsg) { Write-Host "    $($errMsg.Trim())" -ForegroundColor DarkGray }
        Write-Host ""
        exit 1
    }

    # -- [2/4] Validar conectividade -----------------------------------------

    Write-Host "  [2/4] Criando acesso temporario ao PostgreSQL..." -ForegroundColor White

    $tcpTest = Test-NetConnection -ComputerName "localhost" -Port $LOCAL_PORT -WarningAction SilentlyContinue
    if (-not $tcpTest.TcpTestSucceeded) {
        Write-Host ""
        Write-Host "  X Tunnel aberto mas porta $LOCAL_PORT nao responde." -ForegroundColor Red
        Write-Host "    Verifique se o PostgreSQL esta rodando na VPS." -ForegroundColor DarkGray
        Write-Host ""
        exit 1
    }

    # -- [3/4] Sincronizar VPS PostgreSQL -> DEV PostgreSQL ------------------

    Write-Host "  [3/4] Importando dados da producao para o DEV PostgreSQL..." -ForegroundColor White
    Write-Host ""

    $vpsUrl = "postgresql://${VPS_PG_USER}:${VPS_PG_PASSWORD}@localhost:${LOCAL_PORT}/${VPS_PG_DB}"

    # VPS_DATABASE_URL = source via tunnel; DATABASE_URL = target DEV Docker local.
    # Definidas apenas no escopo deste processo -- .env local nunca e tocado.
    $env:VPS_DATABASE_URL = $vpsUrl

    # & resolve npm.cmd pelo PATH e herda stdin/stdout/stderr.
    # Start-Process "npm" falha no Windows porque npm e um .cmd, nao um .exe Win32.
    Push-Location $ROOT
    & npm.cmd run db:sync-pg
    $snapshotExitCode = $LASTEXITCODE
    Pop-Location

    $env:VPS_DATABASE_URL = $null   # limpa imediatamente apos uso

    if ($snapshotExitCode -ne 0) {
        Write-Host ""
        Write-Host "  X db:sync-pg falhou (exit $snapshotExitCode)." -ForegroundColor Red
        exit 1
    }

    $success = $true

} finally {

    # -- [4/4] Encerrar tunnel (sempre -- mesmo em erro ou Ctrl+C) -----------

    Write-Host ""
    Write-Host "  [4/4] Encerrando conexao..." -ForegroundColor White

    if ($null -ne $sshProcess -and -not $sshProcess.HasExited) {
        Stop-Process -Id $sshProcess.Id -Force -ErrorAction SilentlyContinue
    }

    # Remove arquivo de erro temporario do tunnel
    $errFile = "$ROOT\tmp\ssh-tunnel.err"
    if (Test-Path $errFile) { Remove-Item $errFile -Force -ErrorAction SilentlyContinue }

    Write-Host ""
    if ($success) {
        Write-Host "  V Banco DEV atualizado com sucesso." -ForegroundColor Green
        Write-Host "  V Conexao encerrada." -ForegroundColor Green
    } else {
        Write-Host "  X Falha ao atualizar o banco DEV." -ForegroundColor Red
        Write-Host "  V Conexao encerrada." -ForegroundColor Green
    }
    Write-Host ""

}

if (-not $success) { exit 1 }
