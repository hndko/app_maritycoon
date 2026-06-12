# Development Roadmap

Project: MariTycoon  
Source of truth: `docs/01. prd.md`

## 1. Roadmap Principles

Roadmap ini memprioritaskan MVP yang dapat dimainkan end-to-end:

1. Room dapat dibuat dan dibagikan.
2. Pemain dapat join tanpa login.
3. Waiting room realtime berjalan.
4. Game dapat dimulai.
5. Turn loop inti berjalan.
6. Properti, rent, jail, bankruptcy, dan winner detection tersedia.
7. Reconnect dan game recovery cukup kuat untuk target reliability PRD.

Fitur masa depan seperti login, ranking, achievement, voice chat, AI bot, custom map, marketplace, dan trade tidak masuk MVP kecuali scope berubah.

## 2. Phase 0 - Requirement Lock

Deliverables:

- Finalisasi board tile index 0-39.
- Finalisasi data properti, rent, house price, hotel, mortgage.
- Finalisasi nilai pajak, start bonus, jail fine.
- Finalisasi Chance dan Community Chest MVP.
- Putuskan auction masuk MVP atau tidak.
- Putuskan spectator masuk MVP atau tidak.
- Putuskan invite-only masuk MVP atau ditunda.
- Putuskan aturan disconnect saat giliran aktif.

Exit criteria:

- Data seed board lengkap.
- Event contract realtime disetujui.
- ERD final untuk MVP disetujui.

## 3. Phase 1 - Foundation

Deliverables:

- Setup monorepo/frontend/backend sesuai struktur project.
- Next.js + TypeScript + TailwindCSS.
- NestJS API + Socket.IO gateway.
- PostgreSQL connection and migrations.
- Redis connection.
- Docker local environment.
- Shared environment config.

Exit criteria:

- Frontend dan backend dapat berjalan lokal.
- Health check API tersedia.
- Redis dan PostgreSQL terkoneksi.

## 4. Phase 2 - Room and Lobby MVP

Deliverables:

- Guest identity/session.
- `POST /api/rooms`.
- `GET /api/rooms/public`.
- `POST /api/rooms/join`.
- Create room page.
- Join by code page.
- Public room list.
- Waiting room route `/room/:roomId`.
- Socket `join_room`.
- Waiting room `room_state_update`.
- Basic host controls: start game, kick player if retained in MVP.

Exit criteria:

- Host dapat membuat room.
- Player dapat join via link dan code.
- Public lobby menampilkan room aktif.
- Password room tervalidasi.
- Room max players 2-8 berjalan.

## 5. Phase 3 - Game Board and Core Turn Loop

Deliverables:

- Game board rendering 40 tiles.
- Player token positions.
- Player sidebar.
- Dice component and animation.
- Server-side `start_game`.
- Server-side `roll_dice`.
- Movement and START bonus.
- `turn_changed`.
- `end_turn`.
- Double and triple double to jail.

Exit criteria:

- Game dapat dimulai dari waiting room.
- Semua pemain melihat posisi dan giliran yang sama.
- Double extra turn dan triple double jail berjalan.

## 6. Phase 4 - Property, Rent, and Building

Deliverables:

- Seed properties and room_properties.
- Buy property flow.
- Rent calculation and automatic payment.
- Mortgaged property rent skip.
- Build house/hotel rules.
- Sell/mortgage/unmortgage if required for bankruptcy support.
- Property detail modal.
- Purchase modal.

Exit criteria:

- Player dapat membeli properti kosong.
- Player membayar rent otomatis saat mendarat di properti lawan.
- Ownership dan building state tersinkron ke semua client.
- Color-set validation untuk build berjalan.

## 7. Phase 5 - Special Tiles and Cards

Deliverables:

- Jail tile and go-to-jail tile.
- Jail fine, roll double, get-out-of-jail card.
- Chance card effects.
- Community Chest card effects.
- Tax tiles.
- Free parking.

Exit criteria:

- Semua tile non-properti MVP memiliki efek server-side.
- Card effects tercatat di game log dan tersinkron realtime.

## 8. Phase 6 - Bankruptcy and Winner

Deliverables:

- Debt detection.
- Bankruptcy modal.
- Asset liquidation flow.
- Mortgage and sell building flow.
- Bankrupt status.
- Asset transfer on bankruptcy to player creditor.
- Winner detection.
- Winner dialog and leaderboard.
- Host end game, if retained in MVP.

Exit criteria:

- Player tidak bisa lanjut jika punya kewajiban belum dibayar.
- Bankruptcy mengeluarkan player dari permainan.
- Game selesai saat tersisa 1 player aktif.

## 9. Phase 7 - Chat, Logs, Reconnect, and Reliability

Deliverables:

- Room chat.
- System messages.
- Game log UI.
- Chat anti-spam.
- Reconnect within 5 minutes.
- Redis active state.
- Periodic state snapshot or rebuild strategy.
- Action rate limiting.
- Turn timer.

Exit criteria:

- Disconnect singkat tidak mengeluarkan player.
- Player reconnect menerima state terkini.
- Game log dapat dipakai untuk konteks kejadian.
- Dice update target < 200ms pada environment wajar.

## 10. Phase 8 - Polish and Launch Readiness

Deliverables:

- Responsive desktop/mobile game screen.
- Accessibility pass.
- Sound effects and mute option.
- Loading, error, empty states.
- Input validation and friendly errors.
- Docker/Nginx deployment.
- Basic monitoring/logging.
- Smoke test multiplayer.

Exit criteria:

- Core flow lulus test di desktop dan mobile browser.
- Room creation target < 5 detik.
- Join room target < 2 detik.
- No known blocker for MVP playtest.

## 11. Suggested Test Plan

- Unit tests for game rules: dice, movement, rent, build rules, jail, bankruptcy.
- Integration tests for REST room APIs.
- Socket tests for join room, start game, roll dice, turn change.
- Reconnect test with disconnect under and over 5 minutes.
- E2E happy path: create room, join player, start, roll, buy, pay rent, finish.
- E2E mobile viewport for game screen.

## 12. Requirement Issues Before Coding

| Area | Issue | Impact |
| --- | --- | --- |
| Invite-only | Required in PRD but absent from schema/API | Cannot implement accurately without invite model |
| Turn timer | In create room input but not in schema/API | Timer behavior can diverge across client/server |
| Ready status | In sitemap but absent from API/database | Waiting room UX unclear |
| Trade | UI docs mention trade, PRD puts it in future | Risk of accidental MVP scope creep |
| Auction | PRD turn flow mentions auction, rules say optional | Need product decision before property flow |
| Spectator | Optional role lacks permissions/data model | Should be excluded or specified |
| Reconnect | Timeout required but session token unspecified | Reliability requirement at risk |
| Board data | Property groups exist, but full 40 tile layout missing | Game engine cannot be finalized |
| Cards | Example cards exist, but no complete deck/effects | Special tile implementation incomplete |
| Host end game | Host right in PRD, missing API event | Winner by asset value needs server rule |
