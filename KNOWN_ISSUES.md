# Known Issues - Closed Beta Candidate

Daftar ini harus dibaca moderator dan tester sebelum Closed Beta dimulai.

## Gameplay

- Full auction belum tersedia. Jika pemain tidak membeli properti, properti dapat tetap unowned.
- Beberapa skenario bankruptcy kompleks masih perlu divalidasi oleh tester, terutama kombinasi rent debt, sell building, mortgage, dan declare bankruptcy.
- Chance dan Community Chest adalah MVP deck, belum seluruh variasi kartu Monopoli lengkap.

## UX

- Board di layar mobile kecil mungkin terasa padat.
- Beberapa pesan game log masih menggunakan ID/player short text, belum semuanya human-friendly.
- Sound effects masih lightweight dan belum berupa asset audio final.
- Animasi/confetti/polish visual belum final.

## Realtime

- Reconnect memakai session browser saat ini. Pindah device atau browser berbeda dapat dianggap sesi baru.
- Pada koneksi mobile tidak stabil, status connected/disconnected mungkin terlambat beberapa detik.
- 8-player simultaneous refresh masih perlu pembuktian di staging.

## Testing

- Integration test PostgreSQL dan Socket.IO bersifat opt-in, tergantung `DATABASE_URL_TEST` dan `SOCKET_TEST_URL`.
- Closed Beta belum boleh dimulai sebelum staging validation 2/4/8 pemain selesai.
- Load baseline 50 client harus dijalankan sebelum mengundang tester eksternal.

## DevOps

- Restore drill staging harus diverifikasi sebelum Closed Beta.
- Alert delivery ke Slack/email belum dikunci; Prometheus rules dasar sudah tersedia.
- Closed Beta data dapat di-reset jika diperlukan untuk recovery.
