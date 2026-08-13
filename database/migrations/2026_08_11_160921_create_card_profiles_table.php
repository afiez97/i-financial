<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->enum('card_type', ['classic', 'platinum'])->default('classic');
            $table->decimal('balance', 12, 2)->default(5500.00);
            $table->unsignedTinyInteger('statement_day')->default(17);
            $table->unsignedTinyInteger('due_day')->default(6);
            $table->decimal('payment_amount', 12, 2)->default(5000.00);
            $table->unsignedTinyInteger('payment_day')->default(11);
            $table->decimal('interest_rate', 5, 3)->default(15.000);
            $table->enum('rate_type', ['annual', 'monthly'])->default('annual');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_profiles');
    }
};
