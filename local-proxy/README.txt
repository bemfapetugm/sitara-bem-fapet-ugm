# SITARA Local API Proxy

Proxy ini hanya untuk pengembangan lokal. Jangan gunakan sebagai server produksi.

## Prasyarat
- Node.js 18 atau lebih baru
- Frontend SITARA dibuka melalui VS Code Live Server pada `http://127.0.0.1:5500`

## Menjalankan
1. Ekstrak folder ini.
2. Buka terminal VS Code pada folder ini.
3. Jalankan `node server.js`.
4. Buka `http://127.0.0.1:3000/health`. Hasil yang diharapkan: JSON dengan `success: true`.
5. Di file JavaScript login frontend, ubah URL API dari URL Apps Script langsung menjadi:
   `http://127.0.0.1:3000/api/exec`
6. Pertahankan struktur payload yang saat ini dikirim frontend (misalnya `action: "login"` atau format yang memang digunakan proyek). Jangan ubah nama field tanpa memeriksa kode frontend.
7. Muat ulang halaman login dan coba lagi. Biarkan terminal proxy tetap berjalan.

## Catatan
- Proxy meneruskan body JSON apa adanya ke URL Apps Script yang dikonfigurasi.
- CORS dibatasi ke `http://127.0.0.1:5500`.
- Jika Live Server berjalan di port atau host berbeda, sesuaikan `ALLOWED_ORIGIN`.
- Jangan memasukkan kata sandi atau token ke log.
- Jika respons upstream bukan JSON, periksa tab Network/Response dan log terminal.
