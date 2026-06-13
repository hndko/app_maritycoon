#!/usr/bin/env sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
REMOVE_VOLUMES=false
REMOVE_LOCAL_IMAGES=false
REMOVE_ALL=false

usage() {
  cat <<'EOF'
Usage: ./remove-deploy.sh [options]

Stops and removes the MariTycoon production Docker deployment.

Options:
  --volumes      Also remove Docker volumes. This deletes PostgreSQL, Redis, and Prometheus data.
  --rmi-local    Also remove local images built by Docker Compose.
  --all          Remove containers, networks, volumes, and all images used by Compose services.
  --help         Show this help message.

Environment:
  ENV_FILE       Defaults to .env.production.
  COMPOSE_FILE   Defaults to docker-compose.production.yml.

Safe default:
  ./remove-deploy.sh

Full wipe:
  ./remove-deploy.sh --all
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --volumes)
      REMOVE_VOLUMES=true
      ;;
    --rmi-local)
      REMOVE_LOCAL_IMAGES=true
      ;;
    --all)
      REMOVE_ALL=true
      REMOVE_VOLUMES=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "${COMPOSE_FILE} not found." >&2
  exit 1
fi

DOWN_ARGS="--remove-orphans"

if [ "${REMOVE_ALL}" = "true" ]; then
  cat <<'EOF'
WARNING: --all will delete the whole Docker deployment.
This removes containers, networks, PostgreSQL data, Redis data, Prometheus data,
and all images used by the Compose services.

This does not delete repository files, .env.production, backups/, or TLS cert files.
Make sure you have a fresh backup before continuing.
EOF
  printf "Type DELETE ALL to continue: "
  read -r CONFIRMATION

  if [ "${CONFIRMATION}" != "DELETE ALL" ]; then
    echo "Aborted."
    exit 1
  fi

  DOWN_ARGS="${DOWN_ARGS} --volumes --rmi all"
elif [ "${REMOVE_VOLUMES}" = "true" ]; then
  cat <<'EOF'
WARNING: --volumes will delete persistent Docker volumes.
This removes PostgreSQL data, Redis data, and Prometheus data for this deployment.
Make sure you have a fresh backup before continuing.
EOF
  printf "Type DELETE to continue: "
  read -r CONFIRMATION

  if [ "${CONFIRMATION}" != "DELETE" ]; then
    echo "Aborted."
    exit 1
  fi

  DOWN_ARGS="${DOWN_ARGS} --volumes"
fi

if [ "${REMOVE_LOCAL_IMAGES}" = "true" ] && [ "${REMOVE_ALL}" != "true" ]; then
  DOWN_ARGS="${DOWN_ARGS} --rmi local"
fi

if [ -f "${ENV_FILE}" ]; then
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" down ${DOWN_ARGS}
else
  docker compose -f "${COMPOSE_FILE}" down ${DOWN_ARGS}
fi

echo "deployment_removed=true"
