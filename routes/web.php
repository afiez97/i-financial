<?php

use Illuminate\Support\Facades\Route;

// A plain catch-all `{any?}` route would match everything not literally
// prefixed "api"/"sanctum" — including routes other packages (e.g. Laravel
// Passkeys) register at other paths. Route::fallback() is only ever
// dispatched after every other route has failed to match, regardless of
// registration order, so it can't shadow those.
Route::fallback(fn () => response()->file(public_path('index.html')))
    ->name('spa.fallback');
