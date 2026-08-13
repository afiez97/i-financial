<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_flow_entries', function (Blueprint $table) {
            $table->foreignId('recurring_transaction_id')->nullable()->after('id')
                ->constrained('recurring_transactions')->nullOnDelete();
            $table->index('recurring_transaction_id');
        });
    }

    public function down(): void
    {
        Schema::table('cash_flow_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recurring_transaction_id');
        });
    }
};
