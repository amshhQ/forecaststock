<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\SaleController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BoundaryValueTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-21');
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    public static function quantities(): array
    {
        return [
            'di bawah batas bawah (-1)' => [-1, 422],
            'batas bawah (0)' => [0, 201],
            'di atas batas bawah (1)' => [1, 201],
            'batas atas (1.000.000)' => [SaleController::MAX_QUANTITY, 201],
            'di atas batas atas (1.000.001)' => [SaleController::MAX_QUANTITY + 1, 422],
        ];
    }

    #[DataProvider('quantities')]
    public function test_batas_jumlah_penjualan(int $quantity, int $status): void
    {
        $product = $this->user->products()->create(['sku' => 'A', 'name' => 'Barang A', 'unit' => 'pcs', 'current_stock' => SaleController::MAX_QUANTITY + 1]);

        $this->postJson('/api/sales', ['product_id' => $product->id, 'sale_date' => '2026-10-12', 'quantity' => $quantity])
            ->assertStatus($status);
    }

    public static function saleDates(): array
    {
        return [
            'Selasa minggu lalu' => ['2026-10-13', 201],
            'kemarin' => ['2026-10-20', 201],
            'hari ini (batas)' => ['2026-10-21', 201],
            'besok (belum terjadi)' => ['2026-10-22', 422],
        ];
    }

    #[DataProvider('saleDates')]
    public function test_batas_tanggal_penjualan(string $date, int $status): void
    {
        $product = $this->user->products()->create(['sku' => 'A', 'name' => 'Barang A', 'unit' => 'pcs', 'current_stock' => 100]);

        $this->postJson('/api/sales', ['product_id' => $product->id, 'sale_date' => $date, 'quantity' => 5])
            ->assertStatus($status);
    }

    public static function adjustments(): array
    {
        return [
            'di bawah batas bawah (-100,01)' => [-100.01, 422],
            'batas bawah (-100)' => [-100, 201],
            'nol' => [0, 201],
            'batas atas (500)' => [500, 201],
            'di atas batas atas (500,01)' => [500.01, 422],
        ];
    }

    #[DataProvider('adjustments')]
    public function test_batas_persen_skenario(float $percent, int $status): void
    {
        $this->postJson('/api/scenarios', ['name' => 'Uji', 'adjustment_percent' => $percent])
            ->assertStatus($status);
    }

    public static function stocks(): array
    {
        return [
            'stok negatif' => [-1, 422],
            'stok nol' => [0, 201],
            'stok maksimal' => [1000000, 201],
            'stok lewat maksimal' => [1000001, 422],
        ];
    }

    #[DataProvider('stocks')]
    public function test_batas_stok_produk(int $stock, int $status): void
    {
        $this->postJson('/api/products', ['sku' => 'B', 'name' => 'Barang B', 'unit' => 'pcs', 'current_stock' => $stock, 'min_stock' => 0])
            ->assertStatus($status);
    }

    public function test_jumlah_minggu_menentukan_cara_hitung_prediksi(): void
    {
        $product = $this->user->products()->create(['sku' => 'A', 'name' => 'Barang A', 'unit' => 'pcs']);
        $addWeeks = function (int $count) use ($product) {
            $product->sales()->delete();
            $start = Carbon::parse('2025-10-20');
            for ($i = 0; $i < $count; $i++) {
                $product->sales()->create(['sale_date' => $start->copy()->addWeeks($i), 'quantity' => $start->copy()->addWeeks($i)->month * 5]);
            }

            return $this->getJson("/api/forecasts/{$product->id}")->assertOk()->json();
        };

        $this->assertSame('data_kurang', $addWeeks(1)['status']);
        $this->assertNotNull($addWeeks(2)['forecast']);
        $this->assertSame(1, $addWeeks(51)['forecast']['seasonal_index']);
        $this->assertNotSame(1, $addWeeks(52)['forecast']['seasonal_index']);
    }
}
