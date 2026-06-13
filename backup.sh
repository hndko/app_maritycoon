#!/usr/bin/env sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/maritycoon-${TIMESTAMP}.dump"

if [ ! -f "${ENV_FILE}" ]; then
  echo "${ENV_FILE} not found. Copy .env.production.example to .env.production first." >&2
  exit 1
fi

set -a
. "${ENV_FILE}"
set +a

mkdir -p "${BACKUP_DIR}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --format=custom --no-owner --no-acl > "${FILE}"

echo "backup_created=${FILE}"
