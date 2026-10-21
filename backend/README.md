# Backend ForecastStock

REST API Laravel 13 (PHP 8.3) dengan database MySQL dan autentikasi token Laravel Sanctum.

| Bagian | Lokasi |
|---|---|
| Endpoint API | `routes/api.php` |
| Controller | `app/Http/Controllers/Api` |
| Perhitungan Trend Moment + uji mundur (MAPE) | `app/Services/TrendMomentService.php` |
| Penjualan harian dijumlah per minggu, prediksi, target stok, rekomendasi, status stok, skenario per kategori | `app/Services/StockForecastService.php` |
| Semua perubahan stok (penjualan, barang masuk, rusak, opname) beserta riwayatnya | `app/Services/StockLedger.php`, `app/Models/StockMovement.php` |
| Akun demo + data simulasi | `database/seeders/DatabaseSeeder.php`, `database/data/sample_sales.csv` |
| Jenis usaha, kategori awal, saran satuan | `config/business.php` |
| Pesan validasi bahasa Indonesia | `lang/id/validation.php`, `lang/id.json` |
| Test | `tests/Unit`, `tests/Feature` |

Menjalankan dan menguji: lihat README di folder utama proyek.
