<?php

namespace Tests\Unit;

use App\Services\StockForecastService;
use App\Services\TrendMomentService;
use PHPUnit\Framework\TestCase;

class StockForecastServiceTest extends TestCase
{
    private StockForecastService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new StockForecastService(new TrendMomentService);
    }

    public function test_rekomendasi_prediksi_ditambah_stok_minimum_dikurangi_stok(): void
    {
        $this->assertSame(33, $this->service->recommendedQuantity(42.3, 10, 20));
    }

    public function test_target_stok_prediksi_dibulatkan_ke_atas_ditambah_stok_minimum(): void
    {
        $this->assertSame(53, $this->service->targetStock(42.3, 10));
    }

    public function test_rekomendasi_tidak_pernah_negatif(): void
    {
        $this->assertSame(0, $this->service->recommendedQuantity(10, 5, 100));
    }

    public function test_status_perlu_restock_jika_ada_rekomendasi(): void
    {
        $this->assertSame('perlu_restock', $this->service->status(5, 40, 10, 45));
    }

    public function test_status_berlebih_jika_stok_cukup_lebih_dari_dua_minggu(): void
    {
        $this->assertSame('berlebih', $this->service->status(0, 90, 40, 240));
    }

    public function test_status_aman(): void
    {
        $this->assertSame('aman', $this->service->status(0, 90, 40, 150));
    }
}
