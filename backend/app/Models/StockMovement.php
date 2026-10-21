<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['sale_id', 'type', 'quantity', 'moved_on', 'note'])]
class StockMovement extends Model
{
    public const TYPES = ['awal', 'masuk', 'terjual', 'rusak', 'opname'];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'moved_on' => 'date:Y-m-d',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
