<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StockForecastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ForecastController extends Controller
{
    public function __construct(private StockForecastService $forecasts) {}

    public function index(Request $request): JsonResponse
    {
        $rows = $this->forecasts->forProducts($this->productsWithSales($request));
        usort($rows, fn ($x, $y) => ($y['forecast']['value'] ?? -1) <=> ($x['forecast']['value'] ?? -1));

        return response()->json($rows);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $product = $request->user()->products()->with('sales')->findOrFail($id);

        $row = $this->forecasts->forProduct($product);
        $a = $row['forecast']['a'] ?? null;
        $b = $row['forecast']['b'] ?? null;

        $row['history'] = array_map(fn ($week, $x) => [
            'week_start' => $week[0],
            'quantity' => $week[1],
            'trend' => $a === null ? null : round($a + $b * $x, 2),
        ], $weeks = $this->forecasts->weeklySales($product), array_keys($weeks));

        return response()->json($row);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $request->validate([
            'scenario_id' => ['nullable', Rule::exists('scenarios', 'id')->where('user_id', $request->user()->id)],
        ]);
        $scenario = $request->query('scenario_id')
            ? $request->user()->scenarios()->find($request->query('scenario_id'))
            : null;

        return response()->json([
            'scenario' => $scenario,
            'items' => $this->forecasts->forProducts($this->productsWithSales($request), $scenario),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $products = $this->productsWithSales($request);
        $rows = $this->forecasts->forProducts($products);
        $withForecast = array_values(array_filter($rows, fn ($r) => $r['forecast'] !== null));
        usort($withForecast, fn ($x, $y) => $y['forecast']['value'] <=> $x['forecast']['value']);

        $statusCount = array_count_values(array_column($rows, 'status'));
        $weeks = array_merge(...array_map(fn ($product) => array_column($this->forecasts->weeklySales($product), 0), $products->all()));

        return response()->json([
            'total_products' => count($rows),
            'status' => [
                'perlu_restock' => $statusCount['perlu_restock'] ?? 0,
                'berlebih' => $statusCount['berlebih'] ?? 0,
                'aman' => $statusCount['aman'] ?? 0,
                'data_kurang' => $statusCount['data_kurang'] ?? 0,
            ],
            'last_week' => $weeks ? max($weeks) : null,
            'top_forecasts' => array_slice($withForecast, 0, 5),
            'needs_restock' => array_values(array_filter($rows, fn ($r) => $r['status'] === 'perlu_restock')),
            'low_stock' => $products
                ->filter(fn ($p) => $p->current_stock <= $p->min_stock)
                ->map(fn ($p) => $p->only(['id', 'sku', 'name', 'unit', 'current_stock', 'min_stock']))
                ->values(),
        ]);
    }

    private function productsWithSales(Request $request)
    {
        return $request->user()->products()
            ->with('sales')
            ->orderBy('name')
            ->get();
    }
}
