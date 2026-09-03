param([switch]$Import)

$ErrorActionPreference = "Stop"

$ROOT       = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ENV_FILE   = Join-Path $ROOT ".env.vps-sync"
$LOCAL_PORT = 5433
$TMP_DIR    = Join-Path $ROOT "tmp"
$BACKUP_DIR = Join-Path $ROOT "backups"

if (-not (Test-Path $TMP_DIR))    { New-Item -ItemType Directory -Path $TMP_DIR    | Out-Null }
if (-not (Test-Path $BACKUP_DIR)) { New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null }

if (-not (Test-Path $ENV_FILE)) {
    Write-Host "ERRO: .env.vps-sync nao encontrado." -ForegroundColor Red
    exit 1
}

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
    Write-Host "ERRO: VPS_PG_PASSWORD nao definida em .env.vps-sync" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "CS2 Stats Hub - Sync DEV -> VPS (producao)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "SOURCE: PostgreSQL DEV local  (localhost:5432)"
Write-Host "TARGET: PostgreSQL VPS prod   ($VPS_SSH_HOST via tunnel :$LOCAL_PORT)"
if ($Import) {
    Write-Host "MODO:   IMPORTACAO REAL" -ForegroundColor Yellow
} else {
    Write-Host "MODO:   DRY RUN (somente comparacao)" -ForegroundColor Green
}
Write-Host ""

if ($Import) {
    Write-Host "ATENCAO: importacao aditiva sem TRUNCATE." -ForegroundColor Yellow
    Write-Host "Registros existentes na VPS serao preservados." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Confirmar importacao DEV -> VPS? [S/N]"
    if ($confirm -notin @("S", "s")) {
        Write-Host "Cancelado." -ForegroundColor DarkGray
        exit 0
    }
    Write-Host ""
}

$sshProcess = $null
$success    = $false

