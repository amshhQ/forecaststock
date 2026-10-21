<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->swap('week_start', 'sale_date');
    }

    public function down(): void
    {
        $this->swap('sale_date', 'week_start');
    }

    private function swap(string $from, string $to): void
    {
        // MySQL butuh indeks di product_id untuk foreign key. Indeks unik lama adalah satu-satunya,
        // jadi indeks sementara dibuat dulu supaya indeks lama boleh dihapus.
        Schema::table('sales', function (Blueprint $table) {
            $table->index('product_id', 'sales_product_id_temp_index');
        });
        Schema::table('sales', function (Blueprint $table) use ($from) {
            $table->dropUnique(['product_id', $from]);
        });
        Schema::table('sales', function (Blueprint $table) use ($from, $to) {
            $table->renameColumn($from, $to);
        });
        Schema::table('sales', function (Blueprint $table) use ($to) {
            $table->unique(['product_id', $to]);
        });
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex('sales_product_id_temp_index');
        });
    }
};
