#!/usr/bin/env sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "${ENV_FILE} not found. Copy .env.production.example to .env.production and fill secrets first." >&2
  exit 1
fi

if [ ! -f "docker/nginx/certs/fullchain.pem" ] || [ ! -f "docker/nginx/certs/privkey.pem" ]; then
  echo "TLS certificates are missing in docker/nginx/certs." >&2
  echo "Expected: fullchain.pem and privkey.pem" >&2
  exit 1
fi

mkdir -p backups

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T backend npm run db:migrate
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T backend npm run db:seed
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
