# Implementation Plan

Project: MariTycoon  
Primary source: `docs/01. prd.md`  
Conflict rules: PRD is primary, database follows game rules, UI follows design.

## 1. Analysis

MariTycoon is a guest-first multiplayer web game. The product requires room creation, room sharing by link/code, public/private rooms with optional password, realtime Socket.IO gameplay, chat, reconnect, and core Monopoly-style mechanics.

The implementation must keep game state authoritative on the backend. The frontend may render board state and send player intent, but it must not decide dice results, movement, rent, ownership, bankruptcy, or winner detection.

The MVP must include:

- Create room.
- Join by link.
- Join by code.
- Public/private room.
- Password room.
- Realtime multiplayer.
- Chat room.
- Dice.
- Property purchase.
- Rent.
- Jail.
- Bankruptcy.
- Winner detection.

The MVP must exclude unless explicitly re-scoped:

- Login.
- Friend system.
- Ranking.
- Achievement.
- Voice chat.
- AI bot.

Trade appears in UI documents but is listed as a future feature in the PRD, so it will be treated as non-MVP unless requested later.

## 2. Architecture Direction

### Frontend

- Next.js with TypeScript.
- Tailwind for design system and responsive layout.
- Zustand for client UI state.
- Socket.IO Client for waiting room, chat, and game events.
- REST client for room creation, public lobby, and join validation.

### Backend

- NestJS.
- PostgreSQL via migrations only.
- Redis for active room state, reconnect/session state, timers, and rate limiting.
- Socket.IO gateway for realtime room/game events.
- Repository pattern for persistence.
- Domain services for game rules and state transitions.

### Deployment

- Docker Compose for local app stack.
- Containers for frontend, backend, PostgreSQL, Redis, and Nginx when needed.

## 3. Clean Architecture Layers

Backend layers:

1. Presentation
   - REST controllers.
   - Socket.IO gateways.
   - DTO validation.

2. Application
   - Use cases: create room, join room, start game, roll dice, buy property, pay rent, end turn.
   - Transaction orchestration.
   - Event publishing.

3. Domain
   - Game rules.
   - Entities/value objects.
   - Turn state machine.
   - Rent, jail, bankruptcy, winner calculations.

4. Infrastructure
   - PostgreSQL repositories.
   - Redis room state store.
   - Password hashing.
   - Rate limiting.
   - Configuration.

Frontend layers:

1. Pages/routes.
2. Feature modules.
3. Shared UI components.
4. Stores.
5. API/socket clients.
6. Types/contracts.

## 4. Phase Plan

### Phase 1 - Project Setup

Goal: establish runnable frontend, backend, Docker, and environment configuration.

Deliverables:

- Frontend Next.js TypeScript app.
- Tailwind configured with design palette.
- Backend NestJS app.
- Shared scripts for lint, typecheck, test, build.
- Docker Compose for PostgreSQL, Redis, backend, frontend.
- Environment examples.
- Baseline CI-friendly commands.

Done when:

- Lint succeeds.
- Typecheck succeeds.
- Test command succeeds.
- Frontend and backend boot locally.
- `docs/progress.md` updated.

### Phase 2 - Database

Goal: create PostgreSQL schema through migrations and seed board data.

Deliverables:

- Migration for `users_guest`.
- Migration for `rooms`.
- Migration for `room_players`.
- Migration for `properties`.
- Migration for `room_properties`.
- Migration for `game_logs`.
- Seed for 40 board positions and Indonesian property groups.
- Constraints and indexes.

Done when:

- Migration runs from empty DB.
- Seed runs repeatably.
- Database tests validate schema and seed.
- `docs/progress.md` updated.

### Phase 3 - Backend API

Goal: implement guest identity, room APIs, player APIs, and game read APIs.

Deliverables:

- Guest session endpoint or guest creation flow.
- `POST /api/rooms`.
- `GET /api/rooms/public`.
- `POST /api/rooms/join`.
- Room/player repositories.
- Password hashing for private rooms.
- Input validation.
- Rate limiting.

Done when:

- API tests cover success and failure paths.
- Password room works with hashed storage.
- Public lobby filters work.
- `docs/progress.md` updated.

### Phase 4 - Realtime

Goal: implement Socket.IO gateway and authoritative room state sync.

Deliverables:

- Socket authentication/session validation.
- `join_room`.
- `chat_message`.
- `start_game`.
- Realtime room state updates.
- Reconnect within 5 minutes.
- Server-side validation for socket actions.
- Redis state store.

Done when:

- Socket integration tests validate room isolation.
- Reconnect restores player slot.
- Chat anti-spam exists.
- `docs/progress.md` updated.

### Phase 5 - Frontend

Goal: implement user-facing pages and realtime UI.

Deliverables:

- Home page.
- Create room page.
- Join room page.
- Public lobby.
- Waiting room.
- Game screen with board, player sidebar, action panel, dice panel, chat, logs, and modals.
- Responsive desktop/mobile layouts following `design.md`.
- Zustand stores and socket lifecycle.

Done when:

- Core pages render without console errors.
- Mobile and desktop layouts are usable.
- UI follows design palette and component list.
- `docs/progress.md` updated.

### Phase 6 - Gameplay

Goal: implement complete MVP game mechanics.

Deliverables:

- Server-side dice.
- Turn engine.
- Movement and START bonus.
- Double and triple double.
- Property purchase.
- Automatic rent.
- House/hotel build rules.
- Mortgage/unmortgage/sell assets.
- Jail.
- Chance and Community Chest MVP effects.
- Bankruptcy.
- Winner detection.

Done when:

- Unit tests cover game rules.
- Socket tests prove backend validation.
- Frontend reflects all authoritative state changes.
- `docs/progress.md` updated.

### Phase 7 - Testing

Goal: reach reliable release criteria.

Deliverables:

- Unit tests.
- Integration tests.
- E2E tests.
- Minimum 80% coverage.
- Build/lint/typecheck/test all passing.
- No console errors in tested flows.
- Documentation updated.

Done when:

- Definition of Done is satisfied.
- `docs/progress.md` updated.

## 5. Requirement Decisions Before Implementation

The following items must be resolved before the affected phase starts:

| Requirement | Source | Current Status | Decision Needed |
| --- | --- | --- | --- |
| Invite-only private room | PRD | Required, not specified in DB/API docs | Implement invite token/allowlist or defer with explicit approval |
| Turn timer | PRD | Input exists, persistence/events missing | Add `turn_timer_seconds` and timeout behavior |
| Ready state | PRD/sitemap | Flow exists, DB/API missing | Add waiting room ready state |
| Auction | PRD/game rules | Mentioned, optional for MVP | MVP behavior: leave unowned when declined unless re-scoped |
| Spectator | PRD | Optional | Exclude from MVP unless requested |
| Trade UI | design/components | Future feature in PRD | Exclude from MVP implementation |
| Full board layout | design/database/game rules | Incomplete tile indexes | Define 40 tile seed before gameplay |
| Card deck | PRD/game rules | Examples only | Define MVP effects before gameplay |

## 6. Implementation Rules

- Use migrations for every schema change.
- Do not manually create tables.
- Keep backend authoritative.
- Use DTO validation for REST and socket payloads.
- Use repository pattern for persistence.
- Keep game logic in backend domain services.
- Avoid `any` unless documented with a specific reason.
- Keep constants centralized.
- Update `docs/progress.md` after every completed phase.
- Commit and push only after lint, typecheck, and tests pass.
