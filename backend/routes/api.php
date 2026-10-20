<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DemoController;
use App\Http\Controllers\Api\ForecastController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\ScenarioController;
use App\Http\Controllers\Api\StoreController;
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

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::get('/business-types', [StoreController::class, 'businessTypes']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/store', [StoreController::class, 'update']);
    Route::post('/demo/reset', [DemoController::class, 'reset'])->middleware('throttle:5,1');

    Route::apiResource('categories', CategoryController::class)->except('show')->parameters(['categories' => 'id']);
    Route::apiResource('products', ProductController::class)->parameters(['products' => 'id']);
    Route::apiResource('scenarios', ScenarioController::class)->except('show')->parameters(['scenarios' => 'id']);

    Route::get('/sales', [SaleController::class, 'index']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::post('/sales/import', [SaleController::class, 'import']);
    Route::delete('/sales/{id}', [SaleController::class, 'destroy']);

    Route::get('/forecasts', [ForecastController::class, 'index']);
    Route::get('/forecasts/{id}', [ForecastController::class, 'show']);
    Route::get('/recommendations', [ForecastController::class, 'recommendations']);
    Route::get('/dashboard', [ForecastController::class, 'dashboard']);
});
