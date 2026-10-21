# ForecastStock

Aplikasi web prediksi penjualan dan perencanaan stok dengan metode **Trend Moment** untuk toko dan warung dengan berbagai jenis usaha.

Proyek semester 1, Fast Track Ilmu Komputer, Universitas Cakrawala.

## Fitur

- Daftar akun toko dengan jenis usaha (warung, toko bangunan, apotek, dll.); kategori awal dan saran satuan menyesuaikan
- Data produk, kategori, dan penjualan per tanggal yang bisa dicatat kapan saja (input manual atau impor CSV)
- Stok berkurang otomatis saat penjualan dicatat; barang masuk, barang rusak, stok opname, dan riwayat stok per produk
- Peringatan stok menipis di Dashboard
- Prediksi penjualan minggu depan per produk dari penjualan yang dijumlah per minggu: tren (Y = a + bX) dikali indeks musim
- Akurasi prediksi per produk: MAPE dari uji mundur 8 minggu terakhir
- Grafik penjualan, garis tren, dan prediksi, beserta rincian hitungannya
- Target stok, jumlah restock, dan status stok (perlu restock, aman, berlebih)
- Skenario penyesuaian manual untuk kondisi di luar pola biasa, untuk semua produk atau satu kategori
- Bukan aplikasi kasir: tidak ada harga, nota, atau laporan keuangan
- Akun demo berisi data simulasi 11 produk yang mencakup semua kondisi stok, bisa di-reset dari banner akun demo

Dokumen SDLC (SRS, UML, ADR, test plan, panduan pengguna) disimpan terpisah dan dilampirkan di laporan proyek.

## Struktur

| Folder | Isi | Teknologi |
|---|---|---|
| `backend/` | REST API | Laravel 13, PHP 8.3, MySQL, Sanctum, PHPUnit |
| `frontend/` | Antarmuka web (SPA) | React, Vite, Tailwind CSS, Zustand, TanStack Query, React Router, Recharts |
| `scripts/forecast/` | Script Trend Moment untuk verifikasi (tidak di-hosting) | Python 3.13, PyTest |

## Kebutuhan

- PHP 8.3+ dan Composer, MySQL 8 (misalnya lewat Laragon)
- Node.js LTS
- Python 3.13 (untuk script verifikasi)

## Menjalankan di lokal

1. **Database**: nyalakan MySQL, lalu buat database `forecaststock`.
2. **Backend**:
   ```powershell
   cd backend
   composer install
   copy .env.example .env
   php artisan key:generate
   php artisan migrate --seed      # --seed membuat akun demo + data simulasi
   php artisan serve               # http://127.0.0.1:8000
   ```
3. **Frontend** (terminal lain):
   ```powershell
   cd frontend
   npm install
   npm run dev                     # http://localhost:5173
   ```
4. Masuk dengan akun demo: `demo@forecaststock.test` / `demo12345`.

Kalau tampilan berantakan atau data tidak muncul (API 404), cek apakah ada server lama yang masih jalan di port 5173 atau 8000. Matikan semuanya, jalankan ulang backend dan frontend, lalu refresh browser dengan Ctrl+Shift+R.

## Pengujian

```powershell
cd backend; php artisan test                              # 85 test
cd scripts/forecast; .venv\Scripts\python -m pytest -v    # 23 test
cd frontend; npx oxlint src; npm run build
```

Ketiganya juga dijalankan otomatis oleh GitHub Actions setiap ada push ke `dev` atau `main`.

Salah satu test memastikan hasil prediksi aplikasi (PHP) sama dengan hasil script Python untuk data yang sama.
