<?php

use Illuminate\Support\Facades\Route;

Route::get('/{any?}', fn () => response()->file(public_path('index.html')))
    ->where('any', '^(?!api|sanctum).*$')
    ->name('spa.fallback');
