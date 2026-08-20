<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createCardProfileForStatementTest(User $user): void
{
    $user->cardProfile()->create([
        'card_type' => 'classic',
        'balance' => 5500,
        'statement_day' => 17,
        'due_day' => 6,
        'payment_amount' => 5000,
        'payment_day' => 11,
        'interest_rate' => 15,
        'rate_type' => 'annual',
    ]);
}

test('a user can create, list, update and delete card statements', function () {
    $user = User::factory()->create();
    createCardProfileForStatementTest($user);

    $create = $this->actingAs($user)->postJson('/api/card-statements', [
        'month' => 8,
        'year' => 2026,
        'balance' => 5500,
        'payment_amount' => 5000,
        'payment_date' => '2026-09-01',
        'payer_name' => 'Afiez',
        'note' => 'Bayaran biasa',
    ]);
    $create->assertCreated()->assertJsonStructure([
        'data' => ['id', 'balance', 'payment_amount', 'estimated_retail_interest', 'estimated_late_payment_interest'],
    ]);
    $id = $create->json('data.id');

    $this->actingAs($user)->getJson('/api/card-statements')->assertOk()->assertJsonCount(1, 'data');

    $update = $this->actingAs($user)->putJson("/api/card-statements/{$id}", [
        'month' => 8,
        'year' => 2026,
        'balance' => 5500,
        'payment_amount' => 5500,
        'payment_date' => '2026-09-01',
        'payer_name' => 'Afiez',
        'note' => 'Settle penuh',
        'actual_retail_interest' => 12.34,
    ]);
    $update->assertOk()
        ->assertJsonPath('data.payment_amount', '5500.00')
        ->assertJsonPath('data.actual_retail_interest', '12.34');

    $this->actingAs($user)->deleteJson("/api/card-statements/{$id}")->assertNoContent();
    $this->actingAs($user)->getJson('/api/card-statements')->assertOk()->assertJsonCount(0, 'data');
});

test('a late payment triggers the 1% late-payment interest estimate', function () {
    $user = User::factory()->create();
    createCardProfileForStatementTest($user);

    // Cycle for month=8/year=2026: statement 2026-08-17, due 2026-09-06.
    $response = $this->actingAs($user)->postJson('/api/card-statements', [
        'month' => 8,
        'year' => 2026,
        'balance' => 5500,
        'payment_amount' => 5500,
        'payment_date' => '2026-09-10',
    ]);

    $response->assertCreated()->assertJsonPath('data.estimated_late_payment_interest', 55);
});

test('an on-time payment has no late-payment interest estimate', function () {
    $user = User::factory()->create();
    createCardProfileForStatementTest($user);

    $response = $this->actingAs($user)->postJson('/api/card-statements', [
        'month' => 8,
        'year' => 2026,
        'balance' => 5500,
        'payment_amount' => 5500,
        'payment_date' => '2026-09-01',
    ]);

    $response->assertCreated()->assertJsonPath('data.estimated_late_payment_interest', 0);
});

test('a negative card statement balance is rejected', function () {
    $user = User::factory()->create();
    createCardProfileForStatementTest($user);

    $response = $this->actingAs($user)->postJson('/api/card-statements', [
        'month' => 8,
        'year' => 2026,
        'balance' => -100,
        'payment_amount' => 0,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('balance');
});

test('a duplicate month/year card statement for the same user is rejected', function () {
    $user = User::factory()->create();
    createCardProfileForStatementTest($user);

    $this->actingAs($user)->postJson('/api/card-statements', [
        'month' => 8,
        'year' => 2026,
        'balance' => 5500,
        'payment_amount' => 5000,
    ])->assertCreated();

    $response = $this->actingAs($user)->postJson('/api/card-statements', [
        'month' => 8,
        'year' => 2026,
        'balance' => 4000,
        'payment_amount' => 4000,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('month');
});
