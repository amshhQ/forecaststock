<?php

use Illuminate\Support\Facades\Route;

Route::get('/{any?}', function () {
    $spa = public_path('index.html');

    return is_file($spa) ? response(file_get_contents($spa))->header('Content-Type', 'text/html') : view('welcome');
})->where('any', '^(?!api/).*$');
