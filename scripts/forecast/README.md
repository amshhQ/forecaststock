# Script Python Trend Moment

Script prosedural untuk menghitung prediksi penjualan minggu depan dengan metode Trend Moment dari file CSV penjualan harian, beserta unit test PyTest.

Fungsinya:
- Bukti MK Programming Fundamentals (Python): kontrol alur, fungsi, list/dict, file I/O, exception handling, PyTest, sorting/searching + Big-O.
- Memverifikasi hasil prediksi aplikasi Laravel: hasil untuk `sample_sales.csv` harus sama dengan `expected_forecast.csv` (dicek PHPUnit).

Script ini **tidak di-hosting**. Hanya dijalankan di laptop dan di GitHub Actions.

## File

| File | Isi |
|---|---|
| `trend_moment.py` | Perhitungan: baca CSV dan jumlahkan per minggu, koefisien a & b, indeks musim, prediksi minggu depan, uji mundur (MAPE), sorting, searching |
| `generate_sample_data.py` | Pembuat **data simulasi** 104 minggu: total mingguan dibuat dulu, lalu dibagi ke hari-harinya (bukan data asli, seed tetap) |
| `sample_sales.csv` | Data simulasi per hari (3.857 baris): 7 produk minimarket, satu kondisi per produk, sampai 104 minggu (21 Okt 2024 sampai 18 Okt 2026) |
| `expected_forecast.csv` | Hasil prediksi untuk `sample_sales.csv`, patokan untuk aplikasi |
| `tests/test_trend_moment.py` | 23 unit test, coverage 99% (ditulis dengan TDD, lihat riwayat commit) |

## Menjalankan

```powershell
cd scripts/forecast
python -m venv .venv                               # sekali saja
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pytest -v                  # jalankan test
.venv\Scripts\python trend_moment.py               # hitung dari sample_sales.csv, hasil di forecast_result.csv
.venv\Scripts\python trend_moment.py data.csv hasil.csv
```

Format CSV masukan: `sku,name,unit,date,quantity` (`date` = tanggal penjualan, format `YYYY-MM-DD`). Penjualan dijumlahkan per minggu mulai Senin, sama seperti aplikasi. Bedanya, aplikasi melewati minggu yang sedang berjalan, sedangkan script menghitung semua minggu di file. Jadi data yang dihitung script sebaiknya berakhir di hari Minggu. Produk dengan data kurang dari 2 minggu dilewati dan namanya ditampilkan.

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
