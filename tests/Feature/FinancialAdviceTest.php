<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('returns a friendly error when GEMINI_API_KEY is not configured', function () {
    config(['services.gemini.api_key' => null]);
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/financial-advice');

    $response->assertStatus(503);
});

test('a user can get AI-generated financial advice from Gemini', function () {
    config(['services.gemini.api_key' => 'fake-key', 'services.gemini.model' => 'gemini-2.5-flash']);
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [
                ['content' => ['parts' => [['text' => '- Bayar hutang kad UOB ONE dahulu.']]]],
            ],
        ], 200),
    ]);

    $user = User::factory()->create();
    $user->cardProfile()->create([
        'card_type' => 'classic', 'balance' => 5500, 'statement_day' => 17, 'due_day' => 6,
        'payment_amount' => 5000, 'payment_day' => 11, 'interest_rate' => 15, 'rate_type' => 'annual', 'status' => 'active',
    ]);

    $response = $this->actingAs($user)->postJson('/api/financial-advice');

    $response->assertOk()->assertJsonPath('data.advice', '- Bayar hutang kad UOB ONE dahulu.');

    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'generativelanguage.googleapis.com')
            && str_contains($request->url(), 'gemini-2.5-flash')
            && $request->hasHeader('x-goog-api-key', 'fake-key')
            && str_contains($request['contents'][0]['parts'][0]['text'], 'kad_uob_one');
    });
});

test('a friendly error is returned when Gemini fails', function () {
    config(['services.gemini.api_key' => 'fake-key']);
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response(['error' => 'boom'], 500),
    ]);

    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/financial-advice');

    $response->assertStatus(502);
});
