<?php

namespace App\Models;

use App\Enums\CardStatus;
use App\Enums\CardType;
use App\Enums\RateType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['card_type', 'balance', 'statement_day', 'due_day', 'payment_amount', 'payment_day', 'interest_rate', 'rate_type', 'status', 'termination_target_date', 'termination_note'])]
class CardProfile extends Model
{
    /** The only interest-rate presets the UI is allowed to submit. */
    public const array RATE_PRESETS = [
        ['interest_rate' => 15.0, 'rate_type' => 'annual'],
        ['interest_rate' => 18.0, 'rate_type' => 'annual'],
        ['interest_rate' => 2.0, 'rate_type' => 'monthly'],
    ];

    protected function casts(): array
    {
        return [
            'card_type' => CardType::class,
            'rate_type' => RateType::class,
            'status' => CardStatus::class,
            'balance' => 'decimal:2',
            'payment_amount' => 'decimal:2',
            'interest_rate' => 'decimal:3',
            'statement_day' => 'integer',
            'due_day' => 'integer',
            'payment_day' => 'integer',
            'termination_target_date' => 'date:Y-m-d',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** The annual-equivalent interest rate, converting monthly presets (×12). */
    public function annualPercent(): float
    {
        return $this->rate_type === RateType::Monthly
            ? (float) $this->interest_rate * 12
            : (float) $this->interest_rate;
    }
}
