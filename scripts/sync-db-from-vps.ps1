param([switch]$Yes)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$configFile = Join-Path $root '.env.vps-sync'
$settings = @{}
Get-Content -LiteralPath $configFile | Where-Object { $_ -match '^\s*[^#].*=.*' } | ForEach-Object {
    $pair = $_ -split '=', 2
    $settings[$pair[0].Trim()] = $pair[1].Trim().Trim('"').Trim("'")
}
foreach ($key in @('VPS_SSH_USER','VPS_SSH_HOST','VPS_SSH_PORT','VPS_PG_USER','VPS_PG_PASSWORD','VPS_PG_DB')) {
    if (-not $settings[$key]) { throw "Missing configuration: $key" }
}
if ($settings['VPS_PG_DB'] -ne 'cs2stats') { throw 'Unexpected production database.' }
if (-not $Yes) {
    $confirm = Read-Host 'Create a verified VPS snapshot in a NEW local DEV database and promote .env/.env.local? Existing DEV will be preserved. [S/N]'
    if ($confirm -notin @('S','s')) { exit 0 }
}
$previousSource = $env:VPS_DATABASE_URL
$previousTarget = $env:DATABASE_URL
$tunnel = $null
$exitCode = 1
try {
    if (Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue) { throw 'Local tunnel port 5433 is occupied; no existing tunnel will be reused.' }
    $probe = @('-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8','-p',$settings['VPS_SSH_PORT'],($settings['VPS_SSH_USER']+'@'+$settings['VPS_SSH_HOST']))
    $remoteIp = (& ssh @probe "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' cs2-stats-postgres").Trim()
    if ($LASTEXITCODE -ne 0 -or $remoteIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') { throw 'Could not confirm the production PostgreSQL container IP.' }
    $backupFolder = Join-Path $root 'backups'
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
    $errorLog = Join-Path $backupFolder ('snapshot-tunnel-'+(Get-Date -Format 'yyyyMMddHHmmss')+'.log')
    $arguments = @('-N','-L',"127.0.0.1:5433:${remoteIp}:5432",'-p',$settings['VPS_SSH_PORT'],'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3',($settings['VPS_SSH_USER']+'@'+$settings['VPS_SSH_HOST']))
    $tunnel = Start-Process -FilePath 'ssh' -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardError $errorLog
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($tunnel.HasExited) { throw "SSH tunnel failed. See $errorLog" }
        if (Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue) { break }
        Start-Sleep -Milliseconds 200
    }
    if (-not (Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue)) { throw 'SSH tunnel did not become ready.' }
    $user = [Uri]::EscapeDataString($settings['VPS_PG_USER'])
    $password = [Uri]::EscapeDataString($settings['VPS_PG_PASSWORD'])
    $database = [Uri]::EscapeDataString($settings['VPS_PG_DB'])
    $env:VPS_DATABASE_URL = "postgresql://${user}:${password}@127.0.0.1:5433/${database}"
    # The TS entrypoint reads .env without overriding an explicitly supplied target.
    Push-Location $root
    try { & npm.cmd run db:sync-pg -- --execute --promote-dev; $exitCode = $LASTEXITCODE }
    finally { Pop-Location }
} catch {
    Write-Error $_ -ErrorAction Continue
    $exitCode = 1
} finally {
    if ($null -ne $tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -ErrorAction SilentlyContinue }
    $env:VPS_DATABASE_URL = $previousSource
    $env:DATABASE_URL = $previousTarget
}
exit $exitCode
