<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use InvalidArgumentException;

class TrendMomentService
{
    public const MIN_WEEKS_FOR_SEASON = 52;

    public const BACKTEST_WEEKS = 8;

    /**
     * @param  list<int|float>  $values
     * @return array{0: float, 1: float}
     */
    public function coefficients(array $values): array
    {
        $n = count($values);
        if ($n < 2) {
            throw new InvalidArgumentException('Butuh data minimal 2 minggu untuk menghitung tren');
        }

        $sumX = $sumY = $sumXY = $sumX2 = 0;
        foreach (array_values($values) as $x => $y) {
            $sumX += $x;
            $sumY += $y;
            $sumXY += $x * $y;
            $sumX2 += $x * $x;
        }

        $b = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
        $a = ($sumY - $b * $sumX) / $n;

        return [$a, $b];
    }

    /**
     * @param  list<array{0: string, 1: int}>  $weeks
     * @return array<int, float>
     */
    public function seasonalIndices(array $weeks): array
    {
        if (count($weeks) < self::MIN_WEEKS_FOR_SEASON) {
            return [];
        }

        $totals = $counts = [];
        $grandTotal = 0;
        foreach ($weeks as [$weekStart, $quantity]) {
            $month = CarbonImmutable::parse($weekStart)->month;
            $totals[$month] = ($totals[$month] ?? 0) + $quantity;
            $counts[$month] = ($counts[$month] ?? 0) + 1;
            $grandTotal += $quantity;
        }

        $overallAverage = $grandTotal / count($weeks);
        if ($overallAverage == 0) {
            return [];
        }

        $indices = [];
        foreach ($totals as $month => $total) {
            $indices[$month] = ($total / $counts[$month]) / $overallAverage;
        }

        return $indices;
    }

    /**
     * @param  list<array{0: string, 1: int}>  $weeks
     * @return array{week_start: string, x: int, a: float, b: float, trend: float, seasonal_index: float, forecast: float}
     */
    public function forecastNextWeek(array $weeks): array
    {
        [$a, $b] = $this->coefficients(array_column($weeks, 1));

        $x = count($weeks);
        $weekStart = CarbonImmutable::parse(end($weeks)[0])->addWeek();
        $trend = $a + $b * $x;

        $indices = $this->seasonalIndices($weeks);
        $seasonalIndex = $indices[$weekStart->month] ?? 1.0;

        return [
            'week_start' => $weekStart->toDateString(),
            'x' => $x,
            'a' => $a,
            'b' => $b,
            'trend' => $trend,
            'seasonal_index' => $seasonalIndex,
            'forecast' => max(0, $trend * $seasonalIndex),
        ];
    }

    /**
     * @param  list<array{0: string, 1: int}>  $weeks
     * @return array{weeks: int, rows: list<array{week_start: string, actual: int, forecast: float, error_percent: ?float}>, mape: ?float}|null
     */
    public function backtest(array $weeks, int $holdout = self::BACKTEST_WEEKS): ?array
    {
        if (count($weeks) < $holdout + 2) {
            return null;
        }

        $rows = $errors = [];
        for ($i = count($weeks) - $holdout; $i < count($weeks); $i++) {
            [$weekStart, $actual] = $weeks[$i];
            $forecast = $this->forecastNextWeek(array_slice($weeks, 0, $i))['forecast'];
            $errorPercent = null;
            if ($actual > 0) {
                $errorPercent = abs($actual - $forecast) / $actual * 100;
                $errors[] = $errorPercent;
            }
            $rows[] = ['week_start' => $weekStart, 'actual' => $actual, 'forecast' => $forecast, 'error_percent' => $errorPercent];
        }

        return [
            'weeks' => $holdout,
            'rows' => $rows,
            'mape' => $errors ? array_sum($errors) / count($errors) : null,
        ];
    }
}
