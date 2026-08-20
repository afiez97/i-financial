<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a fresh user gets the spec default card profile without a prior PUT', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/card-profile');

    $response->assertOk()->assertJson([
        'data' => [
            'card_type' => 'classic',
            'balance' => '5500.00',
            'statement_day' => 17,
            'due_day' => 6,
        ],
    ]);
});

test('a user can update their card profile with a valid rate preset', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->putJson('/api/card-profile', [
        'card_type' => 'platinum',
        'balance' => 5500,
        'statement_day' => 17,
        'due_day' => 6,
        'interest_rate' => 2.0,
        'rate_type' => 'monthly',
        'status' => 'active',
    ]);

    $response->assertOk()->assertJsonPath('data.card_type', 'platinum');
    $this->assertDatabaseHas('card_profiles', ['user_id' => $user->id, 'card_type' => 'platinum']);
});

test('an interest rate outside the 3 presets is rejected', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->putJson('/api/card-profile', [
        'card_type' => 'classic',
        'balance' => 5500,
        'statement_day' => 17,
        'due_day' => 6,
        'interest_rate' => 99,
        'rate_type' => 'annual',
        'status' => 'active',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('interest_rate');
});

test('a day-of-month field outside 1-31 is rejected', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->putJson('/api/card-profile', [
        'card_type' => 'classic',
        'balance' => 5500,
        'statement_day' => 35,
        'due_day' => 6,
        'interest_rate' => 15,
        'rate_type' => 'annual',
        'status' => 'active',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('statement_day');
});

test('a user can set a planned termination with a target date', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->putJson('/api/card-profile', [
        'card_type' => 'classic',
        'balance' => 5500,
        'statement_day' => 17,
        'due_day' => 6,
        'interest_rate' => 15,
        'rate_type' => 'annual',
        'status' => 'planned_termination',
        'termination_target_date' => '2026-12-31',
        'termination_note' => 'Nak tukar ke kad lain.',
    ]);

    $response->assertOk()->assertJsonPath('data.status', 'planned_termination');
    $this->assertDatabaseHas('card_profiles', [
        'user_id' => $user->id,
        'status' => 'planned_termination',
        'termination_target_date' => '2026-12-31',
    ]);
});

test('termination target date is required unless status is active', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->putJson('/api/card-profile', [
        'card_type' => 'classic',
        'balance' => 5500,
        'statement_day' => 17,
        'due_day' => 6,
        'interest_rate' => 15,
        'rate_type' => 'annual',
        'status' => 'planned_termination',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('termination_target_date');
});
