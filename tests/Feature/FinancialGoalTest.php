<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a user can create, list, update and delete financial goals', function () {
    $user = User::factory()->create();

    $create = $this->actingAs($user)->postJson('/api/financial-goals', [
        'name' => 'Deposit Rumah', 'target_amount' => 50000, 'current_amount' => 5000, 'target_date' => '2028-01-01',
    ]);
    $create->assertCreated();
    $id = $create->json('data.id');

    $this->actingAs($user)->getJson('/api/financial-goals')->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($user)->putJson("/api/financial-goals/{$id}", [
        'name' => 'Deposit Rumah', 'target_amount' => 50000, 'current_amount' => 10000, 'target_date' => '2028-01-01',
    ])->assertOk()->assertJsonPath('data.current_amount', '10000.00');

    $this->actingAs($user)->deleteJson("/api/financial-goals/{$id}")->assertNoContent();
    $this->actingAs($user)->getJson('/api/financial-goals')->assertOk()->assertJsonCount(0, 'data');
});

test('a financial goal with a zero target amount is rejected', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/financial-goals', [
        'name' => 'Dana Pelaburan', 'target_amount' => 0, 'current_amount' => 0,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('target_amount');
});

test('a financial goal can be created without a target date', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/financial-goals', [
        'name' => 'Umrah', 'target_amount' => 15000, 'current_amount' => 2000,
    ]);

    $response->assertCreated()->assertJsonPath('data.target_date', null);
});

test('a user cannot see, modify or delete another users financial goals', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $goal = $userA->financialGoals()->create([
        'name' => 'Deposit Rumah', 'target_amount' => 50000, 'current_amount' => 5000,
    ]);

    $this->actingAs($userB)->getJson('/api/financial-goals')->assertOk()->assertJsonCount(0, 'data');

    $this->actingAs($userB)->putJson("/api/financial-goals/{$goal->id}", [
        'name' => 'Hacked', 'target_amount' => 1, 'current_amount' => 1,
    ])->assertNotFound();

    $this->actingAs($userB)->deleteJson("/api/financial-goals/{$goal->id}")->assertNotFound();

    $this->assertDatabaseHas('financial_goals', ['id' => $goal->id, 'name' => 'Deposit Rumah']);
});
