"""Prediksi penjualan mingguan dengan metode Trend Moment."""

import csv
import sys
from datetime import date, timedelta


def read_sales(path):
    """Baca CSV penjualan dan kelompokkan per sku, urut per minggu.

    Baris yang tidak valid memunculkan ValueError beserta nomor barisnya.
    """
    products = {}
    with open(path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for line_number, row in enumerate(reader, start=2):
            try:
                week_start = date.fromisoformat(row["week_start"].strip())
                quantity = int(row["quantity"].strip())
            except (ValueError, AttributeError, KeyError) as error:
                raise ValueError(f"Data tidak valid di baris {line_number}: {error}") from error
            if quantity < 0:
                raise ValueError(f"Jumlah negatif di baris {line_number}")

            sku = row["sku"].strip()
            if sku not in products:
                products[sku] = {"name": row["name"].strip(), "unit": row["unit"].strip(), "weeks": []}
            products[sku]["weeks"].append((week_start, quantity))

    for product in products.values():
        product["weeks"].sort()
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


def sort_by_forecast(results):
    """Urutkan dari prediksi tertinggi pakai insertion sort, O(n²).

    Cukup cepat karena jumlah produk toko kecil. Data asli tidak diubah.
    """
    ranked = list(results)
    for i in range(1, len(ranked)):
        current = ranked[i]
        j = i - 1
        while j >= 0 and ranked[j]["forecast"] < current["forecast"]:
            ranked[j + 1] = ranked[j]
            j -= 1
        ranked[j + 1] = current
    return ranked


def search_products(results, keyword):
    """Linear search berdasarkan nama atau sku, O(n)."""
    keyword = keyword.strip().lower()
    found = []
    for result in results:
        if keyword in result["name"].lower() or keyword in result["sku"].lower():
            found.append(result)
    return found


def forecast_all(products):
    results = []
    for sku, product in products.items():
        result = forecast_next_week(product["weeks"])
        result["sku"] = sku
        result["name"] = product["name"]
        results.append(result)
    return results


OUTPUT_COLUMNS = ["sku", "name", "week_start", "x", "a", "b", "trend", "seasonal_index", "forecast"]


def write_results(path, results):
    """Tulis hasil ke CSV, desimal dibulatkan 4 angka."""
    with open(path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file, lineterminator="\n")
        writer.writerow(OUTPUT_COLUMNS)
        for r in results:
            writer.writerow([
                r["sku"], r["name"], r["week_start"].isoformat(), r["x"],
                f"{r['a']:.4f}", f"{r['b']:.4f}", f"{r['trend']:.4f}",
                f"{r['seasonal_index']:.4f}", f"{r['forecast']:.4f}",
            ])


def main(argv):
    """Pemakaian: python trend_moment.py [input.csv] [output.csv]"""
    source = argv[0] if len(argv) > 0 else "sample_sales.csv"
    output = argv[1] if len(argv) > 1 else "forecast_result.csv"

    try:
        products = read_sales(source)
        results = sort_by_forecast(forecast_all(products))
        write_results(output, results)
    except FileNotFoundError:
        print(f"File {source} tidak ditemukan", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"Gagal menghitung: {error}", file=sys.stderr)
        return 1

    print(f"{'SKU':<10}{'Produk':<22}{'Minggu':<12}{'Prediksi':>10}")
    for r in results:
        print(f"{r['sku']:<10}{r['name']:<22}{r['week_start'].isoformat():<12}{r['forecast']:>10.2f}")
    print(f"\nHasil lengkap ditulis ke {output}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
