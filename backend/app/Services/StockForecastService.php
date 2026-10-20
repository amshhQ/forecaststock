<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Scenario;
use Illuminate\Support\Collection;

class StockForecastService
{
    public const OVERSTOCK_WEEKS = 2;

    public function __construct(private TrendMomentService $trendMoment) {}

    /**
     * @param  Collection<int, Product>  $products
     * @return list<array<string, mixed>>
     */
    public function forProducts(Collection $products, ?Scenario $scenario = null): array
    {
        return $products->map(fn (Product $product) => $this->forProduct($product, $scenario))->values()->all();
    }

    /** @return array<string, mixed> */
    public function forProduct(Product $product, ?Scenario $scenario = null): array
    {
        $weeks = $product->sales
            ->sortBy('week_start')
            ->map(fn ($sale) => [$sale->week_start->toDateString(), $sale->quantity])
            ->values()
            ->all();

        $row = [
            'product' => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'unit' => $product->unit,
                'current_stock' => $product->current_stock,
                'min_stock' => $product->min_stock,
            ],
            'weeks_of_data' => count($weeks),
            'forecast' => null,
            'accuracy' => null,
            'adjustment_percent' => $this->appliesTo($scenario, $product) ? (float) $scenario->adjustment_percent : 0.0,
            'adjusted_forecast' => null,
            'target_stock' => null,
            'recommended_quantity' => null,
            'status' => 'data_kurang',
        ];

        if (count($weeks) < 2) {
            return $row;
        }

        $forecast = $this->trendMoment->forecastNextWeek($weeks);
        $adjusted = max(0, $forecast['forecast'] * (1 + $row['adjustment_percent'] / 100));
        $recommended = $this->recommendedQuantity($adjusted, $product->min_stock, $product->current_stock);

        $row['forecast'] = [
            'week_start' => $forecast['week_start'],
            'a' => round($forecast['a'], 4),
            'b' => round($forecast['b'], 4),
            'trend' => round($forecast['trend'], 2),
            'seasonal_index' => round($forecast['seasonal_index'], 4),
            'value' => round($forecast['forecast'], 2),
        ];
        $accuracy = $this->trendMoment->backtest($weeks);
        $row['accuracy'] = $accuracy === null ? null : [
            'weeks' => $accuracy['weeks'],
            'mape' => $accuracy['mape'] === null ? null : round($accuracy['mape'], 2),
            'rows' => array_map(fn ($r) => [
                'week_start' => $r['week_start'],
                'actual' => $r['actual'],
                'forecast' => round($r['forecast'], 2),
                'error_percent' => $r['error_percent'] === null ? null : round($r['error_percent'], 2),
            ], $accuracy['rows']),
        ];
        $row['adjusted_forecast'] = round($adjusted, 2);
        $row['target_stock'] = $this->targetStock($adjusted, $product->min_stock);
        $row['recommended_quantity'] = $recommended;
        $row['status'] = $this->status($recommended, $adjusted, $product->min_stock, $product->current_stock);

        return $row;
    }

    public function targetStock(float $adjustedForecast, int $minStock): int
    {
        return (int) ceil($adjustedForecast) + $minStock;
    }

    public function recommendedQuantity(float $adjustedForecast, int $minStock, int $currentStock): int
    {
        return max(0, $this->targetStock($adjustedForecast, $minStock) - $currentStock);
    }

    private function appliesTo(?Scenario $scenario, Product $product): bool
    {
        return $scenario !== null && ($scenario->category_id === null || $scenario->category_id === $product->category_id);
    }

    public function status(int $recommended, float $adjustedForecast, int $minStock, int $currentStock): string
    {
        if ($recommended > 0) {
            return 'perlu_restock';
        }
        if ($currentStock - $minStock > self::OVERSTOCK_WEEKS * $adjustedForecast) {
            return 'berlebih';
        }

        return 'aman';
    }
}
