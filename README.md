# MariTycoon

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Production%20DB-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Realtime%20State-DC382D?logo=redis&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Multiplayer-010101?logo=socketdotio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)

**MariTycoon** adalah aplikasi web multiplayer real-time bertema Monopoli Indonesia. Pemain dapat membuat room, membagikan link atau kode room, bermain sebagai guest tanpa login, chat di room, dan memainkan alur inti Monopoli dengan state authoritative di backend.

> GitHub short description: **Multiplayer Monopoli Indonesia real-time berbasis Next.js, NestJS, Socket.IO, PostgreSQL, Redis, dan Docker.**

## Portfolio Snapshot

| Area | Implementasi |
| --- | --- |
| Product | Web game multiplayer room-based untuk browser desktop dan mobile |
| Frontend | Next.js, TypeScript, TailwindCSS, Zustand, Socket.IO Client |
| Backend | NestJS, Socket.IO Gateway, repository pattern, validation, rate limit |
| Database | PostgreSQL dengan migration dan seed board 40 tile |
| Realtime | Redis active state, Redis Socket.IO adapter, reconnect, distributed turn timer |
| Reliability | Health check PostgreSQL/Redis, metrics endpoint, restart timer recovery, session token hardening |
| Testing | Unit test, integration test opt-in, multiplayer smoke script, load-test script |
| Deployment | Docker Compose local/prod, Nginx reverse proxy, Docker healthcheck |

## Fitur Utama

- Create room dengan nama room, max player, visibility, password, starting money, dan turn timer.
- Join room lewat share URL atau room code.
- Public room, private room password, dan invite-only room.
- Public lobby dengan filter status, max player, dan kapasitas room.
- Waiting room real-time dengan ready status dan host controls.
- Chat room real-time dengan emoji, system message, dan anti-spam.
- Gameplay server-authoritative: dice, movement, property purchase, rent, jail, bankruptcy, winner detection.
- Property detail modal, purchase prompt, sell property, mortgage, unmortgage, dan sell building.
- Winner dialog dengan Play Again flow untuk host.
- Sound effects ringan dengan mute option.
- Chance dan Community Chest MVP deck.
- Reconnect handling dan state sync lewat Redis.
- Production hardening untuk Socket.IO multi-instance, distributed timer, recovery, dan observability dasar.

## Arsitektur Singkat

```mermaid
flowchart LR
  Browser["Browser / Next.js"] -->|REST API| API["NestJS API"]
  Browser -->|Socket.IO| Gateway["NestJS Socket Gateway"]
  API --> Postgres["PostgreSQL"]
  Gateway --> Redis["Redis Active State"]
  Gateway --> Postgres
  Redis --> Adapter["Redis Socket.IO Adapter"]
  Adapter --> Gateway
```

Prinsip utama project:

- Backend adalah sumber kebenaran untuk semua state game.
- Frontend hanya mengirim intent dan merender state dari server.
- PostgreSQL menyimpan data persisten dan game logs.
- Redis menyimpan state aktif, reconnect window, rate limit, dan turn timer.
- Semua perubahan schema wajib melalui migration.

## Struktur Project

```text
app_maritycoon/
  frontend/          Next.js app, Tailwind, Zustand, Socket.IO client
  backend/           NestJS API, Socket.IO gateway, game services
  backend/database/  SQL migrations
  backend/scripts/   Migration, seed, smoke, dan load-test scripts
  docker/            Dockerfile frontend/backend
  docs/              PRD, design, roadmap, architecture, progress
```

## Menjalankan Project

### 1. Install dependency

```bash
npm install
```

### 2. Siapkan environment

Salin contoh environment sesuai kebutuhan lokal:

```bash
copy .env.example .env
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Untuk production, pastikan `SESSION_TOKEN_SECRET` kuat minimal 32 karakter dan semua URL environment eksplisit.
Production juga wajib memakai HTTPS origin, `TRUST_PROXY=true`, Redis password, dan database password non-default.

### 3. Jalankan dependency service

```bash
docker compose up -d postgres redis
```

### 4. Jalankan migration dan seed

```bash
npm run db:migrate -w backend
npm run db:seed -w backend
```

### 5. Jalankan development server

```bash
npm run dev
```

Default URL:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`
- Health check: `http://localhost:4000/api/health`
- Metrics: `http://localhost:4000/api/metrics`

