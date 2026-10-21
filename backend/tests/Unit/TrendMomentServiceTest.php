<?php

namespace Tests\Unit;

use App\Services\TrendMomentService;
use Carbon\CarbonImmutable;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class TrendMomentServiceTest extends TestCase
{
    private TrendMomentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new TrendMomentService;
    }

    /** @return list<array{0: string, 1: int}> */
    private function weeks(string $firstMonday, array $quantities): array
    {
        $start = CarbonImmutable::parse($firstMonday);

        return array_map(
            fn ($quantity, $i) => [$start->addWeeks($i)->toDateString(), $quantity],
            $quantities,
            array_keys($quantities),
        );
    }

    public function test_garis_lurus_menghasilkan_a_dan_b_tepat(): void
    {
        [$a, $b] = $this->service->coefficients([10, 12, 14, 16]);

        $this->assertEqualsWithDelta(10, $a, 1e-9);
        $this->assertEqualsWithDelta(2, $b, 1e-9);
    }

    public function test_data_tidak_lurus_sesuai_hitungan_manual(): void
    {
        [$a, $b] = $this->service->coefficients([5, 7, 6, 10]);

        $this->assertEqualsWithDelta(4.9, $a, 1e-9);
        $this->assertEqualsWithDelta(1.4, $b, 1e-9);
    }

    public function test_data_kurang_dari_dua_minggu_ditolak(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->service->coefficients([10]);
    }

    public function test_indeks_musim_sesuai_hitungan_manual(): void
    {
        $indices = $this->service->seasonalIndices(
            $this->weeks('2025-01-06', array_merge(array_fill(0, 4, 10), array_fill(0, 48, 20)))
        );

        $this->assertEqualsWithDelta(0.52, $indices[1], 1e-9);
        $this->assertEqualsWithDelta(1.04, $indices[6], 1e-9);
        $this->assertCount(12, $indices);
    }

    public function test_indeks_musim_tidak_dipakai_jika_kurang_dari_52_minggu(): void
    {
        $this->assertSame([], $this->service->seasonalIndices($this->weeks('2026-01-05', [10, 12, 14])));
    }

    public function test_indeks_musim_kosong_kalau_semua_penjualan_nol(): void
    {
        $this->assertSame([], $this->service->seasonalIndices($this->weeks('2025-01-06', array_fill(0, 52, 0))));
    }

    public function test_prediksi_minggu_depan_tanpa_indeks_musim(): void
    {
        $result = $this->service->forecastNextWeek($this->weeks('2026-01-05', [10, 12, 14, 16]));

        $this->assertSame('2026-02-02', $result['week_start']);
        $this->assertSame(4, $result['x']);
        $this->assertEqualsWithDelta(18, $result['trend'], 1e-9);
        $this->assertEqualsWithDelta(1.0, $result['seasonal_index'], 1e-9);
        $this->assertEqualsWithDelta(18, $result['forecast'], 1e-9);
    }

    public function test_prediksi_tidak_pernah_negatif(): void
    {
        $result = $this->service->forecastNextWeek($this->weeks('2026-01-05', [30, 15, 0]));

        $this->assertEqualsWithDelta(-15, $result['trend'], 1e-9);
        $this->assertEquals(0, $result['forecast']);
    }

    public function test_uji_mundur_sesuai_hitungan_manual(): void
    {
        $result = $this->service->backtest($this->weeks('2026-01-05', [5, 7, 6, 10, 9]), 2);

        $this->assertSame(2, $result['weeks']);
        $this->assertSame('2026-01-26', $result['rows'][0]['week_start']);
        $this->assertEqualsWithDelta(7, $result['rows'][0]['forecast'], 1e-9);
        $this->assertEqualsWithDelta(30, $result['rows'][0]['error_percent'], 1e-9);
        $this->assertEqualsWithDelta(10.5, $result['rows'][1]['forecast'], 1e-9);
        $this->assertEqualsWithDelta(16.6667, $result['rows'][1]['error_percent'], 1e-4);
        $this->assertEqualsWithDelta(23.3333, $result['mape'], 1e-4);
    }

    public function test_uji_mundur_butuh_data_lebih_dari_minggu_uji(): void
    {
        $this->assertNull($this->service->backtest($this->weeks('2026-01-05', [5, 7, 6, 10, 9]), 4));
    }

    public function test_uji_mundur_melewati_minggu_tanpa_penjualan(): void
    {
        $result = $this->service->backtest($this->weeks('2026-01-05', [4, 4, 0]), 1);

        $this->assertNull($result['rows'][0]['error_percent']);
        $this->assertNull($result['mape']);
    }

    public function test_hasil_sama_dengan_script_python(): void
    {
        $dir = dirname(__DIR__, 3).'/scripts/forecast';
        $weeksBySku = [];
        foreach ($this->readCsv("$dir/sample_sales.csv") as $row) {
            $monday = CarbonImmutable::parse($row['date'])->startOfWeek(CarbonImmutable::MONDAY)->toDateString();
            $weeksBySku[$row['sku']][$monday] = ($weeksBySku[$row['sku']][$monday] ?? 0) + (int) $row['quantity'];
        }
        $weeksBySku = array_map(function (array $totals) {
            ksort($totals);

            return array_map(null, array_keys($totals), array_values($totals));
        }, $weeksBySku);

        $expectedRows = $this->readCsv("$dir/expected_forecast.csv");
        $this->assertCount(count(array_filter($weeksBySku, fn ($weeks) => count($weeks) >= 2)), $expectedRows);

        foreach ($expectedRows as $expected) {
            $result = $this->service->forecastNextWeek($weeksBySku[$expected['sku']]);

            $this->assertSame($expected['week_start'], $result['week_start'], $expected['sku']);
            foreach (['a', 'b', 'trend', 'seasonal_index', 'forecast'] as $field) {
                $this->assertEqualsWithDelta((float) $expected[$field], $result[$field], 0.0001, "{$expected['sku']} $field");
            }
            $mape = $this->service->backtest($weeksBySku[$expected['sku']])['mape'];
            $this->assertEqualsWithDelta((float) $expected['mape'], $mape, 0.0001, "{$expected['sku']} mape");
        }
    }

    /** @return list<array<string, string>> */
    private function readCsv(string $path): array
    {
        $file = fopen($path, 'r');
        $header = fgetcsv($file, escape: '');
        $rows = [];
        while (($line = fgetcsv($file, escape: '')) !== false) {
            $rows[] = array_combine($header, $line);
        }
        fclose($file);

        return $rows;
    }
}
