# Task Breakdown

Project: MariTycoon  
Order source: user-defined implementation order.

## Task 0 - Planning Gate

### Analysis

Before writing code, the project needs implementation planning based on the seven required documents. This task produces planning artifacts only.

### Files to Create

- `docs/Implementation-Plan.md`
- `docs/Task-Breakdown.md`
- `docs/Dependency-Map.md`

### Files to Change

- `docs/progress.md`

### Implementation

- Read all mandatory docs.
- Identify MVP scope and exclusions.
- Define phase plan.
- Define task sequence and dependencies.

### Testing

- No code test required for this task.
- Verify repository state and documentation files.

### Progress Update

- Mark planning as completed.
- Keep coding phases pending.

## Task 1 - Phase 1 Project Setup

### Analysis

Set up the project structure and tooling. This phase must create a reliable base for future backend, frontend, database, and testing work.

### Files to Create

- Frontend app files under `frontend`.
- Backend app files under `backend`.
- Docker files under project root and/or `docker`.
- Environment example files.
- Root package/workspace configuration if selected.

### Files to Change

- `docs/progress.md`
- Existing `.gitignore` or config files if present.

### Implementation

- Initialize Next.js + TypeScript frontend.
- Configure Tailwind.
- Initialize NestJS backend.
- Add lint/typecheck/test/build scripts.
- Configure Docker Compose for PostgreSQL and Redis.
- Add environment loading and examples.

### Testing

- Run lint.
- Run typecheck.
- Run tests.
- Run builds where available.

### Progress Update

- Completed: project setup.
- Remaining: database and application phases.
- Blockers: any tooling or environment issue.

## Task 2 - Phase 2 Database

### Analysis

Database must follow `docs/05. database.md` and game rules. All schema changes must be migration-based.

### Files to Create

- Migration files.
- Seed files.
- Repository interfaces and database module setup if not already present.
- Database tests.

### Files to Change

- Backend database configuration.
- `docs/progress.md`

### Implementation

- Create enums and tables.
- Add constraints and indexes.
- Seed 40 board tiles and Indonesian properties.
- Add repeatable seed strategy.

### Testing

- Migration from empty database.
- Seed idempotency.
- Schema/repository tests.

### Progress Update

- Completed: database schema/migrations/seed.
- Remaining: APIs, realtime, frontend, gameplay, tests.
- Blockers: unresolved board/card data if any.

## Task 3 - Phase 3 Backend API

### Analysis

REST APIs handle non-game room flow and guest participation. All inputs require validation and rate limiting.

### Files to Create

- Guest module.
- Room module.
- Player module.
- Game read module.
- DTOs.
- Repositories.
- API tests.

### Files to Change

- Backend app module.
- Backend config.
- `docs/progress.md`

### Implementation

- Implement guest creation/session.
- Implement create room.
- Implement public lobby.
- Implement join room.
- Implement password hashing and validation.
- Implement room/player query APIs needed by frontend.

### Testing

- Unit tests for services.
- Integration tests for REST endpoints.
- Validation and rate-limit tests.

### Progress Update

- Completed: backend APIs.
- Remaining: realtime, frontend, gameplay, full test pass.
- Blockers: unresolved invite-only or ready-status decisions.

## Task 4 - Phase 4 Realtime

### Analysis

Socket.IO powers waiting room, chat, game events, and reconnect. Server must validate all events.

### Files to Create

- Socket gateway.
- Socket DTOs.
- Redis state store.
- Reconnect service.
- Chat service.
- Socket integration tests.

### Files to Change

- Backend modules.
- `docs/progress.md`

### Implementation

- Implement socket connection validation.
- Implement `join_room`.
- Implement `chat_message`.
- Implement `start_game`.
- Implement room state broadcasts.
- Implement reconnect timeout.
- Implement rate limits and anti-spam.

### Testing

- Socket event tests.
- Room isolation tests.
- Reconnect tests.
- Chat anti-spam tests.

### Progress Update

- Completed: realtime base.
- Remaining: frontend and gameplay details.
- Blockers: timer behavior if unresolved.

## Task 5 - Phase 5 Frontend

### Analysis

Frontend must follow `design.md`, sitemap, and component docs. It renders state but does not decide game outcomes.

### Files to Create

- Pages/routes.
- UI components.
- Game components.
- Zustand stores.
- API/socket clients.
- Frontend tests.

### Files to Change

- Tailwind config.
- Frontend app shell/layout.
- `docs/progress.md`

### Implementation

- Build home, create room, join, public lobby, waiting room, and game screen.
- Connect REST APIs.
- Connect Socket.IO events.
- Implement responsive layout.
- Implement modals and action panel.

### Testing

- Component tests.
- Page rendering tests.
- Browser smoke tests.
- No console errors in core flows.

### Progress Update

- Completed: frontend MVP shell.
- Remaining: full gameplay and E2E testing.
- Blockers: visual or realtime integration issues.

## Task 6 - Phase 6 Gameplay

### Analysis

Gameplay is backend authoritative. Client actions are intents, and backend emits final outcomes.

### Files to Create

- Game domain services.
- Turn engine.
- Dice service.
- Property service.
- Rent service.
- Jail service.
- Bankruptcy service.
- Winner service.
- Gameplay tests.

### Files to Change

- Socket gateway.
- Redis state store.
- Frontend action panel and modals as needed.
- `docs/progress.md`

### Implementation

- Implement dice and movement.
- Implement turn flow.
- Implement property purchase.
- Implement rent.
- Implement build/mortgage/sell/unmortgage.
- Implement jail.
- Implement card effects.
- Implement bankruptcy.
- Implement winner detection.

### Testing

- Unit tests for all game rules.
- Socket tests for authoritative validation.
- Integration flow tests.

### Progress Update

- Completed: MVP gameplay.
- Remaining: coverage, E2E, launch readiness.
- Blockers: missing final card/board data if any.

## Task 7 - Phase 7 Testing

### Analysis

Release requires passing build, lint, typecheck, tests, and at least 80% coverage.

### Files to Create

- Unit test suites.
- Integration test suites.
- E2E test suites.
- Coverage configuration.

### Files to Change

- Test configuration.
- CI scripts if needed.
- `docs/progress.md`

### Implementation

- Expand tests across backend/frontend.
- Add E2E happy paths.
- Add reconnect and multiplayer scenarios.
- Fix defects found by tests.

### Testing

- Lint.
- Typecheck.
- Unit tests.
- Integration tests.
- E2E tests.
- Coverage report.
- Build.

### Progress Update

- Completed: testing and quality gate.
- Remaining: deployment hardening if requested.
- Blockers: failing checks or uncovered critical flows.
