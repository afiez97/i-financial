<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a user can create, list, update and delete assets', function () {
    $user = User::factory()->create();

    $create = $this->actingAs($user)->postJson('/api/assets', [
        'name' => 'Simpanan Maybank', 'category' => 'savings', 'current_value' => 5000, 'note' => 'akaun kecemasan',
    ]);
    $create->assertCreated();
    $id = $create->json('data.id');

    $this->actingAs($user)->getJson('/api/assets')->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($user)->putJson("/api/assets/{$id}", [
        'name' => 'Simpanan Maybank', 'category' => 'savings', 'current_value' => 5500,
    ])->assertOk()->assertJsonPath('data.current_value', '5500.00');

    $this->actingAs($user)->deleteJson("/api/assets/{$id}")->assertNoContent();
    $this->actingAs($user)->getJson('/api/assets')->assertOk()->assertJsonCount(0, 'data');
});

test('a negative asset value is rejected', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/assets', [
        'name' => 'Simpanan', 'category' => 'savings', 'current_value' => -100,
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('current_value');
});

test('a user cannot see or modify another users assets', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $asset = $userA->assets()->create([
        'name' => 'ASB', 'category' => 'asb', 'current_value' => 10000,
    ]);

    $this->actingAs($userB)->getJson('/api/assets')->assertOk()->assertJsonCount(0, 'data');

    $this->actingAs($userB)->putJson("/api/assets/{$asset->id}", [
        'name' => 'Hacked', 'category' => 'other', 'current_value' => 1,
    ])->assertNotFound();

    $this->assertDatabaseHas('assets', ['id' => $asset->id, 'name' => $asset->name]);
});
