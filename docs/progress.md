# Progress

## Completed

- Phase 2 Database:
  - Added PostgreSQL initial schema migration for guest users, rooms, room players, master properties, room properties, game logs, enums, constraints, and indexes.
  - Added migration runner and `db:migrate` script.
  - Added repeatable board seed data for 40 board positions with Indonesian property groups.
  - Added seed runner and `db:seed` script.
  - Added backend database configuration and PostgreSQL pool factory.
  - Added database unit tests for migration discovery and board seed integrity.
  - Verified migration and seed through Docker Compose backend container against PostgreSQL.
  - Verified repeatable migration/seed behavior.
- Phase 1 Project Setup:
  - Added npm workspace structure for `frontend` and `backend`.
  - Added Next.js TypeScript frontend shell with Tailwind design tokens.
  - Added NestJS TypeScript backend shell with validation, CORS, Helmet, and health endpoint.
  - Added Docker Compose stack for frontend, backend, PostgreSQL, and Redis.
  - Added frontend and backend Dockerfiles.
  - Added root quality scripts for lint, typecheck, test, build, and dev.
  - Added environment example files for root, frontend, and backend.
  - Verified lint, typecheck, test, build, production audit, and local boot smoke tests.
- Added initial root `.gitignore` for the planned Next.js, NestJS, Docker, PostgreSQL, Redis, test, cache, environment, and local-tool artifacts.
- Renamed main documentation files to use sequential numeric prefixes from `01` through `15`.
- Read all existing documents in `docs`.
- Created architecture planning document aligned with PRD.
- Created ERD document aligned with database and PRD requirements.
- Created realtime flow document for Socket.IO room and gameplay events.
- Created game state design document for Redis, PostgreSQL, and authoritative server state.
- Created development roadmap document with MVP phases and requirement gates.
- Re-read mandatory source documents before implementation planning:
  - `docs/01. prd.md`
  - `docs/02. design.md`
  - `docs/03. sitemap.md`
  - `docs/04. components.md`
  - `docs/05. database.md`
  - `docs/06. api-spec.md`
  - `docs/07. game-rules.md`
- Created pre-coding implementation plan.
- Created task breakdown following the required implementation order.
- Created dependency map for phases, runtime, database, events, and tests.

## In Progress

- Keep `.gitignore` updated as project tooling and generated artifacts are added.
- Keep documentation numbering updated when new long-lived docs are added.

## Pending

- Phase 3 backend API.
- Phase 4 realtime Socket.IO.
- Phase 5 frontend pages and game UI.
- Phase 6 gameplay engine.
- Phase 7 testing and coverage gate.
- Finalize invite-only room model.
- Finalize turn timer field and timeout behavior.
- Finalize ready status model for waiting room.
- Finalize full board tile index, tax values, utilities, stations, jail, and go-to-jail positions.
- Finalize Chance and Community Chest card deck and effects.
- Decide whether auction, spectator, trade, and host end-game behavior are in MVP scope.

## Known Issues

- Frontend still has no test files because frontend feature implementation starts in later phases.
- Full 80% coverage gate is pending until more product code exists.
- `npm audit` still reports dev-only vulnerabilities, while production audit (`npm audit --omit=dev`) is clean.
- Local host PostgreSQL connection using `localhost:5432` may collide with Windows/Laragon networking; Docker Compose service-to-service verification works using the backend container and `postgres` hostname.
- PRD requires invite-only rooms, but the current database/API docs do not define invite tokens or allowlists.
- PRD includes turn timer input, but the current database/API docs do not define timer persistence or realtime timeout events.
- Sitemap includes ready status, but the current database/API docs do not define ready state.
- Design/components mention trade UI, while PRD lists trading as a future feature.
- Reconnect timeout is required, but guest session token mechanics are not yet specified.
