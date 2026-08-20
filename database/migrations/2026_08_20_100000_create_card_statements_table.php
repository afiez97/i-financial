<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_statements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('month');
            $table->unsignedSmallInteger('year');
            $table->decimal('balance', 12, 2);
            $table->decimal('payment_amount', 12, 2)->default(0);
            $table->date('payment_date')->nullable();
            $table->string('payer_name')->nullable();
            $table->text('note')->nullable();
            $table->decimal('actual_retail_interest', 12, 2)->nullable();
            $table->decimal('actual_late_payment_interest', 12, 2)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'year', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_statements');
    }
};
