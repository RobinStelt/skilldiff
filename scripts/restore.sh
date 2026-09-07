#!/usr/bin/env bash
# Restores a skilldiff backup (overwrites the marktplatz database!).
#
# List available backups:
#   docker compose -f docker-compose.prod.yml exec backup ls -lh /backups
#
# Restore:
#   docker compose -f docker-compose.prod.yml exec backup \
#     bash /usr/local/bin/restore.sh /backups/daily-2026-09-07_0300.sql.gz
#
# Afterwards, restart the backend so any in-memory/pooled connection state
# is consistent with the restored data:
#   docker compose -f docker-compose.prod.yml restart backend
set -euo pipefail

FILE="${1:?Usage: restore.sh <backup-file.sql.gz> [--yes]}"
DB_HOST="${DB_HOST:-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD (the postgres superuser password) must be set}"
DB_NAME="${DB_NAME:-marktplatz}"

export PGPASSWORD="$DB_PASSWORD"

if [ ! -f "$FILE" ]; then
  echo "ERROR: file not found: $FILE" >&2
  exit 1
fi

if [ "${2:-}" != "--yes" ]; then
  echo "WARNING: this overwrites the $DB_NAME database completely with the"
  echo "state from: $FILE"
  read -r -p "Continue? (yes/no) " answer
  if [ "$answer" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "[restore] loading $FILE ..."
gunzip -c "$FILE" | psql -h "$DB_HOST" -U "$DB_USER" "$DB_NAME"
echo "[restore] done. Please restart the backend."
