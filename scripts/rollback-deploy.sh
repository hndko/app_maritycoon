#!/usr/bin/env sh
set -eu

PREVIOUS_TAG="${1:-}"

if [ -z "${PREVIOUS_TAG}" ]; then
  echo "Usage: scripts/rollback-deploy.sh <previous-image-tag>" >&2
  exit 1
fi

echo "Rollback target tag: ${PREVIOUS_TAG}"
echo "Update image tags in your deployment environment, then run:"
echo "docker compose -f docker-compose.prod.yml pull"
echo "docker compose -f docker-compose.prod.yml up -d --remove-orphans"
echo "docker compose -f docker-compose.prod.yml ps"
