<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->nullable()->unique()->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->integer('quantity');
            $table->date('moved_on');
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->index(['product_id', 'moved_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
