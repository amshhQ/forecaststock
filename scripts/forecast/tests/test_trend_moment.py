import pytest

from trend_moment import (
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
