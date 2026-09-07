#!/usr/bin/env bash
# Nightly Postgres backup for the production skilldiff deployment
# (database: marktplatz — see docker-compose.prod.yml, service "backup").
#
# Runs as a sidecar container in daemon mode, but can also be run once:
#
#   docker compose -f docker-compose.prod.yml exec backup bash /usr/local/bin/backup.sh
#
# Rotation: keeps the last DAILY_KEEP daily and WEEKLY_KEEP weekly (Sunday
# copy) dumps — same scheme as the sibling plantwiz deployment's
# scripts/backup.sh, adapted from mysqldump to pg_dump.
set -euo pipefail

DB_HOST="${DB_HOST:-postgres}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD (the postgres superuser password) must be set}"
DB_NAME="${DB_NAME:-marktplatz}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_HOUR="${BACKUP_HOUR:-3}" # hour (UTC) the daily backup runs at
DAILY_KEEP="${DAILY_KEEP:-7}"
WEEKLY_KEEP="${WEEKLY_KEEP:-4}"

export PGPASSWORD="$DB_PASSWORD"

rotate() {
  local prefix="$1" keep="$2" files
  # ls fails if no backups with this prefix exist yet
  files=$(ls -1t "$BACKUP_DIR/$prefix-"*.sql.gz 2>/dev/null || true)
  [ -n "$files" ] || return 0
  echo "$files" | tail -n +"$((keep + 1))" | while read -r old; do
    echo "[backup] removing old backup: $old"
    rm -f "$old"
  done
}

run_backup() {
  local stamp file
  stamp="$(date -u +%Y-%m-%d_%H%M)"
  file="$BACKUP_DIR/daily-$stamp.sql.gz"
  mkdir -p "$BACKUP_DIR"
  echo "[backup] starting dump ($DB_NAME) to $file"

  # .part file so an aborted dump never counts as a valid backup
  pg_dump -h "$DB_HOST" -U "$DB_USER" --no-owner --no-privileges "$DB_NAME" \
    | gzip > "$file.part"
  mv "$file.part" "$file"

  # Also keep a weekly copy on Sundays
  if [ "$(date -u +%u)" = "7" ]; then
    cp "$file" "$BACKUP_DIR/weekly-$stamp.sql.gz"
  fi

  rotate daily "$DAILY_KEEP"
  rotate weekly "$WEEKLY_KEEP"
  echo "[backup] done: $(du -h "$file" | cut -f1), $(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l) backups in the archive"
}

if [ "${1:-}" = "--daemon" ]; then
  echo "[backup] daemon started — daily backup at ${BACKUP_HOUR}:00 UTC to $BACKUP_DIR"
  while true; do
    now=$(date -u +%s)
    target=$(date -u -d "today ${BACKUP_HOUR}:00" +%s)
    if [ "$target" -le "$now" ]; then
      target=$(date -u -d "tomorrow ${BACKUP_HOUR}:00" +%s)
    fi
    echo "[backup] next backup: $(date -u -d "@$target" '+%Y-%m-%d %H:%M UTC')"
    sleep $(( target - now ))
    run_backup || echo "[backup] ERROR: backup failed ($(date -u))"
  done
else
  run_backup
fi
