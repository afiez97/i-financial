<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_flow_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('month');
            $table->unsignedSmallInteger('year');
            $table->enum('type', ['income', 'expense']);
            $table->enum('category', [
                'salary', 'side_hustle', 'other_income',
                'rent', 'bills', 'groceries', 'petrol', 'insurance', 'dining', 'grab', 'other_expense',
            ]);
            $table->string('label')->nullable();
            $table->decimal('amount', 12, 2);
            $table->timestamps();

            $table->index(['user_id', 'year', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_flow_entries');
    }
};
