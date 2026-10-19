from datetime import date, timedelta

import pytest

from trend_moment import (
    forecast_next_week,
    read_sales,
    seasonal_indices,
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


def make_weeks(first_monday, quantities):
    return [(first_monday + timedelta(weeks=i), q) for i, q in enumerate(quantities)]


def one_year_with_low_january():
    return make_weeks(date(2025, 1, 6), [10] * 4 + [20] * 48)


def test_indeks_musim_sesuai_hitungan_manual():
    indices = seasonal_indices(one_year_with_low_january())
    assert indices[1] == pytest.approx(0.52)
    assert indices[6] == pytest.approx(1.04)
    assert len(indices) == 12


def test_indeks_musim_tidak_dipakai_jika_kurang_dari_52_minggu():
    assert seasonal_indices(make_weeks(date(2026, 1, 5), [10, 12, 14])) == {}


def test_prediksi_minggu_depan_tanpa_indeks_musim():
    result = forecast_next_week(make_weeks(date(2026, 1, 5), [10, 12, 14, 16]))
    assert result["week_start"] == date(2026, 2, 2)
    assert result["x"] == 4
    assert result["trend"] == pytest.approx(18)
    assert result["seasonal_index"] == pytest.approx(1.0)
    assert result["forecast"] == pytest.approx(18)


def test_prediksi_memakai_indeks_musim_bulan_minggu_depan():
    result = forecast_next_week(one_year_with_low_january())
    assert result["week_start"] == date(2026, 1, 5)
    assert result["seasonal_index"] == pytest.approx(0.52)
    assert result["forecast"] == pytest.approx(result["trend"] * 0.52)


def test_prediksi_tidak_pernah_negatif():
    result = forecast_next_week(make_weeks(date(2026, 1, 5), [30, 15, 0]))
    assert result["trend"] == pytest.approx(-15)
    assert result["forecast"] == 0
