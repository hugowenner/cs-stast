# scripts/sync-from-neon.ps1
#
# Compara o banco historico Neon com o PostgreSQL DEV local (Docker)
# e, opcionalmente, importa os registros faltantes de forma ADITIVA.
#
# Nunca trunca. O Neon e somente leitura em qualquer momento.
# A VPS esta COMPLETAMENTE fora do escopo deste script.
#
# Pre-requisitos:
#   1. Copie .env.neon-sync.example -> .env.neon-sync e preencha SOURCE_DATABASE_URL.
#   2. O container cs2-stats-postgres-dev deve estar rodando:
#        docker compose -f docker-compose.dev.yml up -d
#   3. DATABASE_URL no .env aponta para localhost:5432 (DEV Docker).
#
# Uso via npm:
#   npm run db:sync-from-neon           -> dry-run (somente comparacao)
#   npm run db:sync-from-neon:import    -> importacao real (com confirmacao)

param(
    [switch]$Import
)

$ErrorActionPreference = "Stop"

$ROOT      = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ENV_NEON  = Join-Path $ROOT ".env.neon-sync"
$ENV_LOCAL = Join-Path $ROOT ".env"
$DRY_RUN   = if ($Import) { "false" } else { "true" }

# --- Verificar arquivo de configuracao Neon ----------------------------------

if (-not (Test-Path $ENV_NEON)) {
    Write-Host ""
    Write-Host "  CONFIGURACAO NECESSARIA" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  O arquivo .env.neon-sync nao foi encontrado."
    Write-Host "  Crie-o a partir do template:"
    Write-Host ""
    Write-Host "    copy .env.neon-sync.example .env.neon-sync" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Depois edite .env.neon-sync e preencha SOURCE_DATABASE_URL"
    Write-Host "  com a connection string do banco historico Neon."
    Write-Host ""
    exit 1
}

# --- Ler SOURCE_DATABASE_URL do .env.neon-sync -------------------------------

$neonConfig = @{}
Get-Content $ENV_NEON | Where-Object { $_ -match "^\s*[^#].*=.*" } | ForEach-Object {
    $parts = $_ -split "=", 2
    $neonConfig[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
}

$SOURCE_DATABASE_URL = $neonConfig["SOURCE_DATABASE_URL"]

if (-not $SOURCE_DATABASE_URL -or $SOURCE_DATABASE_URL -like "*password*" -or $SOURCE_DATABASE_URL -like "*user:pass*") {
    Write-Host ""
    Write-Host "  ERRO: SOURCE_DATABASE_URL nao esta preenchida em .env.neon-sync" -ForegroundColor Red
    Write-Host "  Edite o arquivo e substitua pelo valor real da connection string do Neon." -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

# --- Ler DATABASE_URL do .env local ------------------------------------------

$localConfig = @{}
if (Test-Path $ENV_LOCAL) {
    Get-Content $ENV_LOCAL | Where-Object { $_ -match "^\s*[^#].*=.*" } | ForEach-Object {
        $parts = $_ -split "=", 2
        $localConfig[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
    }
}

$DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { $localConfig["DATABASE_URL"] }

if (-not $DATABASE_URL) {
    Write-Host ""
    Write-Host "  ERRO: DATABASE_URL nao encontrada em .env ou variavel de ambiente." -ForegroundColor Red
    Write-Host ""
    exit 1
}

if (-not ($DATABASE_URL -match "localhost:5432" -or $DATABASE_URL -match "127\.0\.0\.1:5432")) {
    Write-Host ""
    Write-Host "  ERRO: DATABASE_URL nao aponta para localhost:5432." -ForegroundColor Red
    Write-Host "  Valor detectado: $($DATABASE_URL -replace ':[^:@]+@', ':****@')" -ForegroundColor DarkGray
    Write-Host "  Somente o DEV Docker local e permitido como destino." -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

# --- Banner ------------------------------------------------------------------

Write-Host ""
Write-Host "  CS2 Stats Hub - Neon -> DEV PostgreSQL local" -ForegroundColor Cyan
Write-Host "  ==============================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Source: Neon (somente leitura)" -ForegroundColor White
Write-Host "  Target: DEV Docker localhost:5432" -ForegroundColor White
Write-Host "  VPS:    FORA DO ESCOPO" -ForegroundColor DarkGray
Write-Host ""

if ($DRY_RUN -eq "true") {
    Write-Host "  Modo: DRY RUN - nenhum dado sera alterado." -ForegroundColor Yellow
    Write-Host "  Para importar, execute: npm run db:sync-from-neon:import" -ForegroundColor DarkGray
} else {
    Write-Host "  Modo: IMPORTACAO REAL" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Esta operacao ira INSERIR registros faltantes no DEV PostgreSQL." -ForegroundColor Yellow
    Write-Host "  Dados existentes no DEV nao serao apagados nem sobrescritos." -ForegroundColor Yellow
    Write-Host "  O Neon permanecera somente leitura." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "  Continuar? [S/N]"
    if ($confirm -notin @("S", "s")) {
        Write-Host ""
        Write-Host "  Operacao cancelada." -ForegroundColor DarkGray
        Write-Host ""
        exit 0
    }
}

Write-Host ""

# --- Verificar container DEV -------------------------------------------------

$tcpTest = Test-NetConnection -ComputerName "localhost" -Port 5432 -WarningAction SilentlyContinue
if (-not $tcpTest.TcpTestSucceeded) {
    Write-Host "  ERRO: PostgreSQL DEV nao responde em localhost:5432." -ForegroundColor Red
    Write-Host "  Inicie o container com:" -ForegroundColor DarkGray
    Write-Host "    docker compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# --- Executar script TypeScript ----------------------------------------------

$env:SOURCE_DATABASE_URL = $SOURCE_DATABASE_URL
$env:DRY_RUN             = $DRY_RUN

$exitCode = 0
try {
    Push-Location $ROOT
    & npm.cmd run db:sync-pg-neon
    $exitCode = $LASTEXITCODE
    Pop-Location
} finally {
    $env:SOURCE_DATABASE_URL = $null
    $env:DRY_RUN             = $null
}

Write-Host ""
if ($exitCode -eq 0) {
    if ($DRY_RUN -eq "true") {
        Write-Host "  OK Comparacao concluida." -ForegroundColor Green
    } else {
        Write-Host "  OK Importacao concluida." -ForegroundColor Green
        Write-Host "  Valide os dados subindo a aplicacao DEV." -ForegroundColor DarkGray
    }
} else {
    Write-Host "  ERRO Falha (exit $exitCode)." -ForegroundColor Red
    exit 1
}
Write-Host ""