## Production Operations

Production Compose tersedia di `docker-compose.prod.yml` dan package deployment VPS tersedia lewat `docker-compose.production.yml`.

Deployment package siap pakai berisi `docker-compose.production.yml`, `nginx.conf`, `.env.production.example`, `deploy.sh`, `backup.sh`, `restore.sh`, dan `docs/deployment-guide.md`.

- Nginx reverse proxy untuk HTTPS, WebSocket upgrade, dan security headers.
- Internal network untuk PostgreSQL dan Redis agar tidak terekspos langsung.
- Redis password dan append-only persistence.
- Backend/frontend container health checks.
- JSON logging melalui `LOG_FORMAT=json`.
- Prometheus scrape config dan alert rules dasar untuk backend metrics.

Sebelum deploy production, siapkan certificate:

```text
docker/nginx/certs/fullchain.pem
docker/nginx/certs/privkey.pem
```

Contoh build image lokal:

```bash
docker build -f backend/Dockerfile -t maritycoon-backend:local .
docker build -f frontend/Dockerfile -t maritycoon-frontend:local .
```

Backup dan restore PostgreSQL:

```bash
DATABASE_URL=postgresql://user:password@host:5432/db scripts/backup-postgres.sh
DATABASE_URL=postgresql://user:password@host:5432/db scripts/restore-postgres.sh backups/file.dump
```

Rollback helper:

```bash
scripts/rollback-deploy.sh previous-image-tag
```

One-command deployment di VPS setelah environment dan SSL siap:

```bash
./deploy.sh
```

Remove deployment tanpa menghapus volume database:

```bash
./remove-deploy.sh
```

## Quality Gates

Perintah wajib sebelum commit:

```bash
npm run lint
npm run typecheck
npm run test
```

Perintah tambahan untuk release/hardening:

```bash
npm run build
npm run test:integration:postgres
npm run test:integration:socket
npm run test:e2e:multiplayer
npm run test:load
```

Catatan:

- `test:integration:postgres` membutuhkan `DATABASE_URL_TEST`.
- `test:integration:socket` membutuhkan `SOCKET_TEST_URL`.
- `test:e2e:multiplayer` membutuhkan backend dan database berjalan.
- `test:load` menggunakan `LOAD_BACKEND_URL`, `LOAD_CLIENTS`, dan `LOAD_TIMEOUT_MS`.

## Dokumentasi Utama

- [PRD](docs/01.%20prd.md)
- [Design](docs/02.%20design.md)
- [Sitemap](docs/03.%20sitemap.md)
- [Components](docs/04.%20components.md)
- [Database](docs/05.%20database.md)
- [API Spec](docs/06.%20api-spec.md)
- [Game Rules](docs/07.%20game-rules.md)
- [Architecture](docs/08.%20Architecture.md)
- [Progress](docs/progress.md)
- [Deployment Guide](docs/deployment-guide.md)

## Status Project

Status terakhir: **Playtest Ready dengan production hardening awal**.

Fokus yang sudah dikerjakan:

- MVP gameplay end-to-end.
- Waiting room dan host controls.
- Reconnect dan session validation.
- Redis Socket.IO adapter.
- Distributed turn timer.
- Restart timer recovery.
- Health checks untuk PostgreSQL dan Redis.
- Production Docker Compose, Nginx reverse proxy, JSON logging, metrics endpoint, backup/restore helper, dan Docker health checks.
- GitHub Actions quality gate untuk lint, typecheck, test, build, Compose validation, dan Docker image build.

Area yang masih perlu keputusan/lanjutan:

- Auction penuh ketika player menolak beli properti.
- Spectator, jika nanti masuk scope.
- Trade tetap non-MVP sampai di-scope ulang.
- Validasi integration/E2E terhadap environment staging/live.
- Validasi certificate, backup restore drill, dan load test di staging/live sebelum public production launch.

## Maintenance Note

README ini adalah bagian dari dokumentasi hidup project. Setiap perubahan besar pada fitur, arsitektur, command, dependency, environment, deployment, atau status readiness harus ikut memperbarui:

- `README.md`
- `AGENTS.md`
- `docs/progress.md`
- Dokumen bernomor di `docs/` bila requirement ikut berubah
