<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StockLedger;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockMovementController extends Controller
{
    public function __construct(private StockLedger $ledger) {}

    public function index(Request $request, int $id): JsonResponse
    {
        $product = $request->user()->products()->findOrFail($id);

        return response()->json(
            $product->movements()->orderByDesc('moved_on')->orderByDesc('id')->limit(200)->get()
        );
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $product = $request->user()->products()->findOrFail($id);
        $data = $request->validate([
            'type' => ['required', Rule::in(['masuk', 'rusak', 'opname'])],
            'quantity' => ['required', 'integer', $request->input('type') === 'opname' ? 'min:0' : 'min:1', 'max:1000000'],
            'moved_on' => ['required', 'date_format:Y-m-d', function (string $attribute, mixed $value, Closure $fail) {
                if (CarbonImmutable::parse($value)->greaterThan(CarbonImmutable::today())) {
                    $fail('Tanggal ini belum terjadi.');
                }
            }],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $movement = $this->ledger->move($product, $data['type'], $data['quantity'], $data['moved_on'], $data['note'] ?? null);

        return response()->json([...$movement->toArray(), 'current_stock' => $product->fresh()->current_stock], 201);
    }
}
