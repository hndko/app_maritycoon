# Progress

## Completed

- Phase 5 Frontend:
  - Added frontend API client and shared TypeScript contracts for room, player, property, realtime state, chat, create room, and join room flows.
  - Added local room session persistence for guest/player identity used by Socket.IO reconnect.
  - Added Socket.IO client factory and Zustand room store for realtime room state, connection status, and chat messages.
  - Added reusable UI components for app shell, buttons, inputs, selects, cards, badges, and loading states.
  - Added Home page with create/join navigation, public room list, refresh flow, and how-to-play content.
  - Added Create Room page connected to `POST /api/rooms`, storing host session and redirecting to `/room/:roomId`.
  - Added Join Room page connected to `POST /api/rooms/join`, including password-required handling and session persistence.
  - Added Room page connected to REST room detail, board properties, Socket.IO `join_room`, `chat_message`, `start_game`, `room_state_update`, `chat_broadcast`, and `game_started`.
  - Added responsive game screen shell with 40-tile board, player list, action panel, chat box, and game log.
  - Kept gameplay-only actions disabled until Phase 6 backend gameplay is implemented.
  - Added frontend tests for board layout helpers, Indonesian formatting, and session persistence.
  - Verified Phase 5 through lint, typecheck, test, build, production audit, browser create-room smoke test, chat smoke test, and mobile viewport smoke test.
- Phase 4 Realtime:
  - Added Redis infrastructure module and service for realtime state, socket session mapping, reconnect windows, state versioning, and chat rate counters.
  - Added Socket.IO realtime module with `join_room`, `chat_message`, and `start_game` events.
  - Added authoritative room state broadcasts through `room_state_update`.
  - Added user/system chat broadcast shape through `chat_broadcast` and persisted chat logs.
  - Added host-only `start_game` validation for waiting rooms with at least two players.
  - Added game start persistence for room status, player turn order, starting money, and game log.
  - Added reconnect behavior that marks disconnected player slots for a 5-minute Redis-backed window without removing room player records.
  - Added socket payload validation and room/player membership validation.
  - Added chat anti-spam rate limiting per room/player.
  - Added realtime service tests for room isolation, reconnect, host-only start, and chat anti-spam.
  - Verified Phase 4 through lint, typecheck, test, build, production audit, and Docker Compose Socket.IO smoke test.
- Phase 3 Backend API:
  - Added PostgreSQL-backed database module and injectable database service for NestJS repositories.
  - Added guest creation API at `POST /api/guests`.
  - Added room creation API at `POST /api/rooms` with host guest/player creation, unique room code generation, password hashing, visibility handling, starting money, and turn timer persistence.
  - Added public room listing API at `GET /api/rooms/public` with status, max player, and full-room filters.
  - Added room join API at `POST /api/rooms/join` with password-required, invalid-password, finished-room, and full-room validation.
  - Added room detail and player listing APIs at `GET /api/rooms/:roomId` and `GET /api/rooms/:roomId/players`.
  - Added read-only board property API at `GET /api/game/properties`.
  - Added repository pattern for guests, rooms, and game read models.
  - Added basic REST rate limiting guard.
  - Added backend service/controller tests for guest and room API behavior.
  - Fixed backend Docker production image so workspace runtime dependencies are available from the backend container.
  - Verified Phase 3 through lint, typecheck, test, build, production audit, and Docker Compose API smoke test.
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

## Remaining

- Phase 6 gameplay engine.
- Phase 7 testing and coverage gate.
- Finalize invite-only room model.
- Finalize turn timer field and timeout behavior.
- Finalize ready status model for waiting room.
- Finalize full board tile index, tax values, utilities, stations, jail, and go-to-jail positions.
- Finalize Chance and Community Chest card deck and effects.
- Decide whether auction, spectator, trade, and host end-game behavior are in MVP scope.

## Blockers / Known Issues

- Full 80% coverage gate is pending until more product code exists.
- `npm audit` still reports dev-only vulnerabilities, while production audit (`npm audit --omit=dev`) is clean.
- Local host PostgreSQL connection using `localhost:5432` may collide with Windows/Laragon networking; Docker Compose service-to-service verification works using the backend container and `postgres` hostname.
- PRD requires invite-only rooms, but the current database/API docs do not define invite tokens or allowlists.
- PRD includes turn timer input, but the current database/API docs do not define timer persistence or realtime timeout events.
- Sitemap includes ready status, but the current database/API docs do not define ready state.
- Design/components mention trade UI, while PRD lists trading as a future feature.
- Reconnect currently uses room/player identity and Redis socket state; durable guest session token mechanics still need frontend/session hardening.
