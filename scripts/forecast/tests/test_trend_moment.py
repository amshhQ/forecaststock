from datetime import date, timedelta

import pytest

from trend_moment import (
    forecast_next_week,
    main,
    read_sales,
    search_products,
    seasonal_indices,
    sort_by_forecast,
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


RESULTS = [
    {"sku": "AIR", "name": "Air Mineral", "forecast": 5},
    {"sku": "MIE", "name": "Mi Instan", "forecast": 9},
    {"sku": "KPI", "name": "Kopi Sachet", "forecast": 7},
]


def test_urut_dari_prediksi_tertinggi_tanpa_mengubah_data_asli():
    ranked = sort_by_forecast(RESULTS)
    assert [r["sku"] for r in ranked] == ["MIE", "KPI", "AIR"]
    assert [r["sku"] for r in RESULTS] == ["AIR", "MIE", "KPI"]


def test_cari_produk_berdasarkan_nama_tanpa_peduli_huruf_besar():
    assert [r["sku"] for r in search_products(RESULTS, "mineral")] == ["AIR"]


def test_cari_produk_berdasarkan_sku():
    assert [r["sku"] for r in search_products(RESULTS, "kpi")] == ["KPI"]


def test_cari_produk_tidak_ditemukan():
    assert search_products(RESULTS, "sabun") == []


def test_main_menulis_hasil_prediksi_terurut(tmp_path):
    source = write_csv(tmp_path, (
        "AIR,Air Mineral,botol,2026-01-05,10\n"
        "AIR,Air Mineral,botol,2026-01-12,12\n"
        "MIE,Mi Instan,bungkus,2026-01-05,40\n"
        "MIE,Mi Instan,bungkus,2026-01-12,44\n"
    ))
    output = tmp_path / "hasil.csv"

    exit_code = main([str(source), str(output)])

    lines = output.read_text(encoding="utf-8").splitlines()
    assert exit_code == 0
    assert lines[0] == "sku,name,week_start,x,a,b,trend,seasonal_index,forecast"
    assert lines[1].startswith("MIE,Mi Instan,2026-01-19,2,")
    assert lines[1].endswith(",48.0000")
    assert lines[2].startswith("AIR,")


def test_main_file_tidak_ada_memberi_pesan_dan_kode_keluar_1(tmp_path, capsys):
    exit_code = main([str(tmp_path / "tidak-ada.csv"), str(tmp_path / "hasil.csv")])
    assert exit_code == 1
    assert "tidak ditemukan" in capsys.readouterr().err
