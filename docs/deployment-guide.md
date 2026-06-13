# MariTycoon Deployment Guide

Panduan ini menyiapkan MariTycoon di VPS Ubuntu 24.04 dengan Docker, Docker Compose, PostgreSQL, Redis, Nginx, TLS, backup, restore, update version, dan rollback.

## Kebutuhan VPS

- Ubuntu 24.04 LTS.
- 2 vCPU minimum, 4 vCPU direkomendasikan.
- RAM 4 GB minimum, 8 GB direkomendasikan untuk playtest publik.
- Disk 40 GB minimum dengan ruang tambahan untuk backup PostgreSQL.
- Domain yang sudah mengarah ke IP VPS.
- Port terbuka: `22`, `80`, `443`.

## Install Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl git openssl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Logout lalu login kembali agar group `docker` aktif.

## Install Docker Compose

Docker Compose sudah terpasang sebagai plugin melalui paket `docker-compose-plugin`.

Verifikasi:

```bash
docker compose version
```

## Setup Environment

Clone repository:

```bash
git clone https://github.com/hndko/app_maritycoon.git
cd app_maritycoon
```

Buat environment production:

```bash
cp .env.production.example .env.production
```

Edit `.env.production`:

```bash
nano .env.production
```

Wajib diganti:

- `PUBLIC_APP_URL`
- `PUBLIC_API_URL`
- `PUBLIC_SOCKET_URL`
- `CORS_ORIGIN`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `REDIS_PASSWORD`
- `REDIS_URL`
- `SESSION_TOKEN_SECRET`

Buat secret kuat:

```bash
openssl rand -hex 32
```

## SSL Setup

Deployment Compose memakai sertifikat di:

```text
docker/nginx/certs/fullchain.pem
docker/nginx/certs/privkey.pem
```

Untuk sertifikat awal, gunakan Certbot standalone sebelum Nginx container berjalan:

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d your-domain.com
mkdir -p docker/nginx/certs
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/certs/privkey.pem
sudo chown -R "$USER":"$USER" docker/nginx/certs
```

Renew manual:

```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/certs/privkey.pem
docker compose --env-file .env.production -f docker-compose.production.yml restart nginx
```

## Deploy Command

Target deployment satu command:

```bash
./deploy.sh
```

Jika permission belum executable:

```bash
chmod +x deploy.sh backup.sh restore.sh
./deploy.sh
```

Command tersebut akan:

- build image frontend dan backend;
- start PostgreSQL, Redis, backend, frontend, Nginx, dan Prometheus;
- menjalankan migration;
- menjalankan seed board;
- menampilkan status service.

Verifikasi:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl -I https://your-domain.com
curl https://your-domain.com/api/health
```

## Backup

Backup PostgreSQL:

```bash
./backup.sh
```

File backup tersimpan di:

```text
backups/maritycoon-YYYYMMDDTHHMMSSZ.dump
```

Rekomendasi cron harian:

```bash
crontab -e
```

```cron
0 2 * * * cd /home/ubuntu/app_maritycoon && ./backup.sh >> backups/backup.log 2>&1
```

## Restore

Restore dari file backup:

```bash
./restore.sh backups/maritycoon-YYYYMMDDTHHMMSSZ.dump
```

Setelah restore:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml restart backend frontend nginx
curl https://your-domain.com/api/health
```

## Update Version

Update ke versi terbaru dari branch `main`:

```bash
git pull origin main
./backup.sh
./deploy.sh
```

Urutan ini membuat backup sebelum container baru dan migration dijalankan.

## Rollback

Rollback cepat ke commit sebelumnya:

```bash
git log --oneline -5
git checkout <previous_commit>
./deploy.sh
```

Jika rollback juga butuh data lama:

```bash
./restore.sh backups/<backup-before-update>.dump
```

Kembali ke `main` setelah incident selesai:

```bash
git checkout main
git pull origin main
```

## Remove Deployment

Hapus deployment Docker tanpa menghapus data persisten:

```bash
./remove-deploy.sh
```

Script ini tetap dapat berjalan walaupun `.env.production` belum ada, karena remove operation memakai fallback env sementara hanya untuk memenuhi interpolasi Docker Compose.

Hapus deployment beserta local images hasil build Compose:

```bash
./remove-deploy.sh --rmi-local
```

Hapus deployment beserta volume PostgreSQL, Redis, dan Prometheus:

```bash
./remove-deploy.sh --volumes
```

Hapus seluruh deployment Docker, termasuk containers, networks, volumes, dan semua images yang dipakai Compose services:

```bash
./remove-deploy.sh --all
```

Mode `--volumes` akan meminta konfirmasi `DELETE`; mode `--all` akan meminta konfirmasi `DELETE ALL` karena data database dan image Docker akan dihapus. Perintah ini tidak menghapus file repo, `.env.production`, folder `backups/`, atau file sertifikat TLS. Buat backup terlebih dahulu:

```bash
./backup.sh
```

## Operasional Penting

- Jangan expose PostgreSQL atau Redis ke internet.
- Jangan memakai password contoh dari `.env.production.example`.
- Simpan backup di lokasi eksternal secara berkala.
- Pantau `/api/health` dan `/api/metrics`.
- Prometheus internal sudah membaca metrics backend melalui `docker/prometheus/prometheus.yml`.
