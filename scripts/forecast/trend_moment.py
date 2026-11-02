"""Prediksi penjualan mingguan dengan metode Trend Moment."""

import csv
import sys
from datetime import date, timedelta


def week_monday(day):
    """Tanggal Senin dari minggu tempat tanggal itu berada."""
    return day - timedelta(days=day.weekday())


def read_sales(path, today=None):
    """Baca CSV penjualan per tanggal, lalu jumlahkan per produk per minggu (Senin).

    Kalau today diisi, minggu yang sedang berjalan dan sesudahnya tidak dihitung,
    sama seperti aplikasi. Baris yang tidak valid memunculkan ValueError beserta nomor barisnya.
    """
    current_monday = week_monday(today) if today else None
    products = {}
    with open(path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for line_number, row in enumerate(reader, start=2):
            try:
                sale_date = date.fromisoformat(row["date"].strip())
                quantity = int(row["quantity"].strip())
            except (ValueError, AttributeError, KeyError) as error:
                raise ValueError(f"Data tidak valid di baris {line_number}: {error}") from error
            if quantity < 0:
                raise ValueError(f"Jumlah negatif di baris {line_number}")

            sku = row["sku"].strip()
            if sku not in products:
                products[sku] = {"name": row["name"].strip(), "unit": row["unit"].strip(), "totals": {}}
            monday = week_monday(sale_date)
            if current_monday and monday >= current_monday:
                continue
            totals = products[sku]["totals"]
            totals[monday] = totals.get(monday, 0) + quantity

    for product in products.values():
        product["weeks"] = sorted(product.pop("totals").items())
    return products


def trend_coefficients(values):
    """Hitung a dan b pada Y = a + bX (X = 0, 1, 2, ...).

    Dari dua persamaan:  ΣY = n·a + b·ΣX  dan  ΣXY = a·ΣX + b·ΣX²
    """
    n = len(values)
    if n < 2:
        raise ValueError("Butuh data minimal 2 minggu untuk menghitung tren")

    sum_x = 0
    sum_y = 0
    sum_xy = 0
    sum_x2 = 0
    for x, y in enumerate(values):
        sum_x += x
        sum_y += y
        sum_xy += x * y
        sum_x2 += x * x

    b = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
    a = (sum_y - b * sum_x) / n
    return a, b


MIN_WEEKS_FOR_SEASON = 52


def seasonal_indices(weeks):
    """Indeks bulan = rata-rata penjualan mingguan bulan itu ÷ rata-rata seluruh data.

    Kalau data belum 52 minggu, hasilnya kosong (indeks musim tidak dipakai).
    """
    if len(weeks) < MIN_WEEKS_FOR_SEASON:
        return {}

    totals = {}
    counts = {}
    grand_total = 0
    for week_start, quantity in weeks:
        month = week_start.month
        totals[month] = totals.get(month, 0) + quantity
        counts[month] = counts.get(month, 0) + 1
        grand_total += quantity

    overall_average = grand_total / len(weeks)
    if overall_average == 0:
        return {}

    indices = {}
    for month in totals:
        indices[month] = (totals[month] / counts[month]) / overall_average
    return indices


def forecast_next_week(weeks):
    """Prediksi minggu depan = tren × indeks musim bulannya, minimal 0."""
    quantities = [quantity for _, quantity in weeks]
    a, b = trend_coefficients(quantities)

    x = len(weeks)
    week_start = weeks[-1][0] + timedelta(weeks=1)
    trend = a + b * x

    indices = seasonal_indices(weeks)
    seasonal_index = indices.get(week_start.month, 1.0) if indices else 1.0

    forecast = trend * seasonal_index
    if forecast < 0:
        forecast = 0

    return {
        "week_start": week_start,
        "x": x,
        "a": a,
        "b": b,
        "trend": trend,
        "seasonal_index": seasonal_index,
        "forecast": forecast,
    }


class ForecastResult:
    """Hasil prediksi satu produk untuk minggu depan, beserta akurasinya."""

    def __init__(self, sku, name, prediction, mape=None):
        self.sku = sku
        self.name = name
        self.week_start = prediction["week_start"]
        self.x = prediction["x"]
        self.a = prediction["a"]
        self.b = prediction["b"]
        self.trend = prediction["trend"]
        self.seasonal_index = prediction["seasonal_index"]
        self.forecast = prediction["forecast"]
        self.mape = mape

    def accuracy_label(self):
        """Kategori MAPE, sama dengan label di aplikasi."""
        if self.mape is None:
            return "belum bisa diukur"
        elif self.mape < 10:
            return "sangat baik"
        elif self.mape < 20:
            return "baik"
        elif self.mape <= 50:
            return "cukup"
        else:
            return "kurang akurat"

    def to_csv_row(self):
        """Satu baris CSV hasil, desimal dibulatkan 4 angka."""
        return [
            self.sku, self.name, self.week_start.isoformat(), self.x,
            f"{self.a:.4f}", f"{self.b:.4f}", f"{self.trend:.4f}",
            f"{self.seasonal_index:.4f}", f"{self.forecast:.4f}",
            "" if self.mape is None else f"{self.mape:.4f}",
        ]


BACKTEST_WEEKS = 8


def backtest(weeks, holdout=BACKTEST_WEEKS):
    """Uji mundur: tiap minggu uji diprediksi hanya dari data sebelumnya.

    MAPE = rata-rata |asli - prediksi| / asli × 100%. Minggu dengan penjualan 0
    tidak ikut dihitung karena tidak bisa dibagi. Butuh data lebih dari holdout + 1.
    """
    if len(weeks) < holdout + 2:
        return None

    rows = []
    errors = []
    for i in range(len(weeks) - holdout, len(weeks)):
        week_start, actual = weeks[i]
        forecast = forecast_next_week(weeks[:i])["forecast"]
        error_percent = None
        if actual > 0:
            error_percent = abs(actual - forecast) / actual * 100
            errors.append(error_percent)
        rows.append({"week_start": week_start, "actual": actual, "forecast": forecast, "error_percent": error_percent})

    mape = sum(errors) / len(errors) if errors else None
    return {"weeks": holdout, "rows": rows, "mape": mape}


def sort_by_forecast(results):
    """Urutkan dari prediksi tertinggi pakai insertion sort, O(n²).

    Cukup cepat karena jumlah produk toko kecil. Data asli tidak diubah.
    """
    ranked = list(results)
    for i in range(1, len(ranked)):
        current = ranked[i]
        j = i - 1
        while j >= 0 and ranked[j].forecast < current.forecast:
            ranked[j + 1] = ranked[j]
            j -= 1
        ranked[j + 1] = current
    return ranked


def search_products(results, keyword):
    """Linear search berdasarkan nama atau sku, O(n)."""
    keyword = keyword.strip().lower()
    found = []
    for result in results:
        if keyword in result.name.lower() or keyword in result.sku.lower():
            found.append(result)
    return found


def forecast_all(products):
    """Prediksi semua produk. Produk dengan data kurang dari 2 minggu dilewati."""
    results = []
    skipped = []
    for sku, product in products.items():
        if len(product["weeks"]) < 2:
            skipped.append(sku)
            continue
        prediction = forecast_next_week(product["weeks"])
        accuracy = backtest(product["weeks"])
        mape = accuracy["mape"] if accuracy else None
        results.append(ForecastResult(sku, product["name"], prediction, mape))
    return results, skipped


OUTPUT_COLUMNS = ["sku", "name", "week_start", "x", "a", "b", "trend", "seasonal_index", "forecast", "mape"]


def write_results(path, results):
    """Tulis hasil ke CSV, satu baris per produk."""
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file, lineterminator="\n")
        writer.writerow(OUTPUT_COLUMNS)
        for r in results:
            writer.writerow(r.to_csv_row())


