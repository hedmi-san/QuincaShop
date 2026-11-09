# ==============================================================================
# QuincaShop - Database Restore Utility (PowerShell)
# Restores PostgreSQL database from a SQL backup file.
# ==============================================================================

param (
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$DbName = "single_store_db",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "root",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Auto-detect psql binary if not in global PATH
$psqlCmd = "psql"
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    $candidates = @(
        "C:\dev\pstgrSQL\bin\psql.exe",
        "C:\Program Files\PostgreSQL\18\bin\psql.exe",
        "C:\Program Files\PostgreSQL\17\bin\psql.exe",
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            $psqlCmd = $c
            break
        }
    }
}

if (-not (Test-Path $BackupFile)) {
    Write-Error "❌ Backup file not found: $BackupFile"
}

if (-not $Force) {
    Write-Host "⚠️ WARNING: Restoring will overwrite existing data in '$DbName'!" -ForegroundColor Yellow
    $confirmation = Read-Host "Are you sure you want to proceed? (y/N)"
    if ($confirmation -notmatch "^[Yy]$") {
        Write-Host "Restore cancelled." -ForegroundColor Gray
        exit 0
    }
}

Write-Host "🔄 Restoring database '$DbName' from $BackupFile..." -ForegroundColor Cyan

# Check if quincashop_db Docker container is running
$dockerContainer = $null
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerContainer = docker ps --filter "name=quincashop_db" --format "{{.Names}}" 2>$null
}

if ($dockerContainer -eq "quincashop_db") {
    Write-Host "🐳 Restoring inside Docker container 'quincashop_db'..." -ForegroundColor Yellow
    Get-Content $BackupFile | docker exec -i quincashop_db psql -U $DbUser -d $DbName
} else {
    Write-Host "🖥️ Restoring via psql ($psqlCmd)..." -ForegroundColor Yellow
    $env:PGPASSWORD = $DbPassword
    & $psqlCmd -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $BackupFile
}

Write-Host "✅ Database restore completed successfully." -ForegroundColor Green
