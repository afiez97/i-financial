<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a user cannot see, modify or delete another users debts and cash flow entries', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $debt = $userA->debts()->create([
        'name' => 'PTPTN', 'type' => 'ptptn', 'balance' => 12000, 'interest_rate' => 1, 'minimum_payment' => 150,
    ]);
    $entry = $userA->cashFlowEntries()->create([
        'month' => 8, 'year' => 2026, 'type' => 'expense', 'category' => 'petrol', 'amount' => 150,
    ]);

    $this->actingAs($userB)->getJson('/api/debts')->assertOk()->assertJsonCount(0, 'data');
    $this->actingAs($userB)->getJson('/api/cash-flow-entries')->assertOk()->assertJsonCount(0, 'data');

    $this->actingAs($userB)->putJson("/api/debts/{$debt->id}", [
        'name' => 'Hacked', 'type' => 'other', 'balance' => 1, 'interest_rate' => 1,
    ])->assertNotFound();

    $this->actingAs($userB)->deleteJson("/api/cash-flow-entries/{$entry->id}")->assertNotFound();

    $this->assertDatabaseHas('debts', ['id' => $debt->id, 'name' => $debt->name]);
    $this->assertDatabaseHas('cash_flow_entries', ['id' => $entry->id]);
});

test('a users card profile and emergency fund are private to them', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $this->actingAs($userA)->putJson('/api/card-profile', [
        'card_type' => 'platinum', 'balance' => 9999, 'statement_day' => 17, 'due_day' => 6,
        'interest_rate' => 15, 'rate_type' => 'annual', 'status' => 'active',
    ])->assertOk();

    $this->actingAs($userB)->getJson('/api/card-profile')
        ->assertOk()->assertJsonPath('data.card_type', 'classic')
        ->assertJsonPath('data.balance', '5500.00');
});
