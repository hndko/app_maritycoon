#!/usr/bin/env sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

if [ "$#" -ne 1 ]; then
  echo "Usage: ./restore.sh <backup.dump>" >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "${ENV_FILE} not found. Copy .env.production.example to .env.production first." >&2
  exit 1
fi

set -a
. "${ENV_FILE}"
set +a

if [ ! -f "$1" ]; then
  echo "Backup file not found: $1" >&2
  exit 1
fi

cat "$1" | docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-acl

echo "restore_completed=$1"
