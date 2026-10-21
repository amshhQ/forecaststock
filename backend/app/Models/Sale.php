<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['product_id', 'sale_date', 'quantity'])]
class Sale extends Model
{
    protected function casts(): array
    {
        return [
            'sale_date' => 'date:Y-m-d',
            'quantity' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function movement(): HasOne
    {
        return $this->hasOne(StockMovement::class);
    }
}
