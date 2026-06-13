# Testing Guide - MariTycoon Closed Beta

Panduan ini digunakan QA, moderator, dan tester internal saat menjalankan Closed Beta.

## Sebelum Sesi Test

1. Pastikan staging URL memakai HTTPS.
2. Pastikan `GET /api/health` mengembalikan `ok`.
3. Pastikan backend log tidak menunjukkan startup error.
4. Jalankan backup awal dengan `./backup.sh`.
5. Catat commit/version yang sedang diuji.
6. Siapkan minimal 2 browser berbeda atau incognito profile berbeda.

## Skenario Minimum

### 2 Pemain

- Host create room max player 2.
- Player join via room code.
- Player join via share URL.
- Host start game setelah player ready.
- Kedua player roll dice minimal 3 turn.
- Beli minimal 1 properti.
- Trigger minimal 1 rent.
- Uji reconnect dengan refresh salah satu browser.
- Selesaikan sampai winner jika memungkinkan.
- Host klik Play Again.

### 4 Pemain

- Host create room max player 4.
- Tiga player join.
- Semua non-host ready.
- Jalankan minimal 1 full round turn.
- Uji disconnect 1 player saat bukan giliran.
- Uji turn timer habis pada 1 giliran.
- Beli minimal 2 properti oleh player berbeda.
- Trigger rent dan jail jika memungkinkan.

### 8 Pemain

- Host create room max player 8.
- Tujuh player join berdekatan waktunya.
- Semua ready dan host start game.
- Jalankan minimal 1 full round turn.
- Refresh 2-3 player hampir bersamaan.
- Pastikan state tetap konsisten di semua client.

## Area Yang Harus Diamati

- Room code/share URL.
- Invite-only validation.
- Ready status.
- Host controls.
- Dice result.
- Current turn indicator.
- Property ownership.
- Rent log dan saldo.
- Jail actions.
- Bankruptcy action.
- Winner dialog.
- Play Again reset.
- Chat realtime.
- Browser console.
- Backend logs.

## Evidence Wajib

- Screenshot room waiting state.
- Screenshot game board.
- Screenshot property purchase.
- Screenshot rent event/game log.
- Screenshot reconnect berhasil.
- Screenshot winner dialog.
- Screenshot Play Again.
- Catatan room code dan waktu kejadian untuk bug.

## Cara Menandai Hasil

Gunakan status:

- `PASS`: sesuai expected result.
- `FAIL`: tidak sesuai expected result.
- `BLOCKED`: tidak bisa diuji karena blocker lain.
- `N/A`: tidak relevan untuk sesi itu.

Checklist utama tersedia di `docs/16. Staging-Validation-Checklist.md`.
