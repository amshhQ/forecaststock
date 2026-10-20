<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-21');
    }

    private function demoUser(): User
    {
        $this->seed(DatabaseSeeder::class);

        return User::where('email', DatabaseSeeder::DEMO_EMAIL)->first();
    }

    public function test_login_dengan_akun_demo_menghasilkan_token(): void
    {
        $this->demoUser();

        $this->postJson('/api/login', ['email' => DatabaseSeeder::DEMO_EMAIL, 'password' => DatabaseSeeder::DEMO_PASSWORD])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_login_password_salah_ditolak(): void
    {
        $this->demoUser();

        $this->postJson('/api/login', ['email' => DatabaseSeeder::DEMO_EMAIL, 'password' => 'salah'])
            ->assertStatus(422);
    }

    public function test_endpoint_data_butuh_login(): void
    {
        $this->getJson('/api/products')->assertUnauthorized();
    }

    public function test_pengguna_tidak_bisa_melihat_produk_milik_akun_lain(): void
    {
        $demo = $this->demoUser();
        $productId = $demo->products()->first()->id;

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/products')->assertOk()->assertJsonCount(0);
        $this->getJson("/api/products/{$productId}")->assertNotFound();
    }

    public function test_prediksi_sama_dengan_hasil_script_python(): void
    {
        Sanctum::actingAs($this->demoUser());

        $rows = collect($this->getJson('/api/forecasts')->assertOk()->json())->keyBy('product.sku');
        $expected = $this->expectedForecasts();

        $this->assertCount(count($expected), $rows->filter(fn ($row) => $row['forecast'] !== null));
        foreach ($expected as $sku => $line) {
            $this->assertSame($line['week_start'], $rows[$sku]['forecast']['week_start'], $sku);
            $this->assertEqualsWithDelta((float) $line['forecast'], $rows[$sku]['forecast']['value'], 0.01, $sku);
            $this->assertEqualsWithDelta((float) $line['mape'], $rows[$sku]['accuracy']['mape'], 0.01, $sku);
        }
    }

    public function test_data_demo_memuat_semua_status_stok(): void
    {
        Sanctum::actingAs($this->demoUser());

        $status = $this->getJson('/api/dashboard')->assertOk()->json('status');

        foreach (['perlu_restock', 'aman', 'berlebih', 'data_kurang'] as $key) {
            $this->assertGreaterThan(0, $status[$key], $key);
        }
    }

    /** @return array<string, array<string, string>> */
    private function expectedForecasts(): array
    {
        $file = fopen(dirname(__DIR__, 3).'/scripts/forecast/expected_forecast.csv', 'r');
        $header = fgetcsv($file, escape: '');
        $rows = [];
        while (($line = fgetcsv($file, escape: '')) !== false) {
            $row = array_combine($header, $line);
            $rows[$row['sku']] = $row;
        }
        fclose($file);

        return $rows;
    }

    public function test_detail_prediksi_memuat_riwayat_dan_garis_tren(): void
    {
        $demo = $this->demoUser();
        Sanctum::actingAs($demo);
        $productId = $demo->products()->where('sku', 'BRS-5KG')->first()->id;

        $this->getJson("/api/forecasts/{$productId}")
            ->assertOk()
            ->assertJsonCount(104, 'history')
            ->assertJsonStructure(['history' => [['week_start', 'quantity', 'trend']]]);
    }

    public function test_rekomendasi_dengan_skenario_menaikkan_prediksi(): void
    {
        $demo = $this->demoUser();
        Sanctum::actingAs($demo);
        $lebaran = $demo->scenarios()->where('name', 'Menjelang Lebaran')->first();

        $normal = collect($this->getJson('/api/recommendations')->json('items'))->firstWhere('product.sku', 'BRS-5KG');
        $naik = collect($this->getJson("/api/recommendations?scenario_id={$lebaran->id}")->json('items'))->firstWhere('product.sku', 'BRS-5KG');

        $this->assertEqualsWithDelta($normal['forecast']['value'] * 1.25, $naik['adjusted_forecast'], 0.01);
        $this->assertGreaterThanOrEqual($normal['recommended_quantity'], $naik['recommended_quantity']);
    }

    public function test_tanggal_penjualan_harus_hari_senin(): void
    {
        $demo = $this->demoUser();
        Sanctum::actingAs($demo);

        $this->postJson('/api/sales', [
            'product_id' => $demo->products()->first()->id,
            'week_start' => '2026-10-20',
            'quantity' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors('week_start');
    }

    public function test_impor_csv_menyimpan_baris_valid_dan_melaporkan_baris_salah(): void
    {
        Sanctum::actingAs($this->demoUser());

        $csv = "sku,week_start,quantity\n"
            ."BRS-5KG,2026-10-12,50\n"
            ."TIDAK-ADA,2026-10-12,5\n"
            ."MIE-INS,2026-10-13,5\n"
            ."AIR-600,2026-10-12,abc\n"
            ."MYK-1L,2026-10-19,5\n";

        $this->post('/api/sales/import', ['file' => UploadedFile::fake()->createWithContent('penjualan.csv', $csv)], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJson(['imported' => 1])
            ->assertJsonCount(4, 'errors')
            ->assertJsonPath('errors.3.message', 'Minggu ini belum selesai')
            ->assertJsonPath('errors.0.line', 3);
    }

    public function test_dashboard_menampilkan_ringkasan(): void
    {
        Sanctum::actingAs($this->demoUser());

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('total_products', 11)
            ->assertJsonPath('last_week', '2026-10-12')
            ->assertJsonCount(5, 'top_forecasts');
    }

    public function test_penjualan_minggu_yang_belum_terjadi_ditolak(): void
    {
        $demo = $this->demoUser();
        Sanctum::actingAs($demo);

        $this->postJson('/api/sales', [
            'product_id' => $demo->products()->first()->id,
            'week_start' => '2026-10-26',
            'quantity' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors('week_start');
    }

    public function test_pesan_validasi_berbahasa_indonesia(): void
    {
        Sanctum::actingAs($this->demoUser());

        $this->postJson('/api/products', [])
            ->assertStatus(422)
            ->assertJsonPath('errors.sku.0', 'SKU wajib diisi.');
    }

    public function test_impor_csv_pemisah_titik_koma_dari_excel(): void
    {
        Sanctum::actingAs($this->demoUser());

        $csv = "sku;week_start;quantity\nBRS-5KG;2026-10-12;50\n";

        $this->post('/api/sales/import', ['file' => UploadedFile::fake()->createWithContent('excel.csv', $csv)], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJson(['imported' => 1, 'errors' => []]);
    }

    public function test_impor_csv_tanpa_data_ditolak(): void
    {
        Sanctum::actingAs($this->demoUser());

        $this->post('/api/sales/import', ['file' => UploadedFile::fake()->createWithContent('kosong.csv', "sku,week_start,quantity\n")], ['Accept' => 'application/json'])
            ->assertStatus(422);
    }

    public function test_produk_bisa_diurutkan_dari_stok_terbanyak(): void
    {
        Sanctum::actingAs($this->demoUser());

        $this->getJson('/api/products?sort=current_stock&direction=desc')
            ->assertOk()
            ->assertJsonPath('0.sku', 'KPI-SCT');
    }

    public function test_kolom_urutan_yang_tidak_dikenal_ditolak(): void
    {
        Sanctum::actingAs($this->demoUser());

        $this->getJson('/api/products?sort=password')->assertStatus(422);
    }

    public function test_reset_data_demo_mengembalikan_kondisi_awal(): void
    {
        $demo = $this->demoUser();
        Sanctum::actingAs($demo);
        $demo->products()->first()->delete();

        $this->postJson('/api/demo/reset')->assertOk();

        $this->assertSame(11, $demo->products()->count());
        $this->assertSame(967, Sale::count());
    }

    public function test_reset_data_demo_ditolak_untuk_akun_biasa(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/demo/reset')->assertForbidden();
    }
}
