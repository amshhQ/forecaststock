"""Prediksi penjualan mingguan dengan metode Trend Moment."""

import csv
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
