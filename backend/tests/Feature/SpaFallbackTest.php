<?php

namespace Tests\Feature;

use Tests\TestCase;

class SpaFallbackTest extends TestCase
{
    public function test_rute_halaman_react_tidak_404_saat_direfresh(): void
    {
        $this->get('/')->assertOk();
        $this->get('/prediksi/3')->assertOk();
        $this->get('/penjualan')->assertOk();
    }

    public function test_rute_react_mengembalikan_index_html_hasil_build(): void
    {
        $spa = public_path('index.html');
        $created = ! is_file($spa);
        if ($created) {
            file_put_contents($spa, '<div id="root"></div>');
        }

        try {
            $this->get('/rekomendasi')->assertOk()->assertSee('<div id="root"></div>', false);
        } finally {
            if ($created) {
                unlink($spa);
            }
        }
    }

    public function test_rute_api_yang_tidak_ada_tetap_404(): void
    {
        $this->getJson('/api/tidak-ada')->assertNotFound();
    }
}
