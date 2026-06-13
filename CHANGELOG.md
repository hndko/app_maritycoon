# Changelog

Semua perubahan penting MariTycoon dicatat di file ini. Format mengikuti pendekatan sederhana berbasis release milestone.

## Closed Beta Candidate - 2026-06-13

### Added

- MVP gameplay end-to-end untuk MariTycoon multiplayer:
  - Create room.
  - Join via link dan room code.
  - Public/private/password/invite-only room.
  - Waiting room, ready status, dan host controls.
  - Realtime chat dengan emoji dan system message.
  - Game board 40 tile bertema kota Indonesia.
  - Dice, movement, property purchase, rent, jail, bankruptcy, winner detection, dan Play Again.
- Server-authoritative realtime gameplay melalui Socket.IO.
- Redis-backed active game state, reconnect state, turn timer, state versioning, action rate limiting, dan Socket.IO adapter.
- PostgreSQL schema migration dan seed board.
- Frontend Next.js UI untuk Home, Create Room, Join Room, Room/Lobby, dan Game Board.
- Production deployment package:
  - `docker-compose.production.yml`
  - `nginx.conf`
  - `.env.production.example`
  - `deploy.sh`
  - `backup.sh`
  - `restore.sh`
  - `docs/deployment-guide.md`
- Observability dasar:
  - `/api/health`
  - `/api/metrics`
  - Prometheus scrape config dan alert rules dasar.
- QA readiness:
  - `docs/16. Staging-Validation-Checklist.md`
  - Closed Beta release package documents.

### Changed

- REST rate limiting dipindahkan ke Redis saat tersedia agar cocok untuk multi-instance.
- Health check backend mengembalikan HTTP 503 jika PostgreSQL atau Redis degraded.
- Docker runtime frontend/backend berjalan sebagai non-root user.
- Environment validation production diperketat untuk HTTPS origin, Redis auth, password database non-default, strong session secret, dan `TRUST_PROXY=true`.

### Fixed

- Room share URL by room code.
- Invite-only room enforcement.
- Server-side turn timer dan stuck-room prevention.
- Reconnect handling dan current-player disconnect handling.
- Socket event contract alignment untuk `player_joined`, `player_left`, dan `property_sold`.
- Frontend actions untuk sell property dan unmortgage.
- Winner dialog dan Play Again flow.

### Known Gaps

- Full auction flow belum masuk MVP; properti yang tidak dibeli dapat tetap unowned.
- Spectator, ranking, achievement, trading, voice chat, AI bot, dan tournament tidak termasuk Closed Beta MVP.
- Closed Beta harus tetap menunggu staging validation 2/4/8 pemain, restore drill, dan load baseline 50 client sebelum tester eksternal diundang.
