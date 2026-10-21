<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Services\StockLedger;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class SaleController extends Controller
{
    public const MAX_QUANTITY = 1000000;

    public function __construct(private StockLedger $ledger) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['nullable', 'integer'],
            'sort' => ['nullable', Rule::in(['sale_date', 'quantity'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $query = Sale::query()
            ->whereIn('product_id', $request->user()->products()->select('id'))
            ->with('product:id,sku,name,unit')
            ->orderBy($request->query('sort', 'sale_date'), $request->query('direction', 'desc'))
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
            'sale_date' => ['required', 'date_format:Y-m-d', $this->notFutureRule()],
            'quantity' => ['required', 'integer', 'min:0', 'max:'.self::MAX_QUANTITY],
        ]);

        $product = $request->user()->products()->findOrFail($data['product_id']);
        $sale = $this->ledger->recordSale($product, $data['sale_date'], $data['quantity']);

        return response()->json($sale->load('product:id,sku,name,unit,current_stock'), 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $sale = Sale::whereIn('product_id', $request->user()->products()->select('id'))->findOrFail($id);
        $this->ledger->deleteSale($sale);

        return response()->json(null, 204);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:1024'],
            'reduce_stock' => ['nullable', 'boolean'],
        ]);
        $reduceStock = $request->boolean('reduce_stock');

        $products = $request->user()->products()->get()->keyBy('sku');
        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $firstLine = (string) fgets($handle);

        // Excel versi Indonesia menyimpan CSV dengan titik koma, jadi pemisahnya ditebak dari baris judul.
        $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';
        // \xEF\xBB\xBF adalah penanda BOM yang sering ikut di awal file dari Excel.
        $header = array_map(
            fn ($h) => strtolower(trim((string) $h, " \t\n\r\0\x0B\xEF\xBB\xBF")),
            str_getcsv($firstLine, $delimiter, escape: '')
        );

        $missing = array_diff(['sku', 'date', 'quantity'], $header);
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
            // Baris yang salah dilewati dan dilaporkan nomornya, baris lain tetap disimpan.
            $error = $this->importRowError($row, $products->keys()->all());
            if ($error) {
                $errors[] = ['line' => $line, 'message' => $error];

                continue;
            }
            try {
                $this->ledger->recordSale($products[trim($row['sku'])], trim($row['date']), (int) trim($row['quantity']), $reduceStock);
                $imported++;
            } catch (ValidationException $e) {
                $errors[] = ['line' => $line, 'message' => rtrim($e->validator->errors()->first(), '.')];
            }
        }
        fclose($handle);

        if ($imported === 0 && $errors === []) {
            return response()->json(['message' => 'File hanya berisi nama kolom, belum ada data.'], 422);
        }

        return response()->json(['imported' => $imported, 'errors' => $errors]);
    }

    /** @param  list<string>  $skus */
    private function importRowError(array $row, array $skus): ?string
    {
        $sku = trim((string) $row['sku']);
        if ($sku === '') {
            return 'SKU kosong';
        }
        if (! in_array($sku, $skus, true)) {
            return "SKU \"$sku\" belum terdaftar di daftar produk";
        }

        $value = trim((string) $row['date']);
        try {
            $date = CarbonImmutable::createFromFormat('!Y-m-d', $value);
        } catch (Throwable) {
            $date = false;
        }
        if (! $date || $date->toDateString() !== $value) {
            return 'Tanggal harus berformat YYYY-MM-DD, misalnya 2026-10-12';
        }
        if ($date->greaterThan(CarbonImmutable::today())) {
            return 'Tanggal belum terjadi';
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

    private function notFutureRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) {
            if (CarbonImmutable::parse($value)->greaterThan(CarbonImmutable::today())) {
                $fail('Tanggal ini belum terjadi, penjualannya belum bisa dicatat.');
            }
        };
    }
}
