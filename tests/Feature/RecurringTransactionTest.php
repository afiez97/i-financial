<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

afterEach(function () {
    Carbon::setTestNow();
});

test('creating a cash flow entry with is_recurring makes both a template and a linked entry', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/cash-flow-entries', [
        'month' => 8, 'year' => 2026, 'type' => 'income', 'category' => 'salary', 'label' => 'Gaji', 'amount' => 5200,
        'is_recurring' => true,
    ]);

    $response->assertCreated();
    $response->assertJsonPath('data.amount', '5200.00');
    expect($response->json('data.recurring_transaction'))->not->toBeNull();

    expect($user->recurringTransactions()->count())->toBe(1);
    expect($user->cashFlowEntries()->count())->toBe(1);
});

test('opening the app in a later month materializes the missing recurring entry, idempotently', function () {
    $user = User::factory()->create();

    Carbon::setTestNow('2026-08-15');
    $this->actingAs($user)->postJson('/api/cash-flow-entries', [
        'month' => 8, 'year' => 2026, 'type' => 'income', 'category' => 'salary', 'label' => 'Gaji', 'amount' => 5200,
        'is_recurring' => true,
    ])->assertCreated();

    Carbon::setTestNow('2026-09-05');
    $this->actingAs($user)->getJson('/api/cash-flow-entries')->assertOk()->assertJsonCount(2, 'data');

    // calling index again the same month must not create a duplicate
    $this->actingAs($user)->getJson('/api/cash-flow-entries')->assertOk()->assertJsonCount(2, 'data');

    $septemberEntry = $user->cashFlowEntries()->where('month', 9)->where('year', 2026)->first();
    expect((float) $septemberEntry->amount)->toBe(5200.0);
    expect($septemberEntry->category->value)->toBe('salary');
});

test('editing the recurring template does not change a previously generated entry', function () {
    $user = User::factory()->create();

    Carbon::setTestNow('2026-08-15');
    $create = $this->actingAs($user)->postJson('/api/cash-flow-entries', [
        'month' => 8, 'year' => 2026, 'type' => 'income', 'category' => 'salary', 'label' => 'Gaji', 'amount' => 5200,
        'is_recurring' => true,
    ]);
    $templateId = $create->json('data.recurring_transaction.id');

    $this->actingAs($user)->putJson("/api/recurring-transactions/{$templateId}", [
        'type' => 'income', 'category' => 'salary', 'label' => 'Gaji', 'amount' => 6000,
    ])->assertOk();

    Carbon::setTestNow('2026-09-05');
    $this->actingAs($user)->getJson('/api/cash-flow-entries')->assertOk();

    $augustEntry = $user->cashFlowEntries()->where('month', 8)->first();
    $septemberEntry = $user->cashFlowEntries()->where('month', 9)->first();

    expect((float) $augustEntry->amount)->toBe(5200.0);
    expect((float) $septemberEntry->amount)->toBe(6000.0);
});

test('deactivating a recurring template stops further generation', function () {
    $user = User::factory()->create();

    Carbon::setTestNow('2026-08-15');
    $create = $this->actingAs($user)->postJson('/api/cash-flow-entries', [
        'month' => 8, 'year' => 2026, 'type' => 'expense', 'category' => 'rent', 'amount' => 1200,
        'is_recurring' => true,
    ]);
    $templateId = $create->json('data.recurring_transaction.id');

    $this->actingAs($user)->putJson("/api/recurring-transactions/{$templateId}", [
        'type' => 'expense', 'category' => 'rent', 'amount' => 1200, 'is_active' => false,
    ])->assertOk();

    Carbon::setTestNow('2026-10-01');
    $this->actingAs($user)->getJson('/api/cash-flow-entries')->assertOk()->assertJsonCount(1, 'data');
});

test('a user cannot modify another users recurring transaction', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    Carbon::setTestNow('2026-08-15');
    $create = $this->actingAs($userA)->postJson('/api/cash-flow-entries', [
        'month' => 8, 'year' => 2026, 'type' => 'income', 'category' => 'salary', 'amount' => 5200,
        'is_recurring' => true,
    ]);
    $templateId = $create->json('data.recurring_transaction.id');

    $this->actingAs($userB)->putJson("/api/recurring-transactions/{$templateId}", [
        'type' => 'income', 'category' => 'salary', 'amount' => 1,
    ])->assertNotFound();

    $this->actingAs($userB)->getJson('/api/recurring-transactions')->assertOk()->assertJsonCount(0, 'data');
});
