# Progress

## Completed

- Read all existing documents in `docs`.
- Created architecture planning document aligned with PRD.
- Created ERD document aligned with database and PRD requirements.
- Created realtime flow document for Socket.IO room and gameplay events.
- Created game state design document for Redis, PostgreSQL, and authoritative server state.
- Created development roadmap document with MVP phases and requirement gates.

## In Progress

- Requirement review before implementation.
- Git workflow alignment on `main` branch.

## Pending

- Finalize invite-only room model.
- Finalize turn timer field and timeout behavior.
- Finalize ready status model for waiting room.
- Finalize full board tile index, tax values, utilities, stations, jail, and go-to-jail positions.
- Finalize Chance and Community Chest card deck and effects.
- Decide whether auction, spectator, trade, and host end-game behavior are in MVP scope.
- Add project scripts for lint, typecheck, and test once frontend/backend scaffolding exists.

## Known Issues

- Repository currently has no executable lint/typecheck/test scripts because no project package or test configuration exists yet.
- PRD requires invite-only rooms, but the current database/API docs do not define invite tokens or allowlists.
- PRD includes turn timer input, but the current database/API docs do not define timer persistence or realtime timeout events.
- Sitemap includes ready status, but the current database/API docs do not define ready state.
- Design/components mention trade UI, while PRD lists trading as a future feature.
- Reconnect timeout is required, but guest session token mechanics are not yet specified.
