# Script Python Trend Moment

Script Python (sebagian besar prosedural, ditambah satu class untuk hasil prediksi) untuk menghitung prediksi penjualan minggu depan dengan metode Trend Moment dari file CSV penjualan harian, beserta unit test PyTest.

Fungsinya:
- Bukti MK Programming Fundamentals (Python): kontrol alur, fungsi, list/dict, file I/O, exception handling, pengantar OOP, PyTest, sorting/searching + Big-O.
- Memverifikasi hasil prediksi aplikasi Laravel: hasil untuk `sample_sales.csv` harus sama dengan `expected_forecast.csv` (dicek PHPUnit).

Script ini **tidak di-hosting**. Hanya dijalankan di laptop dan di GitHub Actions.

## File

| File | Isi |
|---|---|
| `trend_moment.py` | Perhitungan: baca CSV dan jumlahkan per minggu, koefisien a & b, indeks musim, prediksi minggu depan, uji mundur (MAPE), sorting, searching, dan class `ForecastResult` untuk hasil per produk |
| `generate_sample_data.py` | Pembuat **data simulasi** 21 Okt 2024 sampai 15 Nov 2026: total mingguan dibuat dulu, lalu dibagi ke hari-harinya (bukan data asli, seed tetap) |
| `sample_sales.csv` | Data simulasi per hari (4.025 baris): 7 produk minimarket, satu kondisi per produk, 21 Okt 2024 sampai 15 Nov 2026 |
| `expected_forecast.csv` | Hasil prediksi untuk `sample_sales.csv` dengan tanggal hari ini 2026-11-16 (prediksi minggu 16 sampai 22 Nov), patokan untuk aplikasi |
| `tests/test_trend_moment.py` | 35 unit test, coverage 99% (ditulis dengan TDD, lihat riwayat commit) |

## Menjalankan

```powershell
cd scripts/forecast
python -m venv .venv                               # sekali saja
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pytest -v                  # jalankan test
.venv\Scripts\python trend_moment.py               # hitung dari sample_sales.csv, hasil di forecast_result.csv
.venv\Scripts\python trend_moment.py data.csv hasil.csv
.venv\Scripts\python trend_moment.py sample_sales.csv expected_forecast.csv 2026-11-16   # tanggal hari ini ditentukan sendiri
```

Format CSV masukan: `sku,name,unit,date,quantity` (`date` = tanggal penjualan, format `YYYY-MM-DD`). Penjualan dijumlahkan per minggu mulai Senin, sama seperti aplikasi. Minggu yang sedang berjalan dan sesudahnya tidak dihitung, juga sama seperti aplikasi. Argumen ketiga adalah tanggal hari ini (`YYYY-MM-DD`); kalau tidak diisi, dipakai tanggal komputer. Produk dengan data kurang dari 2 minggu dilewati dan namanya ditampilkan.

## Memakai class ForecastResult

Hasil prediksi setiap produk berupa object `ForecastResult`. Contoh di Python interaktif (`.venv\Scripts\python`):

```python
from trend_moment import read_sales, forecast_all, sort_by_forecast, search_products

from datetime import date

products = read_sales("sample_sales.csv", today=date(2026, 11, 11))
results, skipped = forecast_all(products)        # list berisi object ForecastResult

air = search_products(results, "air")[0]
air.name, air.week_start, round(air.forecast, 2)  # ('Air Mineral 600 ml', datetime.date(2026, 11, 9), 93.83)
air.mape                                          # 12.4198... (persen)
air.accuracy_label()                              # 'baik'
air.to_csv_row()                                  # satu baris seperti di forecast_result.csv

[r.sku for r in sort_by_forecast(results)]        # SKU dari prediksi tertinggi
```

Label akurasi memakai batas yang sama dengan aplikasi: di bawah 10% sangat baik, di bawah 20% baik, sampai 50% cukup, di atas 50% kurang akurat. Kalau MAPE belum bisa dihitung (data kurang dari 10 minggu), labelnya "belum bisa diukur".

## Rumus

1. Tren: Y = a + bX, X = 0, 1, 2, … dari ΣY = n·a + b·ΣX dan ΣXY = a·ΣX + b·ΣX².
2. Indeks musim bulan m = rata-rata penjualan mingguan bulan m ÷ rata-rata mingguan seluruh data (hanya jika ≥ 52 minggu).
3. Prediksi minggu depan = (a + b·n) × indeks musim bulan minggu itu; tidak pernah negatif.
4. Akurasi (MAPE): 8 minggu terakhir diprediksi satu per satu hanya dari data sebelumnya, lalu MAPE = rata-rata |asli − prediksi| ÷ asli × 100%. Minggu dengan penjualan 0 dilewati.

## Kompleksitas

| Fungsi | Kompleksitas | Keterangan |
|---|---|---|
| `read_sales` | O(r + n log n) | Satu kali loop atas r baris CSV, lalu mengurutkan n minggu tiap produk |
| `trend_coefficients` | O(n) | Satu kali loop atas n minggu |
| `seasonal_indices` | O(n) | Satu kali loop + 12 bulan |
| `sort_by_forecast` | O(p²) | Insertion sort atas p produk (jumlah produk toko kecil) |
| `search_products` | O(p) | Linear search |
| `backtest` | O(h·n) | h = 8 minggu uji, tiap minggu menghitung ulang tren dan indeks musim |
