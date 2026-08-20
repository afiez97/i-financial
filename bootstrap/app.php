<?php

use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // The frontend is always served same-origin from this same app (no
        // separate SPA domain, no mobile/3rd-party API consumer), so session
        // + CSRF middleware is applied unconditionally to every /api/* request
        // instead of Sanctum's statefulApi() Referer/Origin sniffing — that
        // heuristic is fragile across proxies/domains and unnecessary here.
        $middleware->api(prepend: [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            VerifyCsrfToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Laravel Passkeys' routes live outside /api/* (they need the "web"
        // middleware group's session handling), but the frontend still talks
        // to them over fetch/JSON just like the rest of the API — without
        // this they'd render an HTML redirect-to-login on auth failure
        // instead of a JSON 401.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*')
                || $request->is('passkeys/*')
                || $request->is('user/passkeys*'),
        );
    })->create();
