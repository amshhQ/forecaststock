<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockLedger
{
    public function recordSale(Product $product, string $date, int $quantity, bool $reduceStock = true): Sale
    {
        return DB::transaction(function () use ($product, $date, $quantity, $reduceStock) {
            // Baris produk dikunci supaya dua penyimpanan bersamaan tidak membaca stok yang sama.
            $product = Product::lockForUpdate()->findOrFail($product->id);
            $sale = $product->sales()->whereDate('sale_date', $date)->first();
            $movement = $sale?->movement;
            // Impor riwayat lama boleh tidak mengurangi stok, tapi catatan yang dulu sudah
            // mengurangi stok tetap harus disesuaikan saat jumlahnya diganti.
            $affectsStock = $reduceStock || $movement !== null;
            // Riwayat lama bernilai minus, jadi delta adalah selisih antara jumlah baru dan jumlah lama.
            $delta = $quantity + ($movement?->quantity ?? 0);

            if ($affectsStock && $product->current_stock < $delta) {
                throw ValidationException::withMessages([
                    'quantity' => "Stok tercatat hanya {$product->current_stock} {$product->unit}. Catat barang masuk atau stok opname dulu.",
                ]);
            }

            if ($sale) {
                $sale->update(['quantity' => $quantity]);
            } else {
                $sale = $product->sales()->create(['sale_date' => $date, 'quantity' => $quantity]);
            }

            if ($affectsStock) {
                $product->update(['current_stock' => $product->current_stock - $delta]);
                $product->movements()->updateOrCreate(
                    ['sale_id' => $sale->id],
                    ['type' => 'terjual', 'quantity' => -$quantity, 'moved_on' => $date],
                );
            }

            return $sale;
        });
    }

    public function deleteSale(Sale $sale): void
    {
        DB::transaction(function () use ($sale) {
            $movement = $sale->movement;
            if ($movement) {
                $product = Product::lockForUpdate()->findOrFail($sale->product_id);
                $product->update(['current_stock' => $product->current_stock - $movement->quantity]);
            }
            $sale->delete();
        });
    }

    public function move(Product $product, string $type, int $quantity, string $date, ?string $note = null): StockMovement
    {
        return DB::transaction(function () use ($product, $type, $quantity, $date, $note) {
            $product = Product::lockForUpdate()->findOrFail($product->id);
            // Opname disimpan sebagai selisih, bukan hasil hitungnya, supaya riwayat tetap bisa dijumlah.
            $change = match ($type) {
                'opname' => $quantity - $product->current_stock,
                'rusak' => -$quantity,
                default => $quantity,
            };

            if ($product->current_stock + $change < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Stok tercatat hanya {$product->current_stock} {$product->unit}.",
                ]);
            }

            $product->update(['current_stock' => $product->current_stock + $change]);

            return $product->movements()->create(['type' => $type, 'quantity' => $change, 'moved_on' => $date, 'note' => $note]);
        });
    }
}
