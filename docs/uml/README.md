# Perancangan Sistem — ForecastStock

File `.drawio` adalah sumber (buka dan ubah dengan draw.io). File `.png` adalah hasil ekspor untuk laporan dan presentasi. Kalau diagram diubah, ekspor ulang PNG-nya (draw.io → File → Export as → PNG, zoom 200%).

| Diagram | Sumber | Gambar | Notasi |
|---|---|---|---|
| Use case | `use-case.drawio` | `use-case.png` | UML (aktor, batas sistem, «include», «extend») |
| ERD | `erd.drawio` | `erd.png` | Crow's foot |
| Sitemap (peta halaman) | `sitemap.drawio` | `sitemap.png` | Diagram hierarki halaman + route |

## 1. Use case

Aktor: **Pemilik Toko** (akun demo untuk promotor/penguji memakai peran yang sama).

| ID | Use case | Deskripsi | Precondition |
|---|---|---|---|
| UC-01 | Login | Masuk dengan email dan password; aplikasi menerima token API | — |
| UC-02 | Lihat Dashboard | Ringkasan: produk dengan prediksi penjualan tertinggi, produk yang stoknya kurang atau berlebih | Sudah login |
| UC-03 | Kelola Kategori | Tambah, ubah, hapus, lihat kategori produk | Sudah login |
| UC-04 | Kelola Produk | Tambah, ubah, hapus, cari produk; isi stok saat ini dan stok minimum | Sudah login |
| UC-05 | Catat Penjualan Mingguan | Isi jumlah terjual satu produk untuk satu minggu | Produk sudah ada |
| UC-06 | Impor Penjualan dari CSV | Unggah file CSV (produk, tanggal awal minggu, jumlah); baris yang salah dilaporkan | Produk sudah ada |
| UC-07 | Lihat Riwayat Penjualan | Daftar penjualan per minggu, bisa difilter per produk | Sudah login |
| UC-08 | Lihat Prediksi Penjualan | Pilih produk, tampilkan tabel & grafik prediksi minggu berikutnya | Riwayat penjualan produk tersedia |
| UC-09 | Lihat Rekomendasi Stok | Jumlah barang yang disarankan untuk disiapkan per produk | Riwayat penjualan tersedia |
| UC-10 | Kelola Skenario Penyesuaian | Tambah, ubah, hapus skenario (mis. "Musim hujan −20%") | Sudah login |
| UC-11 | Hitung Trend Moment («include») | Hitung a, b, tren, indeks musim, dan prediksi; dipakai UC-08 dan UC-09 | Data minimal 2 minggu (indeks musim butuh ≥ 52 minggu) |
| UC-12 | Terapkan Skenario Penyesuaian («extend») | Opsional saat melihat rekomendasi: kalikan prediksi dengan faktor skenario | Ada skenario yang dibuat |

## 2. Kamus data (ERD)

Tabel bawaan Laravel (`password_reset_tokens`, `sessions`, `cache`, `jobs`, `personal_access_tokens`) tidak dijelaskan di sini.

**users** — akun pengguna (bawaan Laravel).

**categories**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT, PK | |
| user_id | BIGINT, FK → users.id | Pemilik data |
| name | VARCHAR(100) | Unik per pengguna |

**products**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT, PK | |
| user_id | BIGINT, FK → users.id | Pemilik data |
| category_id | BIGINT NULL, FK → categories.id | Boleh tanpa kategori |
| sku | VARCHAR(50) | Kode barang, unik per pengguna |
| name | VARCHAR(150) | Nama barang |
| unit | VARCHAR(20) | Satuan (pcs, kg, dus, …) |
| current_stock | INT UNSIGNED | Stok saat ini |
| min_stock | INT UNSIGNED | Stok minimum (stok pengaman) |

**sales**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT, PK | |
| product_id | BIGINT, FK → products.id | |
| week_start | DATE | Tanggal awal minggu (Senin) |
| quantity | INT UNSIGNED | Jumlah terjual dalam minggu itu |
| | UQ (product_id, week_start) | Satu baris per produk per minggu |

**scenarios**
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | BIGINT, PK | |
| user_id | BIGINT, FK → users.id | Pemilik data |
| name | VARCHAR(100) | Nama skenario |
| adjustment_percent | DECIMAL(5,2) | Penyesuaian dalam persen, boleh negatif (mis. −20.00) |
| description | TEXT NULL | Penjelasan |

Semua tabel memiliki `created_at` dan `updated_at`.

## 3. Perhitungan (tidak disimpan di tabel)

Prediksi dan rekomendasi dihitung saat diminta dari tabel `sales` dan `products`.

1. **Trend Moment** (data mingguan, X = 0, 1, 2, …):
   ΣY = n·a + b·ΣX dan ΣXY = a·ΣX + b·ΣX² → tren Y = a + bX.
2. **Indeks musim per bulan** = rata-rata penjualan mingguan di bulan tersebut ÷ rata-rata penjualan mingguan seluruh data (hanya bila data ≥ 52 minggu).
3. **Prediksi minggu depan** Y\* = Y × indeks musim bulan dari minggu tersebut.
4. **Rekomendasi stok** = maks(0, ⌈Y\* × (1 + penyesuaian skenario %)⌉ + stok minimum − stok saat ini).

Rumus no. 4 adalah aturan perencanaan stok yang dipilih untuk proyek ini (prediksi kebutuhan + stok pengaman − stok yang sudah ada), bukan bagian dari metode Trend Moment. Rumus no. 1–3 dicocokkan dengan referensi sebelum ditulis di laporan.
