# Release Notes - MariTycoon Closed Beta Candidate

## Ringkasan

MariTycoon Closed Beta Candidate adalah versi MVP yang ditujukan untuk validasi 20-50 tester pertama. Fokus rilis ini adalah membuktikan game room multiplayer real-time dapat dimainkan dari awal sampai selesai dengan flow utama Monopoli Indonesia.

## Target Tester

- Teman/komunitas kecil berjumlah 20-50 tester.
- Tester desktop dan mobile browser.
- Tester yang bersedia melaporkan bug gameplay, realtime, UX, dan koneksi.

## Fitur Yang Bisa Dicoba

- Membuat room sebagai host.
- Join room via link atau room code.
- Public room, private password room, dan invite-only room.
- Ready status dan host controls.
- Chat realtime dengan emoji.
- Roll dice, move, buy property, rent otomatis, jail, bankruptcy, winner, dan Play Again.
- Reconnect setelah refresh atau tab tertutup sementara.

## Batasan Rilis

- Ini bukan production public launch.
- Data game closed beta dapat di-reset sewaktu-waktu.
- Full auction belum tersedia.
- Spectator belum tersedia.
- Trading, ranking, achievement, voice chat, tournament, dan AI bot belum tersedia.
- Jika room stuck atau state terlihat aneh, tester diminta membuat bug report lengkap dengan room code dan waktu kejadian.

## Kriteria Sukses Closed Beta

- Minimal 10 room berhasil dibuat.
- Minimal 5 game mencapai winner.
- Minimal 2 sesi 4 pemain berjalan tanpa blocker besar.
- Minimal 1 sesi 8 pemain melewati satu full round turn.
- Tidak ada Critical bug yang menghapus data, membuka akses private room, atau membuat backend tidak bisa dipulihkan.
- 95% tester dapat join room tanpa bantuan manual.

## Kriteria Stop / Rollback

- Backend health degraded lebih dari 5 menit.
- Redis/PostgreSQL error berulang.
- Mayoritas room stuck di turn timer.
- Invite-only/private room bisa ditembus tanpa izin.
- Bug yang membuat game tidak bisa diselesaikan pada mayoritas room.
- Restore backup gagal saat dibutuhkan.

## Link Internal

- Deployment guide: `docs/deployment-guide.md`
- Staging checklist: `docs/16. Staging-Validation-Checklist.md`
- Closed beta launch package: `docs/17. Closed-Beta-Launch-Package.md`
