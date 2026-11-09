# ==============================================================================
# QuincaShop - Automated Daily Database Backup Script (PowerShell)
# Backs up PostgreSQL database to a timestamped file and purges older backups.
# ==============================================================================

param (
    [string]$BackupDir = "./backups",
    [string]$DbName = "single_store_db",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "root",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

# Auto-detect pg_dump binary if not in global PATH
$pgDumpCmd = "pg_dump"
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    $candidates = @(
        "C:\dev\pstgrSQL\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            $pgDumpCmd = $c
            break
        }
    }
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$OutputFile = Join-Path $BackupDir "${DbName}_${Timestamp}.sql"

Write-Host "📦 [Backup] Starting backup for database '$DbName' on ${DbHost}:${DbPort}..." -ForegroundColor Cyan

# Check if quincashop_db Docker container is running
$dockerContainer = $null
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerContainer = docker ps --filter "name=quincashop_db" --format "{{.Names}}" 2>$null
}

if ($dockerContainer -eq "quincashop_db") {
    Write-Host "🐳 Running pg_dump inside Docker container 'quincashop_db'..." -ForegroundColor Yellow
    docker exec quincashop_db pg_dump -U $DbUser -d $DbName | Out-File -FilePath $OutputFile -Encoding utf8
} else {
    Write-Host "🖥️ Running pg_dump ($pgDumpCmd)..." -ForegroundColor Yellow
    $env:PGPASSWORD = $DbPassword
    & $pgDumpCmd -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $OutputFile
}

if (Test-Path $OutputFile) {
    $fileInfo = Get-Item $OutputFile
    $fileSizeKb = [math]::Round($fileInfo.Length / 1KB, 2)
    Write-Host "✅ [Backup] Backup completed: $OutputFile ($fileSizeKb KB)" -ForegroundColor Green
} else {
    Write-Error "❌ Backup file was not created."
}

# Purge backups older than RetentionDays
Write-Host "🧹 [Backup] Rotating backups older than $RetentionDays days..." -ForegroundColor Gray
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "${DbName}_*.sql" | Where-Object { $_.LastWriteTime -lt $cutoffDate } | Remove-Item -Force
Write-Host "✨ [Backup] Routine maintenance complete." -ForegroundColor Green
