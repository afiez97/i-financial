<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'mohdafiez7@gmail.com'],
            ['name' => 'Afiez', 'password' => Hash::make('password')]
        );

        $user->cardProfile()->firstOrCreate([], [
            'card_type' => 'classic',
            'balance' => 5500.00,
            'statement_day' => 17,
            'due_day' => 6,
            'payment_amount' => 5000.00,
            'payment_day' => 11,
            'interest_rate' => 15.000,
            'rate_type' => 'annual',
        ]);

        $user->emergencyFund()->firstOrCreate([], [
            'target_months' => 6,
            'current_savings' => 0,
        ]);
    }
}
