"""Prediksi penjualan mingguan dengan metode Trend Moment."""

import csv
from datetime import date


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
