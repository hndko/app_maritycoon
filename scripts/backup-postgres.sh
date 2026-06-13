#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/maritycoon-${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

pg_dump "${DATABASE_URL}" --format=custom --no-owner --no-acl --file="${FILE}"
echo "backup_created=${FILE}"
