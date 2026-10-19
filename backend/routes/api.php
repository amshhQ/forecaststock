<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        $database = 'terhubung';
    } catch (Throwable) {
        $database = 'tidak terhubung';
    }

    return response()->json([
        'app' => config('app.name'),
        'database' => $database,
    ]);
});
