from datetime import date

import pytest

from trend_moment import (
    read_sales,
    trend_coefficients,
)


def test_garis_lurus_menghasilkan_a_dan_b_tepat():
    a, b = trend_coefficients([10, 12, 14, 16])
    assert a == pytest.approx(10)
    assert b == pytest.approx(2)


def test_data_tidak_lurus_sesuai_hitungan_manual():
    a, b = trend_coefficients([5, 7, 6, 10])
    assert a == pytest.approx(4.9)
    assert b == pytest.approx(1.4)


def test_data_kurang_dari_dua_minggu_ditolak():
    with pytest.raises(ValueError):
        trend_coefficients([10])


HEADER = "sku,name,unit,week_start,quantity\n"


def write_csv(tmp_path, body):
    path = tmp_path / "penjualan.csv"
    path.write_text(HEADER + body, encoding="utf-8")
    return path


def test_csv_dikelompokkan_per_produk_dan_diurutkan_per_minggu(tmp_path):
    path = write_csv(tmp_path, (
        "AIR,Air Mineral,botol,2026-01-12,30\n"
        "AIR,Air Mineral,botol,2026-01-05,20\n"
        "MIE,Mi Instan,bungkus,2026-01-05,50\n"
    ))
    products = read_sales(path)

    assert list(products) == ["AIR", "MIE"]
    assert products["AIR"]["name"] == "Air Mineral"
    assert products["AIR"]["weeks"] == [(date(2026, 1, 5), 20), (date(2026, 1, 12), 30)]


def test_jumlah_bukan_angka_menyebut_nomor_baris(tmp_path):
    path = write_csv(tmp_path, (
        "AIR,Air Mineral,botol,2026-01-05,20\n"
        "AIR,Air Mineral,botol,2026-01-12,tiga puluh\n"
    ))
    with pytest.raises(ValueError, match="baris 3"):
        read_sales(path)


def test_jumlah_negatif_ditolak(tmp_path):
    path = write_csv(tmp_path, "AIR,Air Mineral,botol,2026-01-05,-5\n")
    with pytest.raises(ValueError, match="baris 2"):
        read_sales(path)
