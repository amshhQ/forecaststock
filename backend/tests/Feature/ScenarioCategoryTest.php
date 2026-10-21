<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScenarioCategoryTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    private function productIn(?int $categoryId, string $sku): void
    {
        $product = $this->user->products()->create(['sku' => $sku, 'name' => $sku, 'unit' => 'pcs', 'category_id' => $categoryId]);
        $start = Carbon::parse('2026-09-07');
        foreach ([10, 10, 10, 10] as $i => $quantity) {
            $product->sales()->create(['sale_date' => $start->copy()->addWeeks($i), 'quantity' => $quantity]);
        }
    }

    public function test_skenario_kategori_hanya_mengubah_produk_di_kategori_itu(): void
    {
        $minuman = $this->user->categories()->create(['name' => 'Minuman']);
        $sembako = $this->user->categories()->create(['name' => 'Sembako']);
        $this->productIn($minuman->id, 'AIR');
        $this->productIn($sembako->id, 'BRS');

        $scenario = $this->postJson('/api/scenarios', ['name' => 'Kemarau panjang', 'adjustment_percent' => 50, 'category_id' => $minuman->id])
            ->assertCreated()
            ->json();

        $items = collect($this->getJson("/api/recommendations?scenario_id={$scenario['id']}")->assertOk()->json('items'));

        $this->assertEquals(15, $items->firstWhere('product.sku', 'AIR')['adjusted_forecast']);
        $this->assertEquals(10, $items->firstWhere('product.sku', 'BRS')['adjusted_forecast']);
        $this->assertEquals(0, $items->firstWhere('product.sku', 'BRS')['adjustment_percent']);
    }

    public function test_skenario_tanpa_kategori_berlaku_untuk_semua_produk(): void
    {
        $this->productIn(null, 'AIR');
        $scenario = $this->postJson('/api/scenarios', ['name' => 'Promo', 'adjustment_percent' => 50])->assertCreated()->json();

        $items = $this->getJson("/api/recommendations?scenario_id={$scenario['id']}")->json('items');

        $this->assertEquals(15, $items[0]['adjusted_forecast']);
        $this->assertEquals(15, $items[0]['target_stock']);
    }

    public function test_kategori_milik_akun_lain_ditolak(): void
    {
        $other = User::factory()->create()->categories()->create(['name' => 'Punya orang']);

        $this->postJson('/api/scenarios', ['name' => 'Uji', 'adjustment_percent' => 10, 'category_id' => $other->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('category_id');
    }
}
