<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a user can create, list, update and delete debts', function () {
    $user = User::factory()->create();

    $create = $this->actingAs($user)->postJson('/api/debts', [
        'name' => 'PTPTN', 'type' => 'ptptn', 'balance' => 12000, 'interest_rate' => 1, 'minimum_payment' => 150,
    ]);
    $create->assertCreated();
    $id = $create->json('data.id');

    $this->actingAs($user)->getJson('/api/debts')->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($user)->putJson("/api/debts/{$id}", [
        'name' => 'PTPTN', 'type' => 'ptptn', 'balance' => 11000, 'interest_rate' => 1, 'minimum_payment' => 150,
    ])->assertOk()->assertJsonPath('data.balance', '11000.00');

    $this->actingAs($user)->deleteJson("/api/debts/{$id}")->assertNoContent();
    $this->actingAs($user)->getJson('/api/debts')->assertOk()->assertJsonCount(0, 'data');
});

test('a negative debt balance is rejected', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/debts', [
        'name' => 'PTPTN', 'type' => 'ptptn', 'balance' => -100, 'interest_rate' => 1,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('balance');
});
