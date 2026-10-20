<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Throwable;

class SaleController extends Controller
{
    public const MAX_QUANTITY = 1000000;

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['nullable', 'integer'],
            'sort' => ['nullable', Rule::in(['week_start', 'quantity'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $query = Sale::query()
            ->whereIn('product_id', $request->user()->products()->select('id'))
            ->with('product:id,sku,name,unit')
            ->orderBy($request->query('sort', 'week_start'), $request->query('direction', 'desc'))
            ->orderBy('product_id');

        if ($productId = $request->query('product_id')) {
            $query->where('product_id', $productId);
        }

        return response()->json($query->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', Rule::exists('products', 'id')->where('user_id', $request->user()->id)],
            'week_start' => ['required', 'date_format:Y-m-d', $this->weekStartRule()],
            'quantity' => ['required', 'integer', 'min:0', 'max:'.self::MAX_QUANTITY],
        ]);

        $sale = Sale::updateOrCreate(
            ['product_id' => $data['product_id'], 'week_start' => $data['week_start']],
            ['quantity' => $data['quantity']],
        );

        return response()->json($sale->load('product:id,sku,name,unit'), 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        Sale::whereIn('product_id', $request->user()->products()->select('id'))->findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:1024']]);

        $productIds = $request->user()->products()->pluck('id', 'sku')->all();
        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $firstLine = (string) fgets($handle);

        $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';
        $header = array_map(
            fn ($h) => strtolower(trim((string) $h, " \t\n\r\0\x0B\xEF\xBB\xBF")),
            str_getcsv($firstLine, $delimiter, escape: '')
        );

        $missing = array_diff(['sku', 'week_start', 'quantity'], $header);
        if (trim($firstLine) === '' || $missing) {
            fclose($handle);
            $message = trim($firstLine) === ''
                ? 'File kosong.'
                : 'Kolom wajib tidak ada: '.implode(', ', $missing).'. Baris pertama harus berisi nama kolom.';

            return response()->json(['message' => $message], 422);
        }

        $imported = 0;
        $errors = [];
        $line = 1;
        while (($values = fgetcsv($handle, null, $delimiter, escape: '')) !== false) {
            $line++;
            if ($values === [null]) {
                continue;
            }
            $row = array_combine($header, array_slice(array_pad($values, count($header), null), 0, count($header)));
            $error = $this->importRowError($row, $productIds);
            if ($error) {
                $errors[] = ['line' => $line, 'message' => $error];

                continue;
            }
            Sale::updateOrCreate(
                ['product_id' => $productIds[trim($row['sku'])], 'week_start' => trim($row['week_start'])],
                ['quantity' => (int) trim($row['quantity'])],
            );
            $imported++;
        }
        fclose($handle);

        if ($imported === 0 && $errors === []) {
            return response()->json(['message' => 'File hanya berisi nama kolom, belum ada data.'], 422);
        }

        return response()->json(['imported' => $imported, 'errors' => $errors]);
    }

    /** @param  array<string, int>  $productIds */
    private function importRowError(array $row, array $productIds): ?string
    {
        $sku = trim((string) $row['sku']);
        if ($sku === '') {
            return 'SKU kosong';
        }
        if (! isset($productIds[$sku])) {
            return "SKU \"$sku\" belum terdaftar di daftar produk";
        }

        $weekStart = trim((string) $row['week_start']);
        try {
            $date = CarbonImmutable::createFromFormat('!Y-m-d', $weekStart);
        } catch (Throwable) {
            $date = false;
        }
        if (! $date || $date->toDateString() !== $weekStart) {
            return 'Tanggal harus berformat YYYY-MM-DD, misalnya 2026-10-12';
        }
        if (! $date->isMonday()) {
            return 'Tanggal awal minggu harus hari Senin';
        }
        if ($date->greaterThanOrEqualTo($this->currentMonday())) {
            return 'Minggu ini belum selesai';
        }

        $quantity = trim((string) $row['quantity']);
        if (! ctype_digit($quantity)) {
            return 'Jumlah harus bilangan bulat 0 atau lebih';
        }
        if ((int) $quantity > self::MAX_QUANTITY) {
            return 'Jumlah terlalu besar (maksimal '.number_format(self::MAX_QUANTITY, 0, ',', '.').')';
        }

        return null;
    }

    private function weekStartRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) {
            $date = CarbonImmutable::parse($value);
            if (! $date->isMonday()) {
                $fail('Tanggal awal minggu harus hari Senin.');
            } elseif ($date->greaterThanOrEqualTo($this->currentMonday())) {
                $fail('Minggu ini belum selesai. Penjualannya dicatat mulai Senin depan.');
            }
        };
    }

    private function currentMonday(): CarbonImmutable
    {
        return CarbonImmutable::today()->startOfWeek(CarbonImmutable::MONDAY);
    }
}
