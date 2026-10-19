# Script Python Trend Moment

Script prosedural untuk menghitung prediksi penjualan mingguan dengan metode Trend Moment dari file CSV, beserta unit test PyTest.

Fungsinya:
- Bukti MK Programming Fundamentals (Python): kontrol alur, fungsi, list/dict, file I/O, exception handling, PyTest, sorting/searching + Big-O.
- Memverifikasi hasil prediksi aplikasi Laravel: hasil untuk `sample_sales.csv` harus sama dengan `expected_forecast.csv` (dicek PHPUnit).

Script ini **tidak di-hosting**. Hanya dijalankan di laptop dan di GitHub Actions.

## File

| File | Isi |
|---|---|
| `trend_moment.py` | Perhitungan: baca CSV, koefisien a & b, indeks musim, prediksi minggu depan, sorting, searching |
| `generate_sample_data.py` | Pembuat **data simulasi** 104 minggu (bukan data asli, seed tetap) |
| `sample_sales.csv` | Data simulasi: 6 produk × 104 minggu (21 Okt 2024 – 12 Okt 2026) |
| `expected_forecast.csv` | Hasil prediksi untuk `sample_sales.csv`, patokan untuk aplikasi |
| `tests/test_trend_moment.py` | 17 unit test (ditulis dengan TDD, lihat riwayat commit) |

## Menjalankan

```powershell
cd scripts/forecast
python -m venv .venv                               # sekali saja
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pytest -v                  # jalankan test
.venv\Scripts\python trend_moment.py               # hitung dari sample_sales.csv → forecast_result.csv
.venv\Scripts\python trend_moment.py data.csv hasil.csv
```

Format CSV masukan: `sku,name,unit,week_start,quantity` (`week_start` = tanggal Senin, format `YYYY-MM-DD`).

## Rumus

1. Tren: Y = a + bX, X = 0, 1, 2, … dari ΣY = n·a + b·ΣX dan ΣXY = a·ΣX + b·ΣX².
2. Indeks musim bulan m = rata-rata penjualan mingguan bulan m ÷ rata-rata mingguan seluruh data (hanya jika ≥ 52 minggu).
3. Prediksi minggu depan = (a + b·n) × indeks musim bulan minggu tersebut; tidak pernah negatif.

## Kompleksitas

| Fungsi | Kompleksitas | Keterangan |
|---|---|---|
| `trend_coefficients` | O(n) | Satu kali loop atas n minggu |
| `seasonal_indices` | O(n) | Satu kali loop + 12 bulan |
| `sort_by_forecast` | O(p²) | Insertion sort atas p produk (jumlah produk toko kecil) |
| `search_products` | O(p) | Linear search |
