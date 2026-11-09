#!/bin/bash
# ==============================================================================
# QuincaShop - Automated Daily Database Backup Script
# Backs up PostgreSQL database to a timestamped archive and purges older backups.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_NAME="${POSTGRES_DB:-single_store_db}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "📦 [Backup] Starting backup for database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}..."

if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q 'quincashop_db'; then
  echo "🐳 Detected Docker container 'quincashop_db'. Running pg_dump inside container..."
  docker exec -t quincashop_db pg_dump -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${FILENAME}"
else
  echo "🖥️ Running local pg_dump..."
  pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${FILENAME}"
fi

FILESIZE=$(du -h "${FILENAME}" | cut -f1)
echo "✅ [Backup] Backup completed successfully: ${FILENAME} (${FILESIZE})"

# Retain last N days of backups
echo "🧹 [Backup] Rotating backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "${DB_NAME}_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "✨ [Backup] Routine maintenance complete."