def main(argv):
    """Pemakaian: python trend_moment.py [input.csv] [output.csv] [tanggal hari ini, YYYY-MM-DD]"""
    source = argv[0] if len(argv) > 0 else "sample_sales.csv"
    output = argv[1] if len(argv) > 1 else "forecast_result.csv"

    try:
        today = date.fromisoformat(argv[2]) if len(argv) > 2 else date.today()
        products = read_sales(source, today)
        results, skipped = forecast_all(products)
        results = sort_by_forecast(results)
        write_results(output, results)
    except FileNotFoundError:
        print(f"File {source} tidak ditemukan", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"Gagal menghitung: {error}", file=sys.stderr)
        return 1

    print(f"{'SKU':<10}{'Produk':<26}{'Minggu':<12}{'Prediksi':>10}{'MAPE':>9}  Akurasi")
    for r in results:
        mape = "-" if r.mape is None else f"{r.mape:.2f}%"
        print(f"{r.sku:<10}{r.name:<26}{r.week_start.isoformat():<12}{r.forecast:>10.2f}{mape:>9}  {r.accuracy_label()}")
    if skipped:
        print(f"\nDilewati karena data kurang dari 2 minggu: {', '.join(skipped)}")
    print(f"\nHasil lengkap ditulis ke {output}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
