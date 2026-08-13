<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // The frontend always calls the API same-origin, sending a Referer header
        // that Sanctum's EnsureFrontendRequestsAreStateful checks against the
        // configured stateful domains to decide whether to start a session. The
        // test client doesn't send one by default, so simulate it here.
        $this->withHeader('Referer', config('app.url'));
    }
}
