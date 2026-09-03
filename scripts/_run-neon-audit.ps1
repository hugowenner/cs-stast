# Wrapper temporario para rodar o audit no Neon.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/_run-neon-audit.ps1

$ROOT     = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ENV_NEON = Join-Path $ROOT ".env.neon-sync"

if (-not (Test-Path $ENV_NEON)) {
    Write-Host "ERRO: .env.neon-sync nao encontrado." -ForegroundColor Red
    exit 1
}

$cfg = @{}
Get-Content $ENV_NEON | Where-Object { $_ -match "^\s*[^#].*=.*" } | ForEach-Object {
    $p = $_ -split "=", 2
    $cfg[$p[0].Trim()] = $p[1].Trim().Trim('"').Trim("'")
}

$env:SOURCE_DATABASE_URL = $cfg["SOURCE_DATABASE_URL"]

try {
    Push-Location $ROOT
    & npm.cmd run _neon-audit
    Pop-Location
} finally {
    $env:SOURCE_DATABASE_URL = $null
}
