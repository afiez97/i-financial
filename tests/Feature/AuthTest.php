<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

uses(RefreshDatabase::class);

test('a user can register and is immediately authenticated', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Ahmad Sobri',
        'email' => 'ahmadsobri@uitm.edu.my',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertCreated();
    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', ['email' => 'ahmadsobri@uitm.edu.my']);
});

test('registration fails when passwords do not match', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Ahmad Sobri',
        'email' => 'ahmadsobri@uitm.edu.my',
        'password' => 'password123',
        'password_confirmation' => 'nomatch',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('password');
});

test('a user can login with correct credentials', function () {
    $user = User::factory()->create(['password' => bcrypt('password123')]);

    $response = $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password123',
    ]);

    $response->assertOk();
    $this->assertAuthenticatedAs($user);
});

test('login fails with wrong password', function () {
    $user = User::factory()->create(['password' => bcrypt('password123')]);

    $response = $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertUnprocessable();
    $this->assertGuest();
});

test('logout invalidates the session', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->postJson('/api/logout')->assertNoContent();
    $this->assertGuest('web');
});

test('a user can request a password reset link', function () {
    Notification::fake();
    $user = User::factory()->create();

    $response = $this->postJson('/api/forgot-password', ['email' => $user->email]);

    $response->assertOk();
    Notification::assertSentTo($user, ResetPassword::class);
});

test('requesting a reset link for an unknown email still returns a generic success response', function () {
    Notification::fake();

    $response = $this->postJson('/api/forgot-password', ['email' => 'tiada-akaun@example.com']);

    $response->assertOk();
    Notification::assertNothingSent();
});

test('a user can reset their password with a valid token', function () {
    $user = User::factory()->create(['password' => bcrypt('old-password')]);
    $token = Password::createToken($user);

    $response = $this->postJson('/api/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'new-password123',
        'password_confirmation' => 'new-password123',
    ]);

    $response->assertOk();

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'new-password123',
    ])->assertOk();
    $this->assertAuthenticatedAs($user);
});

test('resetting a password with an invalid token is rejected', function () {
    $user = User::factory()->create();

    $response = $this->postJson('/api/reset-password', [
        'token' => 'bukan-token-sah',
        'email' => $user->email,
        'password' => 'new-password123',
        'password_confirmation' => 'new-password123',
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('email');
});
