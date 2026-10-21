"""Membuat data penjualan simulasi untuk demo (bukan data pasar asli).

Tiap produk sengaja dibuat berbeda supaya semua kondisi muncul di aplikasi:
tren naik, tren turun, datar, penjualan yang naik-turun tajam, minggu tanpa
penjualan, produk yang datanya belum setahun, dan produk baru yang datanya
baru satu minggu.

Pola musim adalah asumsi: kebutuhan pokok naik di bulan Lebaran (Maret-April)
dan Desember, mi instan dan kopi naik saat musim hujan (November-Maret),
air mineral dan es krim naik saat kemarau (Juli-September).
Total per minggu dihitung lebih dulu, lalu dipecah menjadi 7 penjualan harian
(akhir pekan sedikit lebih ramai). Pemecahan harian memakai pengacak terpisah,
jadi total per minggu tidak ikut berubah.
Angka acaknya memakai seed tetap, jadi hasilnya selalu sama setiap dibuat ulang.
"""

import csv
import random
from datetime import date, timedelta

SEED = 2026
DAILY_SEED = 2027
DAY_WEIGHTS = [1.0, 0.9, 0.9, 1.0, 1.1, 1.3, 1.2]
FIRST_WEEK = date(2024, 10, 21)
TOTAL_WEEKS = 104
OUTPUT_FILE = "sample_sales.csv"

LEBARAN_MONTHS = (3, 4)
RAINY_MONTHS = (11, 12, 1, 2, 3)
DRY_MONTHS = (7, 8, 9)

PRODUCTS = [
    {"sku": "BRS-5KG", "name": "Beras 5 kg", "unit": "karung", "base": 40, "growth": 0.10, "noise": 0.10, "season": "pokok"},
    {"sku": "MYK-1L", "name": "Minyak Goreng 1 L", "unit": "botol", "base": 55, "growth": 0.05, "noise": 0.08, "season": "pokok"},
    {"sku": "GLP-1KG", "name": "Gula Pasir 1 kg", "unit": "bungkus", "base": 48, "growth": -0.30, "noise": 0.10, "season": "pokok"},
    {"sku": "TLR-1KG", "name": "Telur Ayam 1 kg", "unit": "kg", "base": 30, "growth": 0.05, "noise": 0.35, "season": None},
    {"sku": "MIE-INS", "name": "Mi Instan", "unit": "bungkus", "base": 120, "growth": 0.15, "noise": 0.10, "season": "hujan"},
    {"sku": "AIR-600", "name": "Air Mineral 600 ml", "unit": "botol", "base": 150, "growth": 0.10, "noise": 0.10, "season": "kemarau"},
    {"sku": "KPI-SCT", "name": "Kopi Sachet", "unit": "sachet", "base": 90, "growth": 0.20, "noise": 0.12, "season": "hujan"},
    {"sku": "ESK-CUP", "name": "Es Krim Cup", "unit": "cup", "base": 10, "growth": 0.0, "noise": 0.30, "season": "es"},
    {"sku": "SBN-CP", "name": "Sabun Cuci Piring", "unit": "pcs", "base": 35, "growth": -0.45, "noise": 0.10, "season": None},
    {"sku": "SKM-370", "name": "Susu Kental Manis 370 g", "unit": "kaleng", "base": 14, "growth": 1.20, "noise": 0.12, "season": None, "first_index": 74},
    {"sku": "TEH-BTL", "name": "Teh Botol 350 ml", "unit": "botol", "base": 24, "growth": 0.0, "noise": 0.10, "season": None, "first_index": 103},
]


def season_factor(season, month):
    """Faktor pengali musim untuk jenis musim tertentu di bulan tertentu."""
    if season == "pokok":
        if month in LEBARAN_MONTHS:
            return 1.35
        if month == 12:
            return 1.15
    if season == "hujan" and month in RAINY_MONTHS:
        return 1.20
    if season == "kemarau":
        if month in RAINY_MONTHS:
            return 0.75
        if month in DRY_MONTHS:
            return 1.15
    if season == "es":
        if month in DRY_MONTHS:
            return 2.2
        if month in RAINY_MONTHS:
            return 0.05
    return 1.0


def simulate_quantity(product, week_index, month, rng):
    """Penjualan seminggu = dasar × pertumbuhan × musim × acak, kadang ada lonjakan."""
    weeks_running = week_index - product.get("first_index", 0)
    trend = product["base"] * (1 + product["growth"] / 100) ** weeks_running
    noise = rng.uniform(1 - product["noise"], 1 + product["noise"])
    spike = 1.4 if rng.random() < 0.04 else 1.0
    return max(0, round(trend * season_factor(product["season"], month) * noise * spike))


def split_week(total, rng):
    """Pecah total seminggu menjadi 7 angka harian yang jumlahnya tetap sama."""
    weights = [w * rng.uniform(0.7, 1.3) for w in DAY_WEIGHTS]
    scale = total / sum(weights)
    raw = [w * scale for w in weights]
    days = [int(r) for r in raw]
    leftovers = sorted(range(7), key=lambda i: raw[i] - days[i], reverse=True)
    for i in leftovers[: total - sum(days)]:
        days[i] += 1
    return days


def build_rows():
    rng = random.Random(SEED)
    daily_rng = random.Random(DAILY_SEED)
    rows = []
    for product in PRODUCTS:
        for week_index in range(product.get("first_index", 0), TOTAL_WEEKS):
            week_start = FIRST_WEEK + timedelta(weeks=week_index)
            quantity = simulate_quantity(product, week_index, week_start.month, rng)
            for offset, day_quantity in enumerate(split_week(quantity, daily_rng)):
                day = week_start + timedelta(days=offset)
                rows.append([product["sku"], product["name"], product["unit"], day.isoformat(), day_quantity])
    return rows


def main():
    rows = build_rows()
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["sku", "name", "unit", "date", "quantity"])
        writer.writerows(rows)
    print(f"{len(rows)} baris data simulasi ditulis ke {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
