<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreTest extends TestCase
{
    use RefreshDatabase;

    private function registerData(array $override = []): array
    {
        return [
            'name' => 'Bu Sari',
            'store_name' => 'Toko Bangunan Sari',
            'business_type' => 'bangunan',
            'email' => 'sari@contoh.test',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
            ...$override,
        ];
    }

    public function test_daftar_jenis_usaha_bisa_dilihat_tanpa_login(): void
    {
        $this->getJson('/api/business-types')
            ->assertOk()
            ->assertJsonFragment(['value' => 'kelontong'])
            ->assertJsonFragment(['value' => 'bangunan'])
            ->assertJsonStructure([['value', 'label', 'units']]);
    }

    public function test_daftar_akun_baru_langsung_dapat_token_dan_data_toko(): void
    {
        $this->postJson('/api/register', $this->registerData())
            ->assertCreated()
            ->assertJsonPath('user.store_name', 'Toko Bangunan Sari')
            ->assertJsonPath('user.business_type', 'bangunan')
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'store_name', 'business_type', 'business_label']]);
    }

    public function test_akun_baru_dapat_kategori_awal_sesuai_jenis_usaha(): void
    {
        $this->postJson('/api/register', $this->registerData())->assertCreated();

        $categories = User::where('email', 'sari@contoh.test')->first()->categories()->pluck('name')->all();
        $this->assertEqualsCanonicalizing(config('business.types.bangunan.categories'), $categories);
    }

    public function test_daftar_ditolak_kalau_email_sudah_dipakai(): void
    {
        User::factory()->create(['email' => 'sari@contoh.test']);

        $this->postJson('/api/register', $this->registerData())
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_daftar_ditolak_kalau_password_pendek_atau_tidak_sama(): void
    {
        $this->postJson('/api/register', $this->registerData(['password' => 'abc', 'password_confirmation' => 'abc']))
            ->assertJsonValidationErrors('password');

        $this->postJson('/api/register', $this->registerData(['password_confirmation' => 'beda12345']))
            ->assertJsonValidationErrors('password');
    }

    public function test_daftar_ditolak_kalau_jenis_usaha_tidak_dikenal(): void
    {
        $this->postJson('/api/register', $this->registerData(['business_type' => 'kapal']))
            ->assertJsonValidationErrors('business_type');
    }

    public function test_pemilik_bisa_mengubah_pengaturan_toko(): void
    {
        $user = User::factory()->create(['store_name' => 'Warung Lama', 'business_type' => 'kelontong']);
        Sanctum::actingAs($user);

        $this->putJson('/api/store', ['name' => 'Pak Budi', 'store_name' => 'Warung Baru', 'business_type' => 'makanan'])
            ->assertOk()
            ->assertJsonPath('store_name', 'Warung Baru')
            ->assertJsonPath('business_label', config('business.types.makanan.label'));

        $this->assertSame('Pak Budi', $user->fresh()->name);
    }

    public function test_ubah_jenis_usaha_tidak_menghapus_kategori_yang_sudah_ada(): void
    {
        $user = User::factory()->create(['business_type' => 'kelontong']);
        $user->categories()->create(['name' => 'Sembako']);
        Sanctum::actingAs($user);

        $this->putJson('/api/store', ['name' => $user->name, 'store_name' => 'Toko', 'business_type' => 'pakaian'])->assertOk();

        $this->assertSame(['Sembako'], $user->categories()->pluck('name')->all());
    }

    public function test_pengaturan_toko_butuh_login(): void
    {
        $this->putJson('/api/store', ['store_name' => 'X'])->assertUnauthorized();
    }
}
