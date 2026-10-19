"""Membuat data penjualan simulasi 104 minggu untuk demo (bukan data pasar asli).

Pola musimnya asumsi: kebutuhan pokok naik di bulan Lebaran (Maret-April) dan Desember,
mi instan dan kopi naik saat musim hujan (November-Maret), air mineral naik saat kemarau.
Seed acak tetap, jadi hasilnya selalu sama.
"""

import csv
import random
from datetime import date, timedelta

SEED = 42
FIRST_WEEK = date(2024, 10, 21)  # Senin
TOTAL_WEEKS = 104
OUTPUT_FILE = "sample_sales.csv"

PRODUCTS = [
    ("BRS-5KG", "Beras 5 kg", "karung", 40, 0.10),
    ("MYK-1L", "Minyak Goreng 1 L", "botol", 55, 0.05),
    ("GLP-1KG", "Gula Pasir 1 kg", "bungkus", 35, 0.05),
    ("MIE-INS", "Mi Instan", "bungkus", 120, 0.15),
    ("AIR-600", "Air Mineral 600 ml", "botol", 150, 0.10),
    ("KPI-SCT", "Kopi Sachet", "sachet", 90, 0.20),
]

LEBARAN_MONTHS = (3, 4)
RAINY_MONTHS = (11, 12, 1, 2, 3)
DRY_MONTHS = (7, 8, 9)


def season_factor(sku, month):
    """Faktor pengali musim untuk satu produk di bulan tertentu."""
    factor = 1.0
    if sku in ("BRS-5KG", "MYK-1L", "GLP-1KG"):
        if month in LEBARAN_MONTHS:
            factor += 0.35
        elif month == 12:
            factor += 0.15
    if sku in ("MIE-INS", "KPI-SCT") and month in RAINY_MONTHS:
        factor += 0.20
    if sku == "AIR-600":
        if month in RAINY_MONTHS:
            factor -= 0.25
        elif month in DRY_MONTHS:
            factor += 0.15
    return factor


def simulate_quantity(base, growth_percent, week_index, sku, month, rng):
    """Penjualan seminggu = dasar × pertumbuhan × musim × acak (±10%)."""
    trend = base * (1 + growth_percent / 100) ** week_index
    noise = rng.uniform(0.9, 1.1)
    return max(0, round(trend * season_factor(sku, month) * noise))


def build_rows():
    rng = random.Random(SEED)
    rows = []
    for sku, name, unit, base, growth in PRODUCTS:
        for week_index in range(TOTAL_WEEKS):
            week_start = FIRST_WEEK + timedelta(weeks=week_index)
            quantity = simulate_quantity(base, growth, week_index, sku, week_start.month, rng)
            rows.append([sku, name, unit, week_start.isoformat(), quantity])
    return rows


def main():
    rows = build_rows()
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["sku", "name", "unit", "week_start", "quantity"])
        writer.writerows(rows)
    print(f"{len(rows)} baris data simulasi ditulis ke {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
