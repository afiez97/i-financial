<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('card_profiles', function (Blueprint $table) {
            $table->enum('status', ['active', 'planned_termination', 'terminated'])
                ->default('active')
                ->after('rate_type');
            $table->date('termination_target_date')->nullable()->after('status');
            $table->text('termination_note')->nullable()->after('termination_target_date');
        });
    }

    public function down(): void
    {
        Schema::table('card_profiles', function (Blueprint $table) {
            $table->dropColumn(['status', 'termination_target_date', 'termination_note']);
        });
    }
};
