<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a user can create, list, update and delete cash flow entries', function () {
    $user = User::factory()->create();

    $create = $this->actingAs($user)->postJson('/api/cash-flow-entries', [
        'month' => 8, 'year' => 2026, 'type' => 'expense', 'category' => 'petrol', 'label' => null, 'amount' => 150,
    ]);
    $create->assertCreated();
    $id = $create->json('data.id');

    $this->actingAs($user)->getJson('/api/cash-flow-entries?month=8&year=2026')
        ->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($user)->putJson("/api/cash-flow-entries/{$id}", [
        'month' => 8, 'year' => 2026, 'type' => 'expense', 'category' => 'petrol', 'label' => 'Diubah', 'amount' => 200,
    ])->assertOk()->assertJsonPath('data.label', 'Diubah');

    $this->actingAs($user)->deleteJson("/api/cash-flow-entries/{$id}")->assertNoContent();

    $this->actingAs($user)->getJson('/api/cash-flow-entries?month=8&year=2026')
        ->assertOk()->assertJsonCount(0, 'data');
});

test('an income entry with an expense-only category is rejected', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/cash-flow-entries', [
        'month' => 8, 'year' => 2026, 'type' => 'income', 'category' => 'petrol', 'amount' => 100,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('category');
});

test('unfiltered index returns entries across all periods', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/cash-flow-entries', [
        'month' => 1, 'year' => 2026, 'type' => 'income', 'category' => 'salary', 'amount' => 4500,
    ]);
    $this->actingAs($user)->postJson('/api/cash-flow-entries', [
        'month' => 2, 'year' => 2026, 'type' => 'income', 'category' => 'salary', 'amount' => 4500,
    ]);

    $this->actingAs($user)->getJson('/api/cash-flow-entries')
        ->assertOk()->assertJsonCount(2, 'data');
});
