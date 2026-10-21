<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DailySalesStockTest extends TestCase
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

    private function product(int $stock = 50, int $minStock = 5): Product
    {
        return $this->user->products()->create(['sku' => 'A', 'name' => 'Barang A', 'unit' => 'pcs', 'current_stock' => $stock, 'min_stock' => $minStock]);
    }

    private function sell(Product $product, string $date, int $quantity)
    {
        return $this->postJson('/api/sales', ['product_id' => $product->id, 'sale_date' => $date, 'quantity' => $quantity]);
    }

    public function test_penjualan_mengurangi_stok_dan_tercatat_di_riwayat_stok(): void
    {
        $product = $this->product(50);

        $this->sell($product, '2026-10-21', 8)->assertCreated();

        $this->assertSame(42, $product->fresh()->current_stock);
        $this->getJson("/api/products/{$product->id}/movements")
            ->assertOk()
            ->assertJsonPath('0.type', 'terjual')
            ->assertJsonPath('0.quantity', -8);
    }

    public function test_mencatat_ulang_tanggal_yang_sama_mengganti_jumlah_dan_menyesuaikan_stok(): void
    {
        $product = $this->product(50);

        $this->sell($product, '2026-10-20', 8)->assertCreated();
        $this->sell($product, '2026-10-20', 5)->assertCreated();

        $this->assertSame(45, $product->fresh()->current_stock);
        $this->assertSame(1, $product->sales()->count());
        $this->assertSame(5, $product->sales()->first()->quantity);
    }

    public function test_penjualan_melebihi_stok_ditolak_dan_stok_tidak_berubah(): void
    {
        $product = $this->product(3);

        $this->sell($product, '2026-10-21', 5)->assertStatus(422)->assertJsonValidationErrors('quantity');

        $this->assertSame(3, $product->fresh()->current_stock);
        $this->assertSame(0, $product->sales()->count());
    }

    public function test_menghapus_penjualan_mengembalikan_stok(): void
    {
        $product = $this->product(50);
        $saleId = $this->sell($product, '2026-10-21', 8)->json('id');

        $this->deleteJson("/api/sales/{$saleId}")->assertNoContent();

        $this->assertSame(50, $product->fresh()->current_stock);
        $this->getJson("/api/products/{$product->id}/movements")->assertJsonMissing(['type' => 'terjual']);
    }

    public function test_penjualan_harian_dijumlah_per_minggu_dan_minggu_berjalan_tidak_dihitung(): void
    {
        $product = $this->product(500);
        foreach (['2026-09-28' => 4, '2026-09-30' => 6, '2026-10-05' => 3, '2026-10-09' => 9, '2026-10-12' => 10, '2026-10-18' => 2, '2026-10-20' => 7] as $date => $quantity) {
            $product->sales()->create(['sale_date' => $date, 'quantity' => $quantity]);
        }

        $this->getJson("/api/forecasts/{$product->id}")
            ->assertOk()
            ->assertJsonPath('weeks_of_data', 3)
            ->assertJsonPath('history.0.week_start', '2026-09-28')
            ->assertJsonPath('history.0.quantity', 10)
            ->assertJsonPath('history.1.quantity', 12)
            ->assertJsonPath('history.2.quantity', 12)
            ->assertJsonPath('forecast.week_start', '2026-10-19');
    }

    public function test_barang_masuk_rusak_dan_stok_opname_mengubah_stok(): void
    {
        $product = $this->product(20);
        $url = "/api/products/{$product->id}/movements";

        $this->postJson($url, ['type' => 'masuk', 'quantity' => 30, 'moved_on' => '2026-10-21'])->assertCreated();
        $this->assertSame(50, $product->fresh()->current_stock);

        $this->postJson($url, ['type' => 'rusak', 'quantity' => 4, 'moved_on' => '2026-10-21', 'note' => 'Kemasan sobek'])->assertCreated();
        $this->assertSame(46, $product->fresh()->current_stock);

        $this->postJson($url, ['type' => 'opname', 'quantity' => 40, 'moved_on' => '2026-10-21'])
            ->assertCreated()
            ->assertJsonPath('quantity', -6);
        $this->assertSame(40, $product->fresh()->current_stock);
    }

    public function test_barang_rusak_melebihi_stok_dan_tanggal_masa_depan_ditolak(): void
    {
        $product = $this->product(3);
        $url = "/api/products/{$product->id}/movements";

        $this->postJson($url, ['type' => 'rusak', 'quantity' => 5, 'moved_on' => '2026-10-21'])->assertStatus(422)->assertJsonValidationErrors('quantity');
        $this->postJson($url, ['type' => 'masuk', 'quantity' => 5, 'moved_on' => '2026-10-22'])->assertStatus(422)->assertJsonValidationErrors('moved_on');
        $this->postJson($url, ['type' => 'terjual', 'quantity' => 1, 'moved_on' => '2026-10-21'])->assertStatus(422)->assertJsonValidationErrors('type');
        $this->assertSame(3, $product->fresh()->current_stock);
    }

    public function test_produk_baru_mencatat_stok_awal_dan_stok_tidak_bisa_diubah_lewat_ubah_produk(): void
    {
        $id = $this->postJson('/api/products', ['sku' => 'B', 'name' => 'Barang B', 'unit' => 'pcs', 'current_stock' => 20, 'min_stock' => 5])
            ->assertCreated()
            ->json('id');

        $this->getJson("/api/products/{$id}/movements")->assertJsonPath('0.type', 'awal')->assertJsonPath('0.quantity', 20);

        $this->putJson("/api/products/{$id}", ['sku' => 'B', 'name' => 'Barang B baru', 'unit' => 'pcs', 'current_stock' => 999, 'min_stock' => 5])->assertOk();
        $this->assertSame(20, Product::find($id)->current_stock);
    }

    public function test_impor_csv_hanya_mengurangi_stok_kalau_diminta(): void
    {
        $product = $this->product(100);
        $csv = "sku,date,quantity\nA,2026-10-19,10\n";

        $this->post('/api/sales/import', ['file' => UploadedFile::fake()->createWithContent('a.csv', $csv)], ['Accept' => 'application/json'])->assertOk();
        $this->assertSame(100, $product->fresh()->current_stock);

        $csv = "sku,date,quantity\nA,2026-10-20,15\n";
        $this->post('/api/sales/import', ['file' => UploadedFile::fake()->createWithContent('b.csv', $csv), 'reduce_stock' => '1'], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJson(['imported' => 1]);
        $this->assertSame(85, $product->fresh()->current_stock);
    }

    public function test_menghapus_penjualan_impor_tanpa_kurangi_stok_tidak_mengubah_stok(): void
    {
        $product = $this->product(100);
        $csv = "sku,date,quantity\nA,2026-10-19,10\n";
        $this->post('/api/sales/import', ['file' => UploadedFile::fake()->createWithContent('a.csv', $csv)], ['Accept' => 'application/json'])->assertOk();

        $this->deleteJson('/api/sales/'.$product->sales()->first()->id)->assertNoContent();

        $this->assertSame(100, $product->fresh()->current_stock);
        $this->assertSame(0, $product->sales()->count());
    }

    public function test_dashboard_menampilkan_stok_menipis(): void
    {
        $this->product(4, 5);
        $this->user->products()->create(['sku' => 'C', 'name' => 'Barang C', 'unit' => 'pcs', 'current_stock' => 50, 'min_stock' => 5]);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonCount(1, 'low_stock')
            ->assertJsonPath('low_stock.0.sku', 'A');
    }

    public function test_riwayat_stok_produk_akun_lain_tidak_bisa_dibuka(): void
    {
        $other = User::factory()->create()->products()->create(['sku' => 'X', 'name' => 'Punya orang', 'unit' => 'pcs', 'current_stock' => 5]);

        $this->getJson("/api/products/{$other->id}/movements")->assertNotFound();
        $this->postJson("/api/products/{$other->id}/movements", ['type' => 'masuk', 'quantity' => 1, 'moved_on' => '2026-10-21'])->assertNotFound();
    }
}
