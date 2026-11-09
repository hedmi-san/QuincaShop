#!/bin/bash
# ==============================================================================
# QuincaShop - Database Restore Utility
# Restores PostgreSQL database from a SQL or SQL.GZ backup archive.
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file> [db_name]"
  echo "Example: $0 ./backups/single_store_db_20261109_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${2:-${POSTGRES_DB:-single_store_db}}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "⚠️ WARNING: Restoring will overwrite existing data in '${DB_NAME}'!"
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore aborted."
  exit 0
fi

echo "🔄 Restoring database '${DB_NAME}' from ${BACKUP_FILE}..."

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"
else
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${BACKUP_FILE}"
fi

echo "✅ Database restore completed successfully."

