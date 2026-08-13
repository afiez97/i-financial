<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('debts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->enum('type', ['ptptn', 'car_loan', 'credit_card', 'other']);
            $table->decimal('balance', 12, 2);
            $table->decimal('interest_rate', 5, 2);
            $table->decimal('minimum_payment', 12, 2)->nullable();
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('debts');
    }
};
