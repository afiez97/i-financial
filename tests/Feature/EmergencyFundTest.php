<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a fresh user gets default emergency fund values', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/emergency-fund')
        ->assertOk()->assertJson(['data' => ['target_months' => 6, 'current_savings' => '0.00']]);
});

test('a user can update target months and current savings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->putJson('/api/emergency-fund', [
        'target_months' => 3, 'current_savings' => 8000,
    ])->assertOk()->assertJsonPath('data.target_months', 3);
});

test('a target_months value other than 3 or 6 is rejected', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->putJson('/api/emergency-fund', [
        'target_months' => 4, 'current_savings' => 8000,
    ])->assertUnprocessable()->assertJsonValidationErrors('target_months');
});