try {
    Write-Host "[1] Abrindo tunnel SSH para a VPS..." -ForegroundColor White

    $sshArgs = @(
        "-N",
        "-L", "${LOCAL_PORT}:${VPS_PG_INTERNAL_IP}:5432",
        "-p", $VPS_SSH_PORT,
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ExitOnForwardFailure=yes",
        "${VPS_SSH_USER}@${VPS_SSH_HOST}"
    )

    $sshProcess = Start-Process -FilePath "ssh" -ArgumentList $sshArgs `
        -NoNewWindow -PassThru -RedirectStandardError "$TMP_DIR\ssh-vps.err"

    Start-Sleep -Seconds 3

    if ($sshProcess.HasExited) {
        $errMsg = if (Test-Path "$TMP_DIR\ssh-vps.err") { Get-Content "$TMP_DIR\ssh-vps.err" -Raw } else { "" }
        Write-Host "FALHA: tunnel SSH nao abriu." -ForegroundColor Red
        if ($errMsg) { Write-Host $errMsg.Trim() -ForegroundColor DarkGray }
        exit 1
    }

    $tcpTest = Test-NetConnection -ComputerName "localhost" -Port $LOCAL_PORT -WarningAction SilentlyContinue
    if (-not $tcpTest.TcpTestSucceeded) {
        Write-Host "FALHA: porta $LOCAL_PORT nao responde." -ForegroundColor Red
        exit 1
    }

    Write-Host "OK: tunnel ativo em localhost:$LOCAL_PORT" -ForegroundColor Green
    Write-Host ""

    Write-Host "[2] Fazendo backup da VPS via pg_dump..." -ForegroundColor White

    $timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = Join-Path $BACKUP_DIR "vps_backup_${timestamp}.sql"

    $pgDumpCmd  = "PGPASSWORD='$VPS_PG_PASSWORD' pg_dump -h $VPS_PG_INTERNAL_IP -U $VPS_PG_USER -d $VPS_PG_DB --no-owner --no-acl -F p"

    $dumpProcess = Start-Process -FilePath "ssh" `
        -ArgumentList "-p $VPS_SSH_PORT -o StrictHostKeyChecking=accept-new ${VPS_SSH_USER}@${VPS_SSH_HOST} `"$pgDumpCmd`"" `
        -NoNewWindow -PassThru -Wait `
        -RedirectStandardOutput $backupFile `
        -RedirectStandardError  "$TMP_DIR\pg_dump.err"

    if ($dumpProcess.ExitCode -ne 0) {
        $errMsg = if (Test-Path "$TMP_DIR\pg_dump.err") { Get-Content "$TMP_DIR\pg_dump.err" -Raw } else { "" }
        Write-Host "FALHA: pg_dump retornou exit $($dumpProcess.ExitCode)." -ForegroundColor Red
        if ($errMsg) { Write-Host $errMsg.Trim() -ForegroundColor DarkGray }
        Write-Host "PARE: nao importar sem backup confirmado." -ForegroundColor Red
        exit 1
    }

    if (-not (Test-Path $backupFile)) {
        Write-Host "FALHA: arquivo de backup nao criado." -ForegroundColor Red
        exit 1
    }

    $backupSizeBytes = (Get-Item $backupFile).Length
    if ($backupSizeBytes -lt 1024) {
        Write-Host "FALHA: backup muito pequeno ($backupSizeBytes bytes)." -ForegroundColor Red
        exit 1
    }

    $backupSizeMb = [math]::Round($backupSizeBytes / 1MB, 2)
    Write-Host "OK: backup realizado." -ForegroundColor Green
    Write-Host "  Arquivo: $backupFile"
    Write-Host "  Tamanho: ${backupSizeMb} MB"
    Write-Host "  Data:    $timestamp"
    Write-Host ""

    Write-Host "[3] Executando comparacao DEV -> VPS..." -ForegroundColor White
    Write-Host ""

    $vpsUrl = "postgresql://${VPS_PG_USER}:${VPS_PG_PASSWORD}@localhost:${LOCAL_PORT}/${VPS_PG_DB}"

    $envMain = Join-Path $ROOT ".env"
    $devLine = Get-Content $envMain | Where-Object { $_ -match "^DATABASE_URL=" } | Select-Object -First 1
    $devUrl  = if ($devLine) { ($devLine -split "=", 2)[1].Trim().Trim('"').Trim("'") } else { "" }

    if (-not $devUrl) {
        Write-Host "ERRO: DATABASE_URL nao encontrada em .env" -ForegroundColor Red
        exit 1
    }

    $env:VPS_DATABASE_URL = $vpsUrl
    $env:DATABASE_URL     = $devUrl
    $env:DRY_RUN          = if ($Import) { "false" } else { "true" }

    try {
        Push-Location $ROOT
        & npm.cmd run db:sync-pg-dev-to-vps
        $exitCode = $LASTEXITCODE
        Pop-Location
    } finally {
        $env:VPS_DATABASE_URL = $null
        $env:DATABASE_URL     = $null
        $env:DRY_RUN          = $null
    }

    if ($exitCode -ne 0) {
        Write-Host "FALHA: db:sync-pg-dev-to-vps retornou exit $exitCode." -ForegroundColor Red
        exit 1
    }

    $success = $true

} finally {
    Write-Host ""
    Write-Host "[4] Encerrando tunnel SSH..." -ForegroundColor White

    if ($null -ne $sshProcess -and -not $sshProcess.HasExited) {
        Stop-Process -Id $sshProcess.Id -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path "$TMP_DIR\ssh-vps.err") { Remove-Item "$TMP_DIR\ssh-vps.err" -Force -ErrorAction SilentlyContinue }
    if (Test-Path "$TMP_DIR\pg_dump.err") { Remove-Item "$TMP_DIR\pg_dump.err" -Force -ErrorAction SilentlyContinue }

    Write-Host ""
    if ($success) {
        Write-Host "Operacao concluida com sucesso." -ForegroundColor Green
    } else {
        Write-Host "Operacao falhou." -ForegroundColor Red
    }
    Write-Host ""
}

if (-not $success) { exit 1 }
