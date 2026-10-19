"""Prediksi penjualan mingguan dengan metode Trend Moment."""


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
