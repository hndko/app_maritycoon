# AGENTS.md

Panduan kerja untuk agen AI dan kontributor otomatis di project **MariTycoon**.

## Identitas Project

MariTycoon adalah web game multiplayer real-time bertema Monopoli Indonesia.

Stack utama:

- Frontend: Next.js, TypeScript, TailwindCSS, Zustand, Socket.IO Client
- Backend: NestJS, TypeScript, Socket.IO, PostgreSQL, Redis
- Deployment: Docker Compose
- Testing: Vitest, integration smoke scripts, load-test script

## Sumber Kebenaran Requirement

Sebelum mengubah kode, baca dokumen yang relevan di `docs/`.

Prioritas jika ada konflik:

1. `docs/01. prd.md`
2. `docs/07. game-rules.md`
3. `docs/05. database.md`
4. `docs/02. design.md`
5. Dokumen architecture/roadmap/progress lain

Dokumen wajib untuk task besar:

- `docs/01. prd.md`
- `docs/02. design.md`
- `docs/03. sitemap.md`
- `docs/04. components.md`
- `docs/05. database.md`
- `docs/06. api-spec.md`
- `docs/07. game-rules.md`
- `docs/progress.md`

## Prinsip Implementasi

- Backend adalah authoritative source untuk semua state game.
- Frontend tidak boleh menentukan dice, movement, rent, ownership, bankruptcy, winner, atau turn result.
- Semua Socket.IO action harus divalidasi backend.
- Semua perubahan database wajib lewat migration.
- Gunakan Redis untuk active state, reconnect, timer, rate limit, dan socket scaling.
- Jangan menambah fitur gameplay baru saat task hanya hardening, dokumentasi, audit, atau bugfix.
- Hindari refactor besar kecuali diminta atau benar-benar diperlukan untuk menyelesaikan bug.
- Ikuti pola existing module, service, repository, DTO, dan test.

## Branch dan Git Workflow

Gunakan hanya branch:

```text
main
```

Tidak membuat feature branch kecuali diminta eksplisit.

Sebelum commit, jalankan:

```bash
npm run lint
npm run typecheck
npm run test
```

Commit format:

```text
feat(scope): description
fix(scope): description
docs(scope): description
```

Setelah commit berhasil:

```bash
git push origin main
```

Jangan commit jika lint, typecheck, atau test gagal.

## Progress dan Dokumentasi

Setiap task besar, phase, hardening, bugfix penting, atau perubahan dokumentasi utama harus update:

- `docs/progress.md`
- `README.md` jika command, status, fitur, stack, deployment, atau testing berubah
- `AGENTS.md` jika workflow atau aturan agen berubah
- `.gitignore` jika muncul artifact/cache/output baru

Dokumen di `docs/` memakai penomoran otomatis. Jika menambah dokumen long-lived baru, lanjutkan nomor terakhir.

## Command Penting

Install:

```bash
npm install
```

Development:

```bash
npm run dev
```

Database:

```bash
npm run db:migrate -w backend
npm run db:seed -w backend
```

Quality gate:

```bash
npm run lint
npm run typecheck
npm run test
```

Production/hardening checks:

```bash
npm run build
npm run test:integration:postgres
npm run test:integration:socket
npm run test:e2e:multiplayer
npm run test:load
docker build -f backend/Dockerfile -t maritycoon-backend:local .
docker build -f frontend/Dockerfile -t maritycoon-frontend:local .
```

## Testing Notes

- Unit test harus tetap deterministic dan tidak bergantung service eksternal.
- PostgreSQL integration test hanya aktif jika `DATABASE_URL_TEST` tersedia.
- Socket.IO integration test hanya aktif jika `SOCKET_TEST_URL` tersedia.
- E2E multiplayer smoke membutuhkan backend, PostgreSQL, dan Redis berjalan.
- Load test membutuhkan backend berjalan dan dapat dikonfigurasi melalui `LOAD_BACKEND_URL`, `LOAD_CLIENTS`, dan `LOAD_TIMEOUT_MS`.

## Security dan Reliability

Wajib dijaga:

- Room password harus di-hash.
- Session token harus signed.
- `SESSION_TOKEN_SECRET` production minimal 32 karakter.
- Socket action harus rate-limited.
- Reconnect slot dipertahankan sesuai requirement.
- Turn timer harus server-side dan aman untuk multi-instance.
- Health check harus memantau PostgreSQL dan Redis.
- Production harus memakai HTTPS public origin, `TRUST_PROXY=true`, Redis password, database password non-default, dan `LOG_FORMAT=json`.
- PostgreSQL/Redis tidak boleh diekspos langsung ke internet pada konfigurasi production.
- Jalankan backup sebelum migration/deployment berisiko dan verifikasi restore secara berkala.
- CI harus menjaga lint, typecheck, test, build, production Compose validation, dan Docker image build tetap hijau.
- Monitoring production minimal harus scrape `/api/metrics` dan punya alert untuk backend down.
- Deployment package utama untuk VPS adalah `docker-compose.production.yml`, `.env.production.example`, `nginx.conf`, `deploy.sh`, `backup.sh`, `restore.sh`, `remove-deploy.sh`, dan `docs/deployment-guide.md`.

## Area yang Tidak Boleh Dikerjakan Tanpa Scope Baru

- Login Google
- Friend system
- Ranking
- Achievement
- Voice chat
- AI bot
- Trading system
- Spectator penuh
- Auction penuh jika belum diputuskan masuk MVP

## Checklist Sebelum Final Response

- Baca requirement yang relevan.
- Jelaskan analisis untuk perubahan besar.
- Edit file dengan scope kecil.
- Jalankan lint, typecheck, test.
- Update `docs/progress.md` jika task selesai.
- Commit dan push bila workflow task memintanya atau task selesai sesuai aturan project.
- Laporkan commit, branch, pushed status, files changed, dan progress.
