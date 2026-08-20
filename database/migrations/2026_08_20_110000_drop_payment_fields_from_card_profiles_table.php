<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('card_profiles', function (Blueprint $table) {
            $table->dropColumn(['payment_amount', 'payment_day']);
        });
    }

    public function down(): void
    {
        Schema::table('card_profiles', function (Blueprint $table) {
            $table->decimal('payment_amount', 12, 2)->default(5000.00)->after('due_day');
            $table->unsignedTinyInteger('payment_day')->default(11)->after('payment_amount');
        });
    }
};
