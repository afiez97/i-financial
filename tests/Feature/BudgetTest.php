<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a user can create, list, update and delete budgets', function () {
    $user = User::factory()->create();

    $create = $this->actingAs($user)->postJson('/api/budgets', [
        'category' => 'dining', 'monthly_limit' => 300,
    ]);
    $create->assertCreated();
    $id = $create->json('data.id');

    $this->actingAs($user)->getJson('/api/budgets')->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($user)->putJson("/api/budgets/{$id}", [
        'category' => 'dining', 'monthly_limit' => 350,
    ])->assertOk()->assertJsonPath('data.monthly_limit', '350.00');

    $this->actingAs($user)->deleteJson("/api/budgets/{$id}")->assertNoContent();
    $this->actingAs($user)->getJson('/api/budgets')->assertOk()->assertJsonCount(0, 'data');
});

test('an income category is rejected for a budget', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/budgets', [
        'category' => 'salary', 'monthly_limit' => 300,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('category');
});

test('a duplicate budget category for the same user is rejected', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/budgets', [
        'category' => 'petrol', 'monthly_limit' => 200,
    ])->assertCreated();

    $response = $this->actingAs($user)->postJson('/api/budgets', [
        'category' => 'petrol', 'monthly_limit' => 250,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('category');
});
